import rateLimit from 'express-rate-limit';

/**
 * Rate limiters to prevent abuse and control Gemini API costs.
 * Keyed by IP in dev, should be keyed by userId in production
 * (requires a custom keyGenerator after auth middleware runs).
 */

// General API rate limit: 100 requests per minute
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI analysis rate limit: 10 per minute (these are expensive Gemini calls)
export const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many analysis requests. Please wait before re-analyzing.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by session userId if available, otherwise fall back to IP
  keyGenerator: (req) => {
    return req.session?.userId || req.ip || 'anonymous';
  },
});
