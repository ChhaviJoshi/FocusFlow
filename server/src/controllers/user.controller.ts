import type { Request, Response } from "express";
import { updateUserProfile } from "../db/queries/users.queries.js";
import type { DbUser } from "../types/index.js";

function formatUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    displayName: user.display_name,
    secondaryEmails: user.secondary_emails ?? [],
    linkedAccounts: user.linked_accounts ?? {},
    avatarUrl: user.avatar_url,
  };
}

export async function updateProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id as string;
  const { displayName, email, secondaryEmails, linkedAccounts } = req.body as {
    displayName?: string | null;
    email?: string | null;
    secondaryEmails?: string[] | null;
    linkedAccounts?: Record<string, unknown> | null;
  };

  if (secondaryEmails !== undefined && secondaryEmails !== null) {
    if (!Array.isArray(secondaryEmails)) {
      res.status(400).json({ error: "secondaryEmails must be an array" });
      return;
    }
    if (!secondaryEmails.every((entry) => typeof entry === "string")) {
      res.status(400).json({ error: "secondaryEmails must contain strings" });
      return;
    }
  }

  if (linkedAccounts !== undefined && linkedAccounts !== null) {
    if (typeof linkedAccounts !== "object" || Array.isArray(linkedAccounts)) {
      res.status(400).json({ error: "linkedAccounts must be an object" });
      return;
    }
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : email;

  try {
    const user = await updateUserProfile(userId, {
      displayName: displayName?.trim() ?? displayName,
      email: normalizedEmail,
      secondaryEmails,
      linkedAccounts,
    });

    res.json({ message: "Success", user: formatUser(user) });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    throw error;
  }
}
