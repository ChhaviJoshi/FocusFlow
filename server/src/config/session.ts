import session from 'express-session';
import RedisStore from 'connect-redis';
import { redisClient } from './redis.js';
import { env } from './env.js';

/**
 * Express session middleware backed by Redis.
 *
 * Why Redis-backed sessions over JWT?
 * - Sessions can be invalidated server-side instantly (logout = destroy session)
 * - No token size bloat in cookies
 * - Redis handles TTL/expiry natively
 *
 * Why SameSite=Lax and not Strict?
 * - The Google OAuth redirect (google.com → our callback) is a cross-site top-level
 *   navigation. SameSite=Strict would block the cookie on that redirect, breaking login.
 *   Lax allows cookies on top-level navigations, which is exactly what we need.
 */
export const sessionMiddleware = session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'focusflow:sess:',
  }),
  secret: env.sessionSecret,
  name: 'focusflow.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                       // JS cannot read the cookie — prevents XSS theft
    secure: env.isProd,                   // HTTPS-only in production; HTTP ok in dev
    sameSite: 'lax',                      // See comment above
    maxAge: 7 * 24 * 60 * 60 * 1000,     // 7 days
  },
});
