import type { Request, Response } from "express";
import { listOpenTasksWithDueAt } from "../db/queries/tasks.queries.js";

function buildNotifications(
  tasks: Array<{
    id: string;
    title: string;
    due_at: Date | null;
    urgency_score: number | null;
    importance_score: number | null;
  }>,
) {
  const now = new Date();
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const fiveHours = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfTomorrow = new Date(endOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

  const dueIn1Hour: typeof tasks = [];
  const dueIn5Hours: typeof tasks = [];
  const dueToday: typeof tasks = [];
  const dueTomorrow: typeof tasks = [];

  tasks.forEach((task) => {
    if (!task.due_at) return;
    const dueAt = new Date(task.due_at);

    if (dueAt <= oneHour) {
      dueIn1Hour.push(task);
    }
    if (dueAt <= fiveHours) {
      dueIn5Hours.push(task);
    }
    if (dueAt <= endOfToday) {
      dueToday.push(task);
    } else if (dueAt <= endOfTomorrow) {
      dueTomorrow.push(task);
    }
  });

  return [
    {
      bucket: "due_in_1_hour",
      count: dueIn1Hour.length,
      tasks: dueIn1Hour,
    },
    {
      bucket: "due_in_5_hours",
      count: dueIn5Hours.length,
      tasks: dueIn5Hours,
    },
    {
      bucket: "due_today",
      count: dueToday.length,
      tasks: dueToday,
    },
    {
      bucket: "due_tomorrow",
      count: dueTomorrow.length,
      tasks: dueTomorrow,
    },
  ];
}

export async function getNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id as string;
  const tasks = await listOpenTasksWithDueAt(userId);

  const notifications = buildNotifications(
    tasks.map((task) => ({
      id: task.id,
      title: task.title,
      due_at: task.due_at,
      urgency_score: task.urgency_score,
      importance_score: task.importance_score,
    })),
  );

  res.json({ notifications });
}
