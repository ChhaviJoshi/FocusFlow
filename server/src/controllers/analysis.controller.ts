import type { Request, Response } from 'express';
import { analyzePriorities } from '../services/gemini.service.js';
import { getCachedAnalysis, setCachedAnalysis } from '../services/cache.service.js';
import { saveAnalysis, listAnalyses } from '../db/queries/analyses.queries.js';
import { createTasksFromAnalysis } from '../db/queries/tasks.queries.js';
import type { InboxItem } from '../types/index.js';

/**
 * Analyze inbox items with Gemini AI.
 * 1. Check Redis cache first (keyed by content hash)
 * 2. If cache miss, call Gemini → validate with Zod → cache the result
 * 3. Persist to PostgreSQL for history tracking
 * 4. Create task records for each priority item
 */
export async function analyzeInbox(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const { items } = req.body as { items: InboxItem[] };

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Request body must include a non-empty "items" array' });
    return;
  }

  // Step 1: Check cache
  const cacheInput = items.map(i => ({ id: i.id, content: i.content }));
  const cached = await getCachedAnalysis(userId, cacheInput);

  if (cached) {
    const result = JSON.parse(cached);
    res.json({ result, cached: true });
    return;
  }

  // Step 2: Call Gemini (with sanitization + Zod validation inside the service)
  const result = await analyzePriorities(items);

  // Step 3: Cache the result
  await setCachedAnalysis(userId, cacheInput, JSON.stringify(result));

  // Step 4: Persist to DB for history
  const savedAnalysis = await saveAnalysis(userId, items.length, result);

  // Step 5: Create task records for each top priority
  if (result.topPriorities.length > 0) {
    await createTasksFromAnalysis(
      userId,
      savedAnalysis.id,
      result.topPriorities.map(p => ({
        originalItemId: p.originalItemId,
        title: p.title,
        urgencyScore: p.urgencyScore,
        importanceScore: p.importanceScore,
      }))
    );
  }

  res.json({ result, cached: false });
}

/**
 * Get analysis history for the current user.
 */
export async function getAnalysisHistory(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const limit = parseInt(req.query.limit as string) || 20;

  const analyses = await listAnalyses(userId, limit);

  res.json({
    analyses: analyses.map(a => ({
      id: a.id,
      inboxItemCount: a.inbox_item_count,
      productivityScore: a.productivity_score,
      distribution: a.distribution,
      createdAt: a.created_at,
    })),
  });
}
