import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  saveSlackIntegration,
  saveJiraIntegration,
  getIntegrations,
  removeIntegration,
} from '../controllers/integrations.controller.js';
import { upsertIntegration } from '../db/queries/integrations.queries.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

const router = Router();

// ============================================================================
// Existing manual-token routes
// ============================================================================

// List connected integrations (no tokens in response)
router.get('/', requireAuth, asyncHandler(getIntegrations));

// Save Slack token
router.post('/slack', requireAuth, asyncHandler(saveSlackIntegration));

// Save Jira credentials
router.post('/jira', requireAuth, asyncHandler(saveJiraIntegration));

// Disconnect an integration
router.delete('/:provider', requireAuth, asyncHandler(removeIntegration));

// ============================================================================
// P2: Slack OAuth — "Add to Workspace" flow
// ============================================================================

// P2: fill in client ID/secret from .env
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID ?? '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET ?? '';
const SLACK_REDIRECT_URI = `${env.frontendUrl}/api/integrations/slack/oauth/callback`;

/**
 * Step 1 — Redirect to Slack's OAuth consent screen.
 * GET /api/integrations/slack/oauth/start
 */
router.get('/slack/oauth/start', requireAuth, (req: Request, res: Response) => {
  const scopes = ['channels:read', 'chat:write', 'users:read'].join(',');

  const authUrl = new URL('https://slack.com/oauth/v2/authorize');
  authUrl.searchParams.set('client_id', SLACK_CLIENT_ID);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', SLACK_REDIRECT_URI);
  // Pass userId through state to link the callback to the correct user
  authUrl.searchParams.set('state', (req as any).user.id);

  res.redirect(authUrl.toString());
});

/**
 * Step 2 — Exchange code for access token and persist encrypted token.
 * GET /api/integrations/slack/oauth/callback
 */
router.get('/slack/oauth/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state: userId } = req.query as { code?: string; state?: string };

  if (!code || !userId) {
    res.redirect(`${env.frontendUrl}?error=slack_oauth_missing_params`);
    return;
  }

  // Exchange code for token
  const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: SLACK_REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json() as any;

  if (!tokenData.ok || !tokenData.access_token) {
    console.error('[Slack OAuth] Token exchange failed:', tokenData.error);
    res.redirect(`${env.frontendUrl}?error=slack_oauth_failed`);
    return;
  }

  // Save encrypted token
  await upsertIntegration(
    userId,
    'slack',
    tokenData.access_token,
    null, // Slack v2 doesn't return refresh tokens by default
    { team: tokenData.team?.name ?? null },
  );

  res.redirect(`${env.frontendUrl}?integration=slack&status=connected`);
}));

// ============================================================================
// P2: Jira OAuth — OAuth 2.0 (3LO) flow
// ============================================================================

// P2: fill in client ID/secret from .env
const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID ?? '';
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET ?? '';
const JIRA_REDIRECT_URI = `${env.frontendUrl}/api/integrations/jira/oauth/callback`;

/**
 * Step 1 — Redirect to Atlassian's OAuth consent screen.
 * GET /api/integrations/jira/oauth/start
 */
router.get('/jira/oauth/start', requireAuth, (req: Request, res: Response) => {
  const scopes = ['read:jira-work', 'read:jira-user', 'offline_access'].join(' ');

  const authUrl = new URL('https://auth.atlassian.com/authorize');
  authUrl.searchParams.set('audience', 'api.atlassian.com');
  authUrl.searchParams.set('client_id', JIRA_CLIENT_ID);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', JIRA_REDIRECT_URI);
  authUrl.searchParams.set('state', (req as any).user.id);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('prompt', 'consent');

  res.redirect(authUrl.toString());
});

/**
 * Step 2 — Exchange code for access/refresh tokens and persist encrypted.
 * GET /api/integrations/jira/oauth/callback
 */
router.get('/jira/oauth/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state: userId } = req.query as { code?: string; state?: string };

  if (!code || !userId) {
    res.redirect(`${env.frontendUrl}?error=jira_oauth_missing_params`);
    return;
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: JIRA_CLIENT_ID,
      client_secret: JIRA_CLIENT_SECRET,
      code,
      redirect_uri: JIRA_REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json() as any;

  if (!tokenData.access_token) {
    console.error('[Jira OAuth] Token exchange failed:', tokenData);
    res.redirect(`${env.frontendUrl}?error=jira_oauth_failed`);
    return;
  }

  // Save encrypted tokens
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await upsertIntegration(
    userId,
    'jira',
    tokenData.access_token,
    tokenData.refresh_token ?? null,
    {}, // P2: fetch accessible-resources to store cloud ID / site name here
    expiresAt,
  );

  res.redirect(`${env.frontendUrl}?integration=jira&status=connected`);
}));

export default router;
