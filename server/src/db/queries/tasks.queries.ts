import { pool } from "../../config/database.js";

export interface DbTask {
  id: string;
  analysis_id: string | null;
  user_id: string;
  original_item_id: string | null;
  native_url: string | null;
  title: string;
  status: "pending" | "completed" | "dismissed";
  urgency_score: number | null;
  importance_score: number | null;
  completed_at: Date | null;
  created_at: Date;
}

interface ProductivityAggregate {
  completed_weight: string;
  actionable_weight: string;
}

/**
 * Bulk-create tasks from an analysis result.
 * Uses a single multi-row INSERT for efficiency.
 */
export async function createTasksFromAnalysis(
  userId: string,
  analysisId: string,
  tasks: Array<{
    originalItemId: string;
    nativeUrl?: string | null;
    title: string;
    urgencyScore: number;
    importanceScore: number;
  }>,
): Promise<DbTask[]> {
  if (tasks.length === 0) return [];

  // Build parameterized multi-row INSERT
  const values: unknown[] = [];
  const placeholders: string[] = [];

  tasks.forEach((task, i) => {
    const offset = i * 7;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`,
    );
    values.push(
      userId,
      analysisId,
      task.originalItemId,
      task.nativeUrl ?? null,
      task.title,
      task.urgencyScore,
      task.importanceScore,
    );
  });

  const result = await pool.query<DbTask>(
    `INSERT INTO tasks (user_id, analysis_id, original_item_id, native_url, title, urgency_score, importance_score)
     VALUES ${placeholders.join(", ")}
     RETURNING *`,
    values,
  );
  return result.rows;
}

/**
 * Update task status (complete or dismiss).
 */
export async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: "completed" | "dismissed",
): Promise<DbTask | null> {
  const completedAt = status === "completed" ? new Date() : null;

  const result = await pool.query<DbTask>(
    `UPDATE tasks
     SET status = $3, completed_at = $4
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [taskId, userId, status, completedAt],
  );
  return result.rows[0] || null;
}

/**
 * Update all pending task records mapped to the same original inbox item.
 * This is useful when the UI tracks completion by source item ID instead of DB UUID.
 */
export async function updateTaskStatusByOriginalItemId(
  originalItemId: string,
  userId: string,
  status: "completed" | "dismissed",
): Promise<DbTask | null> {
  const completedAt = status === "completed" ? new Date() : null;

  const result = await pool.query<DbTask>(
    `WITH updated AS (
       UPDATE tasks
       SET status = $3, completed_at = $4
       WHERE user_id = $1
         AND original_item_id = $2
         AND status = 'pending'
       RETURNING *
     )
     SELECT *
     FROM updated
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, originalItemId, status, completedAt],
  );

  return result.rows[0] || null;
}

/**
 * List tasks for a user, optionally filtered by status.
 */
export async function listTasks(
  userId: string,
  status?: string,
  limit: number = 50,
): Promise<DbTask[]> {
  if (status) {
    const result = await pool.query<DbTask>(
      `SELECT * FROM tasks
       WHERE user_id = $1 AND status = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, status, limit],
    );
    return result.rows;
  }

  const result = await pool.query<DbTask>(
    `SELECT * FROM tasks
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

/**
 * Productivity score is based on weighted completion over the last 14 days.
 * Weight = urgency_score * 0.6 + importance_score * 0.4.
 */
export async function getDynamicProductivityScore(
  userId: string,
): Promise<number> {
  const result = await pool.query<ProductivityAggregate>(
    `SELECT
       COALESCE(SUM(CASE
         WHEN status = 'completed'
           THEN (COALESCE(urgency_score, 5) * 0.6 + COALESCE(importance_score, 5) * 0.4)
         ELSE 0
       END), 0) AS completed_weight,
       COALESCE(SUM(CASE
         WHEN status IN ('completed', 'pending')
           THEN (COALESCE(urgency_score, 5) * 0.6 + COALESCE(importance_score, 5) * 0.4)
         ELSE 0
       END), 0) AS actionable_weight
     FROM tasks
     WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '14 days'`,
    [userId],
  );

  const row = result.rows[0];
  const completedWeight = Number(row?.completed_weight || 0);
  const actionableWeight = Number(row?.actionable_weight || 0);

  if (actionableWeight <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round((completedWeight / actionableWeight) * 100)),
  );
}
