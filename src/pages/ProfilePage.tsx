import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Mail, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationsMenu from "../components/NotificationsMenu";
import profileAvatar from "../assets/images/stitch/profile-avatar.jpg";
import profileHero from "../assets/images/stitch/profile-hero.jpg";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  secondaryEmails: string[];
  linkedAccounts: Record<string, unknown>;
  avatarUrl: string | null;
}

interface IntegrationItem {
  provider: string;
  connected: boolean;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({
    displayName: "",
    email: "",
    secondaryEmails: "",
    slackHandle: "",
    jiraHandle: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/auth/me", { credentials: "include" });
        if (!response.ok) {
          throw new Error("Failed to load profile");
        }
        const payload = (await response.json()) as {
          user: UserProfile;
          integrations: IntegrationItem[];
        };
        setUser(payload.user);
        setIntegrations(payload.integrations ?? []);
        setFormState({
          displayName: payload.user.displayName ?? payload.user.name,
          email: payload.user.email,
          secondaryEmails: payload.user.secondaryEmails?.join(", ") ?? "",
          slackHandle: String(payload.user.linkedAccounts?.slack ?? ""),
          jiraHandle: String(payload.user.linkedAccounts?.jira ?? ""),
        });
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      }
    };

    loadProfile();
  }, []);

  const integrationCards = useMemo(() => {
    const providers = new Set(integrations.map((integration) => integration.provider));
    const isGoogleConnected = providers.has("google");

    return [
      {
        name: "Gmail",
        status: isGoogleConnected ? "Connected" : "Offline",
        accent: isGoogleConnected ? "text-blue-600" : "text-slate-600",
        accentBg: isGoogleConnected ? "bg-blue-50" : "bg-slate-100",
      },
      {
        name: "Google Calendar",
        status: isGoogleConnected ? "Connected" : "Offline",
        accent: isGoogleConnected ? "text-blue-600" : "text-slate-600",
        accentBg: isGoogleConnected ? "bg-blue-50" : "bg-slate-100",
      },
      {
        name: "Slack",
        status: providers.has("slack") ? "Connected" : "Offline",
        accent: providers.has("slack") ? "text-emerald-600" : "text-slate-600",
        accentBg: providers.has("slack") ? "bg-emerald-50" : "bg-slate-100",
      },
      {
        name: "Jira",
        status: providers.has("jira") ? "Connected" : "Offline",
        accent: providers.has("jira") ? "text-amber-600" : "text-slate-600",
        accentBg: providers.has("jira") ? "bg-amber-50" : "bg-slate-100",
      },
    ];
  }, [integrations]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    const secondaryEmails = formState.secondaryEmails
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const linkedAccounts: Record<string, unknown> = {
      slack: formState.slackHandle.trim() || null,
      jira: formState.jiraHandle.trim() || null,
    };

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: formState.displayName,
          email: formState.email,
          secondaryEmails,
          linkedAccounts,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Update failed");
      }

      const payload = (await response.json()) as { user: UserProfile };
      setUser(payload.user);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-900/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              className="rounded-full bg-white/10 p-2"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="text-lg font-semibold tracking-tight">FocusFlow</div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationsMenu />
            <img
              src={user?.avatarUrl || profileAvatar}
              alt="User profile"
              className="h-10 w-10 rounded-full border border-white/40 object-cover"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {error ? (
          <div className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        <section className="flex flex-col items-center gap-8 md:flex-row md:items-end">
          <div className="relative">
            <img
              src={profileHero}
              alt="Profile hero"
              className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-md md:h-44 md:w-44"
            />
            <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
              ✓
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
              {user?.displayName || user?.name || ""}
            </h1>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <Mail className="h-4 w-4 text-blue-600" />
              {user?.email || ""}
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            onClick={() => setEditing((prev) => !prev)}
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
        </section>

        {editing ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Update Profile</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Display name
                </label>
                <input
                  type="text"
                  value={formState.displayName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      displayName: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Primary email
                </label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Secondary emails (comma separated)
                </label>
                <input
                  type="text"
                  value={formState.secondaryEmails}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      secondaryEmails: event.target.value,
                    }))
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Slack handle
                </label>
                <input
                  type="text"
                  value={formState.slackHandle}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      slackHandle: event.target.value,
                    }))
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Jira handle
                </label>
                <input
                  type="text"
                  value={formState.jiraHandle}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      jiraHandle: event.target.value,
                    }))
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">
              Integration Settings
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Manage your connected workflows and automated task syncs.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {integrationCards.map((integration) => (
              <div
                key={integration.name}
                className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {integration.name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {integration.status}
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${integration.accentBg} ${integration.accent}`}
                  >
                    {integration.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
