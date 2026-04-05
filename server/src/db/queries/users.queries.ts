import { pool } from '../../config/database.js';
import type { DbUser } from '../../types/index.js';

/**
 * Upsert user — create if new, update name/avatar if returning.
 * Uses ON CONFLICT to handle Google OAuth re-logins gracefully.
 */
export async function upsertUser(
  email: string,
  name: string,
  avatarUrl: string | null
): Promise<DbUser> {
  const result = await pool.query<DbUser>(
    `INSERT INTO users (email, name, avatar_url)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET name = $2, avatar_url = $3, updated_at = NOW()
     RETURNING *`,
    [email, name, avatarUrl]
  );
  return result.rows[0];
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}
