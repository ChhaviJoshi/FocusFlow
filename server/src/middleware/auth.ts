import type { Request, Response, NextFunction } from 'express';
import { findUserById } from '../db/queries/users.queries.js';

/**
 * Authentication middleware — protects API routes.
 * Checks for a valid session with a userId, then loads the user from DB
 * and attaches it to req.user for downstream handlers.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      // Session references a user that no longer exists — destroy the stale session
      req.session.destroy(() => {});
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request for controllers to use
    // Using a property on the request object (Express convention)
    (req as any).user = user;
    next();
  } catch (err) {
    next(err);
  }
}
