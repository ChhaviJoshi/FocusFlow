import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';

/**
 * Google OAuth 2.0 service — handles the authorization flow manually
 * (no Passport.js) using google-auth-library.
 *
 * The same OAuth tokens obtained here are reused for Gmail + Calendar API calls,
 * so the user never needs to configure Google integration separately.
 */

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

// Singleton OAuth2 client — reused across requests
const oauth2Client = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret,
  env.googleCallbackUrl
);

/**
 * Generate the Google consent screen URL.
 * access_type=offline ensures we get a refresh_token on first consent.
 * prompt=consent forces the consent screen even if user previously granted —
 * this guarantees we always get a refresh_token.
 */
export function getGoogleAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    include_granted_scopes: true,
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
    throw new Error('Failed to decode Google id_token');
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
    throw new Error('Failed to refresh Google access token');
  }

  return {
    accessToken: credentials.access_token,
    expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
  };
}
