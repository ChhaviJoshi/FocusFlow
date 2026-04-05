import { redisClient } from '../config/redis.js';
import crypto from 'crypto';

/**
 * Redis caching service for AI analysis results.
 *
 * Cache strategy:
 * - Key = hash of inbox item content (so same inbox → cache hit)
 * - TTL = 20 minutes (fresh enough for workplace data)
 * - If inbox changes, the hash changes, and we get a cache miss → fresh AI call
 */

const CACHE_PREFIX = 'focusflow:analysis:';
const CACHE_TTL_SECONDS = 20 * 60; // 20 minutes

/**
 * Generate a deterministic cache key from inbox items.
 * Uses SHA-256 of the sorted item IDs + content to detect changes.
 */
function generateCacheKey(userId: string, items: Array<{ id: string; content: string }>): string {
  const contentHash = crypto
    .createHash('sha256')
    .update(
      items
        .map(i => `${i.id}:${i.content}`)
        .sort()
        .join('|')
    )
    .digest('hex')
    .substring(0, 16); // First 16 chars is enough to avoid collisions

  return `${CACHE_PREFIX}${userId}:${contentHash}`;
}

/**
 * Try to get a cached analysis result.
 * Returns null on cache miss.
 */
export async function getCachedAnalysis(
  userId: string,
  items: Array<{ id: string; content: string }>
): Promise<string | null> {
  try {
    const key = generateCacheKey(userId, items);
    const cached = await redisClient.get(key);
    if (cached) {
      console.log(`[Cache] HIT for user ${userId.substring(0, 8)}...`);
    }
    return cached;
  } catch (err) {
    // Cache errors should never break the app — just log and miss
    console.warn('[Cache] Read error:', err);
    return null;
  }
}

/**
 * Store an analysis result in the cache.
 */
export async function setCachedAnalysis(
  userId: string,
  items: Array<{ id: string; content: string }>,
  result: string
): Promise<void> {
  try {
    const key = generateCacheKey(userId, items);
    await redisClient.setEx(key, CACHE_TTL_SECONDS, result);
    console.log(`[Cache] SET for user ${userId.substring(0, 8)}... (TTL: ${CACHE_TTL_SECONDS}s)`);
  } catch (err) {
    console.warn('[Cache] Write error:', err);
  }
}
