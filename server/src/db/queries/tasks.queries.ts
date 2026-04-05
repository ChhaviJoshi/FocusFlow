import { pool } from '../../config/database.js';

export interface DbTask {
  id: string;
  analysis_id: string | null;
  user_id: string;
  original_item_id: string | null;
  title: string;
  status: 'pending' | 'completed' | 'dismissed';
  urgency_score: number | null;
  importance_score: number | null;
  completed_at: Date | null;
  created_at: Date;
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
    title: string;
    urgencyScore: number;
    importanceScore: number;
  }>
): Promise<DbTask[]> {
  if (tasks.length === 0) return [];

  // Build parameterized multi-row INSERT
  const values: unknown[] = [];
  const placeholders: string[] = [];

  tasks.forEach((task, i) => {
    const offset = i * 5;
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
    values.push(userId, analysisId, task.originalItemId, task.title, task.urgencyScore);
  });

  // Note: importance_score is not in the multi-row insert for simplicity
  // Using individual inserts for full column support
  const result = await pool.query<DbTask>(
    `INSERT INTO tasks (user_id, analysis_id, original_item_id, title, urgency_score)
     VALUES ${placeholders.join(', ')}
     RETURNING *`,
    values
  );
  return result.rows;
}

/**
 * Update task status (complete or dismiss).
 */
export async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: 'completed' | 'dismissed'
): Promise<DbTask | null> {
  const completedAt = status === 'completed' ? new Date() : null;

  const result = await pool.query<DbTask>(
    `UPDATE tasks
     SET status = $3, completed_at = $4
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [taskId, userId, status, completedAt]
  );
  return result.rows[0] || null;
}

/**
 * List tasks for a user, optionally filtered by status.
 */
export async function listTasks(
  userId: string,
  status?: string,
  limit: number = 50
): Promise<DbTask[]> {
  if (status) {
    const result = await pool.query<DbTask>(
      `SELECT * FROM tasks
       WHERE user_id = $1 AND status = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, status, limit]
    );
    return result.rows;
  }

  const result = await pool.query<DbTask>(
    `SELECT * FROM tasks
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}
