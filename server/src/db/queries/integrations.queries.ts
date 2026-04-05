import { pool } from '../../config/database.js';
import { encrypt, decrypt } from '../../services/crypto.service.js';
import type { DbIntegration } from '../../types/index.js';

/**
 * Upsert an integration — encrypts tokens before storing.
 * Uses ON CONFLICT (user_id, provider) to update existing integrations.
 */
export async function upsertIntegration(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken: string | null,
  metadata: Record<string, unknown> = {},
  expiresAt: Date | null = null
): Promise<DbIntegration> {
  const encryptedAccess = encrypt(accessToken);
  const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

  const result = await pool.query<DbIntegration>(
    `INSERT INTO integrations (user_id, provider, access_token, refresh_token, metadata, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, provider)
     DO UPDATE SET
       access_token = $3,
       refresh_token = COALESCE($4, integrations.refresh_token),
       metadata = $5,
       expires_at = $6,
       updated_at = NOW()
     RETURNING *`,
    [userId, provider, encryptedAccess, encryptedRefresh, JSON.stringify(metadata), expiresAt]
  );
  return result.rows[0];
}

/**
 * Get an integration with decrypted tokens.
 * Only call this when you actually need the token to make an API call.
 */
export async function getIntegrationDecrypted(
  userId: string,
  provider: string
): Promise<(DbIntegration & { decryptedAccessToken: string; decryptedRefreshToken: string | null }) | null> {
  const result = await pool.query<DbIntegration>(
    'SELECT * FROM integrations WHERE user_id = $1 AND provider = $2',
    [userId, provider]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    ...row,
    decryptedAccessToken: decrypt(row.access_token),
    decryptedRefreshToken: row.refresh_token ? decrypt(row.refresh_token) : null,
  };
}

/**
 * List integrations for a user — WITHOUT exposing tokens.
 * Used for the "connected integrations" UI.
 */
export async function listIntegrations(userId: string): Promise<Array<{
  id: string;
  provider: string;
  connected: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
}>> {
  const result = await pool.query(
    `SELECT id, provider, metadata, created_at
     FROM integrations
     WHERE user_id = $1
     ORDER BY provider`,
    [userId]
  );
  return result.rows.map(row => ({
    ...row,
    connected: true,
  }));
}

export async function deleteIntegration(userId: string, provider: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM integrations WHERE user_id = $1 AND provider = $2',
    [userId, provider]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Update only the access token (used during token refresh).
 */
export async function updateAccessToken(
  userId: string,
  provider: string,
  newAccessToken: string,
  newExpiresAt: Date | null
): Promise<void> {
  const encryptedToken = encrypt(newAccessToken);
  await pool.query(
    `UPDATE integrations
     SET access_token = $3, expires_at = $4, updated_at = NOW()
     WHERE user_id = $1 AND provider = $2`,
    [userId, provider, encryptedToken, newExpiresAt]
  );
}
