import { pool } from "../../config/database.js";
import type { DbUser } from "../../types/index.js";

/**
 * Upsert user — create if new, update name/avatar if returning.
 * Uses ON CONFLICT to handle Google OAuth re-logins gracefully.
 */
export async function upsertUser(
  email: string,
  name: string,
  avatarUrl: string | null,
): Promise<DbUser> {
  const result = await pool.query<DbUser>(
    `INSERT INTO users (email, name, display_name, avatar_url, secondary_emails, linked_accounts)
     VALUES ($1, $2, $3, $4, '[]'::jsonb, '{}'::jsonb)
     ON CONFLICT (email)
     DO UPDATE SET name = $2, display_name = COALESCE(users.display_name, $3), avatar_url = $4, updated_at = NOW()
     RETURNING *`,
    [email, name, name, avatarUrl],
  );
  return result.rows[0];
}

export async function createLocalUser(
  email: string,
  name: string,
  displayName: string,
  passwordHash: string,
): Promise<DbUser> {
  const result = await pool.query<DbUser>(
    `INSERT INTO users (email, name, display_name, password_hash, secondary_emails, linked_accounts)
     VALUES ($1, $2, $3, $4, '[]'::jsonb, '{}'::jsonb)
     RETURNING *`,
    [email, name, displayName, passwordHash],
  );
  return result.rows[0];
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>("SELECT * FROM users WHERE id = $1", [
    id,
  ]);
  return result.rows[0] || null;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );
  return result.rows[0] || null;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string | null;
    email?: string | null;
    secondaryEmails?: string[] | null;
    linkedAccounts?: Record<string, unknown> | null;
  },
): Promise<DbUser> {
  const fields: string[] = [];
  const values: Array<string | string[] | Record<string, unknown> | null> = [];

  const addField = (
    sql: string,
    value: string | string[] | Record<string, unknown> | null,
  ) => {
    fields.push(sql);
    values.push(value);
  };

  if (updates.displayName !== undefined) {
    addField(`display_name = $${values.length + 1}`, updates.displayName);
  }
  if (updates.email !== undefined) {
    addField(`email = $${values.length + 1}`, updates.email);
  }
  if (updates.secondaryEmails !== undefined) {
    addField(
      `secondary_emails = $${values.length + 1}::jsonb`,
      JSON.stringify(updates.secondaryEmails),
    );
  }
  if (updates.linkedAccounts !== undefined) {
    addField(
      `linked_accounts = $${values.length + 1}::jsonb`,
      JSON.stringify(updates.linkedAccounts),
    );
  }

  if (fields.length === 0) {
    const current = await findUserById(userId);
    if (!current) {
      throw new Error("User not found");
    }
    return current;
  }

  values.push(userId);

  const result = await pool.query<DbUser>(
    `UPDATE users
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );

  return result.rows[0];
}

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET password_hash = $2, updated_at = NOW()
     WHERE id = $1`,
    [userId, passwordHash],
  );
}
