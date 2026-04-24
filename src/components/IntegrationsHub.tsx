import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckSquare,
  Link2,
  Mail,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import {
  disconnectIntegration,
  fetchInbox,
  getIntegrations,
  getJiraOAuthAuthUrl,
  getSlackOAuthAuthUrl,
} from "../services/api";

interface IntegrationsHubProps {
  userName: string;
}

interface IntegrationRecord {
  provider: string;
  connected: boolean;
}

export const IntegrationsHub: React.FC<IntegrationsHubProps> = ({
  userName,
}) => {
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [sources, setSources] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [integrationRes, inboxRes] = await Promise.all([
        getIntegrations(),
        fetchInbox(),
      ]);
      setIntegrations(integrationRes.integrations);
      setSources(inboxRes.sources || {});
    } catch (err: any) {
      setError(err.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const searchParams = new URLSearchParams(window.location.search);
    const connected = searchParams.get("connected");
    if (connected) {
      const label = connected === "google" ? "Gmail and Calendar" : connected;
      setNotice(`${label} connected successfully.`);
    }
  }, []);

  const googleConnected = useMemo(
    () =>
      integrations.some(
        (integration) =>
          integration.provider === "google" && integration.connected,
      ),
    [integrations],
  );

  const slackConnected = useMemo(
    () =>
      integrations.some(
        (integration) =>
          integration.provider === "slack" && integration.connected,
      ),
    [integrations],
  );

  const jiraConnected = useMemo(
    () =>
      integrations.some(
        (integration) =>
          integration.provider === "jira" && integration.connected,
      ),
    [integrations],
  );

  const handleOAuthConnect = async (provider: "slack" | "jira") => {
    setSyncing(true);
    setError(null);

    try {
      const response =
        provider === "slack"
          ? await getSlackOAuthAuthUrl()
          : await getJiraOAuthAuthUrl();

      window.location.href = response.authUrl;
    } catch (err: any) {
      setError(err.message || `Failed to start ${provider} OAuth`);
      setSyncing(false);
    }
  };

  const handleGoogleConnect = () => {
    window.location.href = "/auth/google";
  };

  const handleDisconnect = async (provider: string) => {
    setSyncing(true);
    setError(null);

    try {
      await disconnectIntegration(provider);
      await load();
    } catch (err: any) {
      setError(err.message || `Failed to disconnect ${provider}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshData = async () => {
    setSyncing(true);
    try {
      const inboxRes = await fetchInbox();
      setSources(inboxRes.sources || {});
    } catch (err: any) {
      setError(err.message || "Failed to sync integration data");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0F172A] text-[#111827] dark:text-[#FFFFFF]">
      <header className="border-b border-[#1E3A8A]/30 dark:border-[#E5E7EB] bg-[#1E3A8A] dark:bg-[#F3F4F6] text-[#FFFFFF] dark:text-[#1E3A8A] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="inline-flex items-center gap-2 text-sm text-white/80 dark:text-[#1E3A8A]/80 transition-colors hover:text-white dark:hover:text-[#1D4ED8]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="text-sm text-white/85 dark:text-[#1E3A8A]">
            {userName}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111827] dark:text-[#FFFFFF]">
              Integrations
            </h1>
            <p className="mt-1 text-sm text-[#111827]/70 dark:text-[#FFFFFF]/70">
              Authentication is handled separately. Authorize each data source
              below to ingest tasks.
            </p>
          </div>

          <button
            onClick={handleRefreshData}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] dark:border-[#374151] bg-[#FFFFFF] dark:bg-[#1F2937] px-3 py-2 text-sm text-[#111827] dark:text-[#FFFFFF] hover:opacity-90 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Data
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 rounded-lg border border-[#10B981]/30 dark:border-[#34D399]/40 bg-[#10B981]/12 dark:bg-[#34D399]/15 px-4 py-3 text-sm text-[#10B981] dark:text-[#34D399]">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <PlaceholderCard />
            <PlaceholderCard />
            <PlaceholderCard />
            <PlaceholderCard />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <IntegrationCard
              icon={<Mail className="h-5 w-5 text-cyan-300" />}
              title="Gmail"
              subtitle="Email prioritization and thread analysis"
              connected={googleConnected}
              dataCount={sources.gmail || 0}
              onConnect={handleGoogleConnect}
              actionLabel="Connect Gmail"
              disableDisconnect
            />

            <IntegrationCard
              icon={<Calendar className="h-5 w-5 text-orange-300" />}
              title="Google Calendar"
              subtitle="Upcoming events folded into priority planning"
              connected={googleConnected}
              dataCount={sources.calendar || 0}
              onConnect={handleGoogleConnect}
              actionLabel="Connect Calendar"
              disableDisconnect
            />

            <IntegrationCard
              icon={<MessageSquare className="h-5 w-5 text-[#3B82F6]" />}
              title="Slack"
              subtitle="Channel and message signals for urgent work"
              connected={slackConnected}
              dataCount={sources.slack || 0}
              onConnect={() => void handleOAuthConnect("slack")}
              onDisconnect={
                slackConnected ? () => handleDisconnect("slack") : undefined
              }
              actionLabel="Connect Slack"
            />

            <IntegrationCard
              icon={<CheckSquare className="h-5 w-5 text-[#10B981]" />}
              title="Jira"
              subtitle="Unresolved issues and blockers from your projects"
              connected={jiraConnected}
              dataCount={sources.jira || 0}
              onConnect={() => void handleOAuthConnect("jira")}
              onDisconnect={
                jiraConnected ? () => handleDisconnect("jira") : undefined
              }
              actionLabel="Connect Jira"
            />
          </div>
        )}

        <div className="mt-6 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#FFFFFF] dark:bg-[#1F2937] p-4 text-xs text-[#111827]/70 dark:text-[#FFFFFF]/70">
          <p className="mb-1 font-semibold uppercase tracking-wider text-[#111827] dark:text-[#FFFFFF]">
            Data ingest status
          </p>
          <p>
            FocusFlow pulls basic inbox/work-item data from connected sources
            whenever you sync here or open the dashboard. The feed then powers
            priority analysis and scoring.
          </p>
        </div>
      </main>
    </div>
  );
};

interface IntegrationCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  connected: boolean;
  dataCount: number;
  onConnect: () => void;
  onDisconnect?: () => void;
  actionLabel: string;
  disableDisconnect?: boolean;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  icon,
  title,
  subtitle,
  connected,
  dataCount,
  onConnect,
  onDisconnect,
  actionLabel,
  disableDisconnect = false,
}) => {
  return (
    <article className="rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#FFFFFF] dark:bg-[#1F2937] p-5 shadow-lg">
      <div className="mb-3 flex items-start justify-between">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F6] dark:bg-[#111827]">
          {icon}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            connected
              ? "border border-[#10B981]/35 dark:border-[#34D399]/40 bg-[#10B981]/12 dark:bg-[#34D399]/15 text-[#10B981] dark:text-[#34D399]"
              : "border border-[#D1D5DB] dark:border-[#4B5563] bg-[#F9FAFB] dark:bg-[#111827] text-[#111827]/70 dark:text-[#FFFFFF]/70"
          }`}
        >
          {connected ? (
            <Check className="h-3 w-3" />
          ) : (
            <Link2 className="h-3 w-3" />
          )}
          {connected ? "Connected" : "Not Connected"}
        </span>
      </div>

      <h3 className="text-base font-bold text-[#111827] dark:text-[#FFFFFF]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[#111827]/70 dark:text-[#FFFFFF]/70">
        {subtitle}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-[#111827]/65 dark:text-[#FFFFFF]/65">
          Synced items: {dataCount}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {connected ? (
          disableDisconnect ? (
            <span className="rounded-md border border-[#D1D5DB] dark:border-[#4B5563] bg-[#F9FAFB] dark:bg-[#111827] px-3 py-2 text-xs font-semibold text-[#111827]/70 dark:text-[#FFFFFF]/70">
              Managed by Google authorization
            </span>
          ) : (
            <button
              onClick={onDisconnect}
              disabled={!onDisconnect}
              className="rounded-md border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Disconnect
            </button>
          )
        ) : (
          <button
            onClick={onConnect}
            className="rounded-md bg-[#1D4ED8] dark:bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </article>
  );
};

const PlaceholderCard: React.FC = () => {
  return (
    <div className="h-44 animate-pulse rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#FFFFFF] dark:bg-[#1F2937]" />
  );
};
