import type { Request, Response } from "express";
import {
  getTaskSummaryBuckets,
  listOpenTasksWithDueAt,
} from "../db/queries/tasks.queries.js";

const HIGH_THRESHOLD = 0.7;
const MEDIUM_THRESHOLD = 0.4;

function bucketDueDates(tasks: { due_at: Date | null }[]) {
  const now = new Date();
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const fiveHours = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfTomorrow = new Date(endOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

  let dueIn1Hour = 0;
  let dueIn5Hours = 0;
  let dueToday = 0;
  let dueTomorrow = 0;

  tasks.forEach((task) => {
    if (!task.due_at) return;
    const dueAt = new Date(task.due_at);

    if (dueAt <= oneHour) {
      dueIn1Hour += 1;
    }
    if (dueAt <= fiveHours) {
      dueIn5Hours += 1;
    }
    if (dueAt <= endOfToday) {
      dueToday += 1;
    } else if (dueAt <= endOfTomorrow) {
      dueTomorrow += 1;
    }
  });

  return {
    dueIn1Hour,
    dueIn5Hours,
    dueToday,
    dueTomorrow,
  };
}

export async function getDashboardSummary(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id as string;

  const summary = await getTaskSummaryBuckets(
    userId,
    HIGH_THRESHOLD,
    MEDIUM_THRESHOLD,
  );
  const dueTasks = await listOpenTasksWithDueAt(userId);
  const incomingUrgency = bucketDueDates(dueTasks);

  res.json({
    sessionWins: {
      completedTasks: Number(summary.completed_total),
    },
    workloadBalance: {
      completed: {
        total: Number(summary.completed_total),
        high: Number(summary.completed_high),
        medium: Number(summary.completed_medium),
        low: Number(summary.completed_low),
      },
      pending: {
        total: Number(summary.pending_total),
        high: Number(summary.pending_high),
        medium: Number(summary.pending_medium),
        low: Number(summary.pending_low),
      },
    },
    incomingUrgency,
  });
}
