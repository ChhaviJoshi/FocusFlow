import { Router } from 'express';
import {
  saveSlackIntegration,
  saveJiraIntegration,
  getIntegrations,
  removeIntegration,
} from '../controllers/integrations.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// List connected integrations (no tokens in response)
router.get('/', requireAuth, asyncHandler(getIntegrations));

// Save Slack token
router.post('/slack', requireAuth, asyncHandler(saveSlackIntegration));

// Save Jira credentials
router.post('/jira', requireAuth, asyncHandler(saveJiraIntegration));

// Disconnect an integration
router.delete('/:provider', requireAuth, asyncHandler(removeIntegration));

// TODO: POST /slack/oauth — Slack "Add to Workspace" OAuth flow (P2)
// TODO: POST /jira/oauth — Jira OAuth flow (P2)

export default router;
