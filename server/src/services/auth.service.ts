import { OAuth2Client } from "google-auth-library";
import type { Credentials } from "google-auth-library";
import type { Request } from "express";
import { env } from "../config/env.js";
import { pool } from "../config/database.js";
import type { DbUser } from "../types/index.js";
import { encrypt } from "./crypto.service.js";

/**
 * Google OAuth 2.0 service — handles the authorization flow manually
 * (no Passport.js) using google-auth-library.
 *
 * The same OAuth tokens obtained here are reused for Gmail + Calendar API calls,
 * so the user never needs to configure Google integration separately.
 */

export const GOOGLE_IDENTITY_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export const GOOGLE_DATA_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export const GOOGLE_AUTH_SCOPES = [
  ...GOOGLE_IDENTITY_SCOPES,
  ...GOOGLE_DATA_SCOPES,
];

// Singleton OAuth2 client — reused across requests
const oauth2Client = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret,
  env.googleCallbackUrl,
);

/**
 * Generate the Google consent screen URL.
 * access_type=offline ensures we get a refresh_token on first consent.
 * prompt=consent forces the consent screen even if user previously granted —
 * this guarantees we always get a refresh_token.
 */
export function getGoogleAuthUrl(options?: {
  scopes?: string[];
  state?: string;
}): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: options?.scopes || GOOGLE_AUTH_SCOPES,
    prompt: "consent",
    include_granted_scopes: true,
    state: options?.state,
  });
}

/**
 * Exchange the authorization code for tokens.
 * Returns the raw token response from Google.
 */
export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Decode the id_token to extract user profile information.
 * The id_token is a JWT signed by Google — we verify it before trusting it.
 */
export async function getGoogleUserProfile(idToken: string) {
  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Failed to decode Google id_token");
  }

  return {
    email: payload.email!,
    name: payload.name || payload.email!,
    avatarUrl: payload.picture || null,
  };
}

/**
 * Refresh an expired access token using the stored refresh token.
 * Returns the new access token and its expiry.
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh Google access token");
  }

  return {
    accessToken: credentials.access_token,
    expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
  };
}

/**
 * Upserts Google-authenticated user and Google integration in one DB transaction.
 */
export async function upsertUserAndGoogleIntegration(
  tokens: Credentials,
): Promise<DbUser> {
  if (!tokens.id_token || !tokens.access_token) {
    throw new Error("Missing required Google tokens");
  }

  const profile = await getGoogleUserProfile(tokens.id_token);
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
  const encryptedAccessToken = encrypt(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token
    ? encrypt(tokens.refresh_token)
    : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query<DbUser>(
      `INSERT INTO users (email, name, avatar_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET name = $2, avatar_url = $3, updated_at = NOW()
       RETURNING *`,
      [profile.email, profile.name, profile.avatarUrl],
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO integrations (user_id, provider, access_token, refresh_token, metadata, expires_at)
       VALUES ($1, 'google', $2, $3, $4, $5)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, integrations.refresh_token),
         metadata = EXCLUDED.metadata,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [
        user.id,
        encryptedAccessToken,
        encryptedRefreshToken,
        JSON.stringify({ scopes: "gmail.readonly,calendar.readonly" }),
        expiresAt,
      ],
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Creates and persists the authenticated user session.
 */
export async function createUserSession(
  req: Request,
  user: DbUser,
): Promise<void> {
  req.session.userId = user.id;
  req.session.email = user.email;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
