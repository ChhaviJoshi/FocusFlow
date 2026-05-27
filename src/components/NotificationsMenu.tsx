import { useState } from "react";
import { Bell } from "lucide-react";

interface NotificationTask {
  id: string;
  title: string;
  due_at: string | Date | null;
}

interface NotificationBucket {
  bucket: "due_in_1_hour" | "due_in_5_hours" | "due_today" | "due_tomorrow";
  count: number;
  tasks: NotificationTask[];
}

const bucketLabels: Record<NotificationBucket["bucket"], string> = {
  due_in_1_hour: "Due in 1 hour",
  due_in_5_hours: "Due in 5 hours",
  due_today: "Due today",
  due_tomorrow: "Due tomorrow",
};

const NotificationsMenu = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buckets, setBuckets] = useState<NotificationBucket[]>([]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load notifications");
      }
      const payload = (await response.json()) as {
        notifications: NotificationBucket[];
      };
      setBuckets(payload.notifications ?? []);
    } catch {
      setBuckets([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="rounded-full border border-slate-200 bg-white p-2 shadow-sm"
      >
        <Bell className="h-4 w-4 text-slate-600" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="mb-3 text-sm font-semibold text-slate-900">
            Deadlines
          </div>
          {loading ? (
            <div className="text-xs text-slate-500">
              Loading notifications...
            </div>
          ) : buckets.length === 0 ? (
            <div className="text-xs text-slate-500">No upcoming deadlines.</div>
          ) : (
            <div className="space-y-3">
              {buckets.map((bucket) => (
                <div key={bucket.bucket} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>{bucketLabels[bucket.bucket]}</span>
                    <span>{bucket.count}</span>
                  </div>
                  {bucket.tasks.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {bucket.tasks.slice(0, 3).map((task) => (
                        <li key={task.id} className="truncate">
                          {task.title}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationsMenu;
