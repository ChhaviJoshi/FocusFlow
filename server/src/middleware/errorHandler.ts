import type { Request, Response, NextFunction } from 'express';

/**
 * Global error handler — catches all unhandled errors from async routes.
 * Must have 4 parameters for Express to recognize it as an error handler.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Don't leak internal error details to the client in production
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : 'Internal server error';

  res.status(500).json({ error: message });
}

/**
 * Wrapper for async route handlers.
 * Express doesn't catch rejections from async functions by default —
 * this ensures they're forwarded to the error handler middleware.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
