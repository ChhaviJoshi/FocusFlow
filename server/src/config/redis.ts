import { createClient, type RedisClientType } from 'redis';
import { env } from './env.js';

/**
 * Redis client — used for both session storage and AI response caching.
 * Single client instance shared across the app.
 */
export const redisClient: RedisClientType = createClient({
  url: env.redisUrl,
});

redisClient.on('error', (err) => {
  console.error('[Redis] Client error:', err.message);
});

redisClient.on('reconnecting', () => {
  console.log('[Redis] Reconnecting...');
});

export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
    console.log('[Redis] Connected successfully');
  } catch (err) {
    console.error('[Redis] Failed to connect:', err);
    throw err;
  }
}
