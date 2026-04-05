import type { Request, Response } from 'express';
import { upsertIntegration, listIntegrations, deleteIntegration } from '../db/queries/integrations.queries.js';
import { SlackTokenSchema, JiraCredentialsSchema } from '../validators/integration.schema.js';

/**
 * Save Slack integration (manual token entry for now).
 * Validates the token format with Zod before storing.
 */
export async function saveSlackIntegration(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;

  const validation = SlackTokenSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: 'Invalid Slack token',
      details: validation.error.issues.map(i => i.message),
    });
    return;
  }

  await upsertIntegration(userId, 'slack', validation.data.token, null);
  res.json({ success: true, provider: 'slack' });
}

/**
 * Save Jira integration (manual credential entry for now).
 * Validates credentials with Zod and stores apiToken encrypted.
 * Domain and email go into the metadata column.
 */
export async function saveJiraIntegration(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;

  const validation = JiraCredentialsSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: 'Invalid Jira credentials',
      details: validation.error.issues.map(i => i.message),
    });
    return;
  }

  const { domain, email, apiToken } = validation.data;

  // Store apiToken as the access_token (encrypted), domain + email in metadata
  await upsertIntegration(
    userId,
    'jira',
    apiToken,
    null,
    { domain, email }
  );

  res.json({ success: true, provider: 'jira' });
}

/**
 * List all connected integrations for the current user (no tokens exposed).
 */
export async function getIntegrations(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const integrations = await listIntegrations(userId);

  res.json({
    integrations: integrations.map(i => ({
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
export async function removeIntegration(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const { provider } = req.params;

  // Don't allow deleting the google integration (it's tied to auth)
  if (provider === 'google') {
    res.status(400).json({ error: 'Cannot disconnect Google — it is your login provider. Log out instead.' });
    return;
  }

  const deleted = await deleteIntegration(userId, provider);

  if (!deleted) {
    res.status(404).json({ error: `Integration "${provider}" not found` });
    return;
  }

  res.json({ success: true, provider });
}
