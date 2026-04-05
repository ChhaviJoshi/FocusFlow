import { Router } from 'express';
import { getInbox } from '../controllers/inbox.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Fetch aggregated inbox from all connected sources
router.get('/', requireAuth, asyncHandler(getInbox));

export default router;
