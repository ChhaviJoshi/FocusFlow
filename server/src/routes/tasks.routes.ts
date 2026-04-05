import { Router } from 'express';
import { patchTask, getTasks } from '../controllers/tasks.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// List tasks (optionally filtered by ?status=pending|completed|dismissed)
router.get('/', requireAuth, asyncHandler(getTasks));

// Update task status
router.patch('/:id', requireAuth, asyncHandler(patchTask));

export default router;
