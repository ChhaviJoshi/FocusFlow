import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationsMenu from "../components/NotificationsMenu";
import integrationsAvatar from "../assets/images/stitch/integrations-avatar.jpg";

interface IntegrationItem {
  provider: string;
  connected: boolean;
}

const IntegrationsModalPage = () => {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const response = await fetch("/api/integrations", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to load integrations");
        }
        const payload = (await response.json()) as {
          integrations: IntegrationItem[];
        };
        setIntegrations(payload.integrations ?? []);
      } catch (err: any) {
        setError(err.message || "Failed to load integrations");
      }
    };

    loadIntegrations();
  }, []);

  const providers = useMemo(
    () => new Set(integrations.map((integration) => integration.provider)),
    [integrations],
  );

  const items = [
    {
      name: "Google",
      provider: "google",
      connected: providers.has("google"),
      icon: Mail,
    },
    {
      name: "Slack",
      provider: "slack",
      connected: providers.has("slack"),
      icon: MessageCircle,
    },
    {
      name: "Jira",
      provider: "jira",
      connected: providers.has("jira"),
      icon: CheckCircle2,
    },
  ];

  const handleConnect = (provider: string) => {
    if (provider === "google") {
      window.location.href = "/auth/google";
      return;
    }
    window.location.href = `/auth/${provider}`;
  };

  const handleDisconnect = async (provider: string) => {
    if (provider === "google") return;
    const response = await fetch(`/api/integrations/${provider}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (response.ok) {
      setIntegrations((prev) =>
        prev.filter((item) => item.provider !== provider),
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <aside className="hidden min-h-screen w-64 flex-col border-r border-slate-100 bg-white px-6 py-8 md:flex">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">FocusFlow</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
              Kinetic Precision
            </p>
          </div>
          <nav className="mt-10 space-y-2 text-sm text-slate-600">
            <button
              className="rounded-xl px-4 py-3 text-left hover:bg-slate-50"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
            <div className="rounded-xl bg-blue-600 px-4 py-3 text-white">
              Integrations
            </div>
            <div className="rounded-xl px-4 py-3 hover:bg-slate-50">
              Analytics
            </div>
          </nav>
        </aside>

        <main className="flex-1 px-6 py-10">
          <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-semibold text-slate-900">
                Integrations Hub
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Manage your kinetic workflow connections.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationsMenu />
              <img
                src={integrationsAvatar}
                alt="User profile"
                className="h-12 w-12 rounded-full border border-slate-200 object-cover"
              />
            </div>
          </header>
          {error ? (
            <div className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          ) : null}
        </main>
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Connected Integrations
                </p>
                <p className="text-xs text-slate-500">Live status</p>
              </div>
            </div>
            <button
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              onClick={() => navigate("/dashboard")}
            >
              Close
            </button>
          </div>
          <div className="space-y-3 px-6 py-5">
            {items.map((item) => (
              <div
                key={item.provider}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                      item.connected
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {item.connected ? "Active" : "Offline"}
                  </span>
                  {item.provider === "google" ? (
                    <button
                      className="text-xs font-semibold text-blue-600"
                      onClick={() => handleConnect(item.provider)}
                    >
                      Reconnect
                    </button>
                  ) : item.connected ? (
                    <button
                      className="text-xs font-semibold text-rose-600"
                      onClick={() => handleDisconnect(item.provider)}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      className="text-xs font-semibold text-blue-600"
                      onClick={() => handleConnect(item.provider)}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-6 py-5">
            <button
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm"
              onClick={() => navigate("/dashboard")}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsModalPage;
