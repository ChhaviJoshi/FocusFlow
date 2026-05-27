import { Router } from "express";
import {
  getIntegrations,
  removeIntegration,
  slackOAuthStart,
  slackOAuthCallback,
  jiraOAuthStart,
  jiraOAuthCallback,
} from "../controllers/integrations.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

// List connected integrations (no tokens in response)
router.get("/", requireAuth, asyncHandler(getIntegrations));

// Disconnect an integration
router.delete("/:provider", requireAuth, asyncHandler(removeIntegration));

// OAuth start/callback routes
router.get("/slack/oauth/start", requireAuth, asyncHandler(slackOAuthStart));
router.get("/slack/oauth/callback", asyncHandler(slackOAuthCallback));
router.get("/jira/oauth/start", requireAuth, asyncHandler(jiraOAuthStart));
router.get("/jira/oauth/callback", asyncHandler(jiraOAuthCallback));

export default router;
