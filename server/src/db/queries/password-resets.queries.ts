import { pool } from "../../config/database.js";

export interface PasswordResetRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export async function createPasswordReset(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<PasswordResetRecord> {
  const result = await pool.query<PasswordResetRecord>(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, tokenHash, expiresAt],
  );
  return result.rows[0];
}

export async function findActivePasswordReset(
  tokenHash: string,
): Promise<PasswordResetRecord | null> {
  const result = await pool.query<PasswordResetRecord>(
    `SELECT *
     FROM password_resets
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [tokenHash],
  );
  return result.rows[0] || null;
}

export async function markPasswordResetUsed(resetId: string): Promise<void> {
  await pool.query(
    `UPDATE password_resets
     SET used_at = NOW()
     WHERE id = $1`,
    [resetId],
  );
}
