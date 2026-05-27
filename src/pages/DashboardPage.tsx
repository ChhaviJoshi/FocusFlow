import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  LayoutDashboard,
  RefreshCcw,
  Trophy,
  User,
} from "lucide-react";
import dashboardAvatar from "../assets/images/stitch/dashboard-avatar.jpg";

interface TaskItem {
  id: string;
  title: string;
  status: "pending" | "completed" | "dismissed";
  urgency_score: number | null;
  importance_score: number | null;
  native_url: string | null;
}

interface DashboardSummary {
  sessionWins: {
    completedTasks: number;
  };
  workloadBalance: {
    completed: { total: number; high: number; medium: number; low: number };
    pending: { total: number; high: number; medium: number; low: number };
  };
  incomingUrgency: {
    dueIn1Hour: number;
    dueIn5Hours: number;
    dueToday: number;
    dueTomorrow: number;
  };
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [tasksResponse, summaryResponse] = await Promise.all([
        fetch("/api/tasks", { credentials: "include" }),
        fetch("/api/dashboard/summary", { credentials: "include" }),
      ]);

      if (!tasksResponse.ok || !summaryResponse.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const tasksPayload = (await tasksResponse.json()) as {
        tasks: TaskItem[];
      };
      const summaryPayload = (await summaryResponse.json()) as DashboardSummary;

      setTasks(tasksPayload.tasks ?? []);
      setSummary(summaryPayload);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    try {
      const inboxResponse = await fetch("/api/inbox", {
        credentials: "include",
      });
      if (!inboxResponse.ok) {
        throw new Error("Failed to fetch inbox");
      }

      const inboxPayload = (await inboxResponse.json()) as { items: unknown[] };
      const items = inboxPayload.items ?? [];

      if (items.length > 0) {
        const analyzeResponse = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ items }),
        });

        if (!analyzeResponse.ok) {
          throw new Error("Analysis failed");
        }
      }

      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to refresh analysis");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to update task");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const completionPercent = useMemo(() => {
    if (!summary) return 0;
    const total =
      summary.workloadBalance.pending.total +
      summary.workloadBalance.completed.total;
    if (total === 0) return 0;
    return Math.round((summary.workloadBalance.completed.total / total) * 100);
  }, [summary]);

  const completionWidthClass = useMemo(() => {
    if (completionPercent >= 90) return "w-full";
    if (completionPercent >= 75) return "w-4/5";
    if (completionPercent >= 60) return "w-3/5";
    if (completionPercent >= 50) return "w-1/2";
    if (completionPercent >= 40) return "w-2/5";
    if (completionPercent >= 25) return "w-1/4";
    if (completionPercent > 0) return "w-1/5";
    return "w-0";
  }, [completionPercent]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <aside className="hidden min-h-screen w-64 flex-col bg-slate-900 px-4 py-6 text-slate-200 lg:flex">
          <div>
            <h1 className="text-lg font-semibold text-white">FocusFlow</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
              Kinetic Precision
            </p>
          </div>
          <nav className="mt-10 space-y-2 text-sm">
            <button className="flex w-full items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white">
              <LayoutDashboard className="h-4 w-4" />
              Priority Hub
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate("/profile")}
            >
              <User className="h-4 w-4" />
              User Profile
            </button>
          </nav>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3 text-slate-600">
                <button
                  className="rounded-full bg-slate-100 p-2"
                  onClick={handleAnalyze}
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold">Dashboard</span>
              </div>
              <button
                className="rounded-full"
                onClick={() => navigate("/profile")}
              >
                <img
                  src={dashboardAvatar}
                  alt="User avatar"
                  className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                />
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-6 py-10">
            <div className="mb-8">
              <h2 className="text-3xl font-semibold text-slate-900">
                Good Morning
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Your prioritized queue is ready to action.
              </p>
            </div>

            {error ? (
              <div className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            ) : null}

            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              <section className="space-y-5">
                {loading ? (
                  <div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    Loading tasks...
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No tasks available yet.
                  </div>
                ) : (
                  tasks.slice(0, 5).map((task, index) => {
                    const urgency = Math.round((task.urgency_score ?? 0) * 100);
                    const importance = Math.round(
                      (task.importance_score ?? 0) * 100,
                    );
                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <Inbox className="h-4 w-4 text-blue-600" />
                            Priority Task
                          </div>
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                            Urgency {urgency}/100
                          </span>
                        </div>
                        <h3 className="mt-4 text-2xl font-semibold text-slate-900">
                          {task.title}
                        </h3>
                        <div className="mt-4 flex items-start gap-3 rounded-lg border-l-4 border-blue-600 bg-slate-50 p-4">
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-500" />
                          <p className="text-sm text-slate-600">
                            Importance score: {importance}/100
                          </p>
                        </div>
                        <div className="mt-6 flex justify-end">
                          <button
                            className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm"
                            onClick={() => handleCompleteTask(task.id)}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              <aside className="space-y-6">
                <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Session Wins
                    </h4>
                    <span className="text-xs font-semibold text-emerald-500">
                      {completionPercent}% DAILY GOAL
                    </span>
                  </div>
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-semibold text-slate-900">
                        {summary?.sessionWins.completedTasks ?? 0}
                      </p>
                      <p className="text-xs text-slate-500">Tasks Done</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      {summary?.workloadBalance.pending.total ?? 0} Left Today
                    </p>
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full bg-emerald-500 ${completionWidthClass}`}
                    />
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Completed high-priority tasks:{" "}
                      {summary?.workloadBalance.completed.high ?? 0}
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Completed medium-priority tasks:{" "}
                      {summary?.workloadBalance.completed.medium ?? 0}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Workload Balance
                  </h4>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-slate-500">High</p>
                      <p className="text-base font-semibold text-slate-900">
                        {summary?.workloadBalance.pending.high ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-slate-500">Medium</p>
                      <p className="text-base font-semibold text-slate-900">
                        {summary?.workloadBalance.pending.medium ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-slate-500">Low</p>
                      <p className="text-base font-semibold text-slate-900">
                        {summary?.workloadBalance.pending.low ?? 0}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Pending total: {summary?.workloadBalance.pending.total ?? 0}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Inbox className="h-4 w-4 text-blue-600" />
                      Incoming Stream
                    </h4>
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span>Due in 1 hour</span>
                      <span className="font-semibold text-slate-900">
                        {summary?.incomingUrgency.dueIn1Hour ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span>Due in 5 hours</span>
                      <span className="font-semibold text-slate-900">
                        {summary?.incomingUrgency.dueIn5Hours ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span>Due today</span>
                      <span className="font-semibold text-slate-900">
                        {summary?.incomingUrgency.dueToday ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span>Due tomorrow</span>
                      <span className="font-semibold text-slate-900">
                        {summary?.incomingUrgency.dueTomorrow ?? 0}
                      </span>
                    </div>
                  </div>
                  <button
                    className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-blue-600"
                    onClick={() => navigate("/integrations")}
                  >
                    View All Integrations
                  </button>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
