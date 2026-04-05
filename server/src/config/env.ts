import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (one level up from server/)
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });
// Also try loading from server/ directory itself (for standalone runs)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Typed environment configuration.
 * Throws immediately on startup if any required variable is missing —
 * fail fast instead of getting cryptic errors later.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Google OAuth
  googleClientId: requireEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
  googleCallbackUrl: requireEnv('GOOGLE_CALLBACK_URL'),

  // Gemini AI
  geminiApiKey: requireEnv('GEMINI_API_KEY'),

  // PostgreSQL
  databaseUrl: requireEnv('DATABASE_URL'),

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Session
  sessionSecret: requireEnv('SESSION_SECRET'),

  // Encryption key for tokens at rest (must be 32 bytes = 64 hex chars)
  encryptionKey: requireEnv('ENCRYPTION_KEY'),

  get isDev() {
    return this.nodeEnv === 'development';
  },
  get isProd() {
    return this.nodeEnv === 'production';
  },
} as const;
