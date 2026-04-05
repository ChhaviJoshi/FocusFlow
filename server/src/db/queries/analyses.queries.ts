import { pool } from '../../config/database.js';
import type { AnalysisResult } from '../../types/index.js';

export interface DbAnalysis {
  id: string;
  user_id: string;
  inbox_item_count: number;
  productivity_score: number;
  distribution: Record<string, number>;
  analysis_result: AnalysisResult;
  created_at: Date;
}

/**
 * Save an AI analysis result to the database for history tracking.
 */
export async function saveAnalysis(
  userId: string,
  inboxItemCount: number,
  result: AnalysisResult
): Promise<DbAnalysis> {
  const queryResult = await pool.query<DbAnalysis>(
    `INSERT INTO analyses (user_id, inbox_item_count, productivity_score, distribution, analysis_result)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      userId,
      inboxItemCount,
      result.productivityScore,
      JSON.stringify(result.distribution),
      JSON.stringify(result),
    ]
  );
  return queryResult.rows[0];
}

/**
 * List recent analyses for a user, ordered newest first.
 */
export async function listAnalyses(
  userId: string,
  limit: number = 20
): Promise<DbAnalysis[]> {
  const result = await pool.query<DbAnalysis>(
    `SELECT * FROM analyses
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function getAnalysisById(
  analysisId: string,
  userId: string
): Promise<DbAnalysis | null> {
  const result = await pool.query<DbAnalysis>(
    'SELECT * FROM analyses WHERE id = $1 AND user_id = $2',
    [analysisId, userId]
  );
  return result.rows[0] || null;
}
