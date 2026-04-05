import { Router } from 'express';
import { analyzeInbox, getAnalysisHistory } from '../controllers/analysis.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { analysisLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Run AI analysis on inbox items (rate-limited — expensive Gemini calls)
router.post('/', requireAuth, analysisLimiter, asyncHandler(analyzeInbox));

// Get analysis history
router.get('/', requireAuth, asyncHandler(getAnalysisHistory));

export default router;
