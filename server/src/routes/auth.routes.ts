import { Router } from 'express';
import { googleAuthRedirect, googleAuthCallback, getCurrentUser, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Initiate Google OAuth — redirects to Google's consent screen
router.get('/google', asyncHandler(googleAuthRedirect));

// Google redirects here after user grants consent
router.get('/google/callback', asyncHandler(googleAuthCallback));

// Get current authenticated user's profile + connected integrations
router.get('/me', requireAuth, asyncHandler(getCurrentUser));

// Destroy session and clear cookie
router.post('/logout', requireAuth, asyncHandler(logout));

export default router;
