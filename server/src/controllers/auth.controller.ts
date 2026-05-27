import type { Request, Response } from "express";
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  GOOGLE_AUTH_SCOPES,
  upsertUserAndGoogleIntegration,
  createUserSession,
} from "../services/auth.service.js";
import { listIntegrations } from "../db/queries/integrations.queries.js";
import { env } from "../config/env.js";

/**
 * Initiates the Google OAuth flow by redirecting to Google's consent screen.
 */
export async function googleAuthRedirect(
  _req: Request,
  res: Response,
): Promise<void> {
  const url = getGoogleAuthUrl({ scopes: GOOGLE_AUTH_SCOPES });
  res.redirect(url);
}

/**
 * Handles the OAuth callback from Google.
 * 1. Exchanges auth code for tokens
 * 2. Extracts user profile from id_token
 * 3. Upserts user in DB
 * 4. Stores encrypted Google tokens as an integration
 * 5. Creates a session
 * 6. Redirects to the frontend dashboard
 */
export async function googleAuthCallback(
  req: Request,
  res: Response,
): Promise<void> {
  const code = req.query.code as string;

  if (!code) {
    res.redirect(`${env.frontendUrl}?error=no_code`);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const user = await upsertUserAndGoogleIntegration(tokens);
    await createUserSession(req, user);
    res.redirect(`${env.frontendUrl}/dashboard`);
  } catch (err) {
    console.error("[Auth] Google callback error:", err);
    res.redirect(`${env.frontendUrl}?error=auth_failed`);
  }
}

/**
 * Returns the current user's profile and connected integrations.
 * Used by the frontend to check auth state on page load.
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const integrations = await listIntegrations(user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
    },
    integrations: integrations.map((i) => ({
      provider: i.provider,
      connected: true,
      connectedAt: i.created_at,
    })),
  });
}

/**
 * Destroys the session and clears the cookie.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  req.session.destroy((err) => {
    if (err) {
      console.error("[Auth] Logout error:", err);
      res.status(500).json({ error: "Failed to logout" });
      return;
    }
    // Clear the session cookie with the same options used in session.ts
    // so the browser reliably removes it across all deployment environments
    res.clearCookie("focusflow.sid", {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "lax",
      path: "/",
    });
    res.json({ success: true });
  });
}
