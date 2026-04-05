import pg from 'pg';
import { env } from './env.js';

/**
 * PostgreSQL connection pool.
 * Uses a connection pool (not single client) so multiple requests
 * can run queries concurrently without blocking each other.
 */
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  // Sensible defaults for a small-to-medium app
  max: 20,             // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log pool errors (connection drops, etc.) — don't let them crash silently
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Verify the database is reachable on startup.
 */
export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log(`[DB] Connected to PostgreSQL — server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('[DB] Failed to connect to PostgreSQL:', err);
    throw err;
  }
}
