import type { Request, Response } from "express";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import {
  upsertIntegration,
  listIntegrations,
  deleteIntegration,
} from "../db/queries/integrations.queries.js";
import { env } from "../config/env.js";

type OAuthProvider = "slack" | "jira";

interface OAuthStatePayload {
  userId: string;
  nonce: string;
  provider: OAuthProvider;
}

function signOAuthStateToken(userId: string, provider: OAuthProvider): string {
  return jwt.sign(
    {
      userId,
      nonce: randomBytes(16).toString("hex"),
      provider,
    } satisfies OAuthStatePayload,
    env.sessionSecret,
    { expiresIn: "10m" },
  );
}

function verifyOAuthStateToken(
  stateToken: string,
  provider: OAuthProvider,
): string | null {
  try {
    const decoded = jwt.verify(
      stateToken,
      env.sessionSecret,
    ) as Partial<OAuthStatePayload>;
    if (
      decoded &&
      typeof decoded.userId === "string" &&
      decoded.provider === provider
    ) {
      return decoded.userId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * List all connected integrations for the current user (no tokens exposed).
 */
export async function getIntegrations(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id;
  const integrations = await listIntegrations(userId);

  res.json({
    integrations: integrations.map((i) => ({
      provider: i.provider,
      connected: true,
      metadata: i.metadata,
      connectedAt: i.created_at,
    })),
  });
}

/**
 * Disconnect an integration by deleting it.
 */
export async function removeIntegration(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id;
  const { provider } = req.params;

  // Don't allow deleting the google integration (it's tied to auth)
  if (provider === "google") {
    res.status(400).json({
      error:
        "Cannot disconnect Google — it is your login provider. Log out instead.",
    });
    return;
  }

  const deleted = await deleteIntegration(userId, provider);

  if (!deleted) {
    res.status(404).json({ error: `Integration "${provider}" not found` });
    return;
  }

  res.json({ success: true, provider });
}

/**
 * Start Slack OAuth flow.
 * Returns a provider auth URL containing a signed stateless CSRF state token.
 */
export async function slackOAuthStart(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id as string;
  const state = signOAuthStateToken(userId, "slack");

  const authUrl = new URL("https://slack.com/oauth/v2/authorize");
  authUrl.searchParams.set("client_id", env.slackClientId);
  authUrl.searchParams.set(
    "scope",
    ["channels:history", "groups:history", "channels:read", "users:read"].join(
      ",",
    ),
  );
  authUrl.searchParams.set("redirect_uri", env.slackRedirectUri);
  authUrl.searchParams.set("state", state);

  res.json({ authUrl: authUrl.toString() });
}

/**
 * Slack OAuth callback.
 * Validates CSRF state, exchanges code for token, stores encrypted integration.
 */
export async function slackOAuthCallback(
  req: Request,
  res: Response,
): Promise<void> {
  if (typeof req.query.error === "string") {
    res.redirect(`${env.frontendUrl}/dashboard?error=slack_denied`);
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const stateToken =
    typeof req.query.state === "string" ? req.query.state : undefined;

  if (!code || !stateToken) {
    res.redirect(`${env.frontendUrl}/dashboard?error=slack_oauth_failed`);
    return;
  }

  const userId = verifyOAuthStateToken(stateToken, "slack");
  if (!userId) {
    res.redirect(`${env.frontendUrl}/dashboard?error=slack_oauth_failed`);
    return;
  }

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.slackClientId,
      client_secret: env.slackClientSecret,
      code,
      redirect_uri: env.slackRedirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    ok?: boolean;
    access_token?: string;
    team?: { id?: string; name?: string };
  };

  if (!tokenRes.ok || !tokenData.ok || !tokenData.access_token) {
    res.redirect(`${env.frontendUrl}/dashboard?error=slack_oauth_failed`);
    return;
  }

  await upsertIntegration(userId, "slack", tokenData.access_token, null, {
    teamId: tokenData.team?.id ?? null,
    teamName: tokenData.team?.name ?? null,
  });

  res.redirect(`${env.frontendUrl}/settings/integrations?connected=slack`);
}

/**
 * Start Jira (Atlassian 3LO) OAuth flow.
 * Returns a provider auth URL containing a signed stateless CSRF state token.
 */
export async function jiraOAuthStart(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id as string;
  const state = signOAuthStateToken(userId, "jira");

  const authUrl = new URL("https://auth.atlassian.com/authorize");
  authUrl.searchParams.set("audience", "api.atlassian.com");
  authUrl.searchParams.set("client_id", env.jiraClientId);
  authUrl.searchParams.set(
    "scope",
    ["read:jira-work", "read:jira-user", "offline_access"].join(" "),
  );
  authUrl.searchParams.set("redirect_uri", env.jiraRedirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("prompt", "consent");

  res.json({ authUrl: authUrl.toString() });
}

/**
 * Jira OAuth callback.
 * Validates CSRF state, exchanges code, resolves cloudId, stores encrypted tokens.
 */
export async function jiraOAuthCallback(
  req: Request,
  res: Response,
): Promise<void> {
  if (typeof req.query.error === "string") {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_denied`);
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const stateToken =
    typeof req.query.state === "string" ? req.query.state : undefined;

  if (!code || !stateToken) {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_oauth_failed`);
    return;
  }

  const userId = verifyOAuthStateToken(stateToken, "jira");
  if (!userId) {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_oauth_failed`);
    return;
  }

  const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: env.jiraClientId,
      client_secret: env.jiraClientSecret,
      code,
      redirect_uri: env.jiraRedirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokenRes.ok || !tokenData.access_token) {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_oauth_failed`);
    return;
  }

  const resourcesRes = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    },
  );

  const resources = (await resourcesRes.json()) as Array<{
    id: string;
    name?: string;
    url?: string;
    scopes?: string[];
  }>;

  const primaryResource = Array.isArray(resources)
    ? resources.find(
        (resource) =>
          Array.isArray(resource.scopes) &&
          resource.scopes.includes("read:jira-work"),
      ) || resources[0]
    : undefined;
  if (!resourcesRes.ok || !primaryResource?.id) {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_oauth_failed`);
    return;
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await upsertIntegration(
    userId,
    "jira",
    tokenData.access_token,
    tokenData.refresh_token ?? null,
    {
      cloudId: primaryResource.id,
      cloudName: primaryResource.name ?? null,
      cloudUrl: primaryResource.url ?? null,
    },
    expiresAt,
  );

  res.redirect(`${env.frontendUrl}/settings/integrations?connected=jira`);
}
