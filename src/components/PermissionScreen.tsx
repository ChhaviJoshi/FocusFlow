import React, { useState } from "react";
import {
  Shield,
  MessageSquare,
  CheckSquare,
  Check,
  AlertCircle,
  Lock,
  Mail,
} from "lucide-react";
import { disconnectIntegration, getCurrentUser } from "../services/api";

interface PermissionScreenProps {
  onContinue: () => void;
}

/**
 * Permission screen — updated for production auth.
 * Google is now connected during login OAuth (no separate connect button).
 * Slack and Jira are optional OAuth connections.
 */
export const PermissionScreen: React.FC<PermissionScreenProps> = ({
  onContinue,
}) => {
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(
    new Set(),
  );

  React.useEffect(() => {
    void refreshConnections();
  }, []);

  const refreshConnections = async () => {
    setLoadingConnections(true);
    setError(null);
    try {
      const data = await getCurrentUser();
      const connected = new Set(
        data.integrations
          .filter((integration) => integration.connected)
          .map((integration) => integration.provider),
      );
      setConnectedProviders(connected);
    } catch (err: any) {
      setError(err.message || "Failed to load integration state");
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleConnect = (provider: "slack" | "jira") => {
    window.location.href = provider === "slack" ? "/auth/slack" : "/auth/jira";
  };

  const handleDisconnect = async (provider: "slack" | "jira") => {
    setSaving(true);
    setError(null);
    try {
      await disconnectIntegration(provider);
      await refreshConnections();
    } catch (err: any) {
      setError(err.message || `Failed to disconnect ${provider}`);
    } finally {
      setSaving(false);
    }
  };

  const slackConnected = connectedProviders.has("slack");
  const jiraConnected = connectedProviders.has("jira");

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan-950/30 rounded-full mb-4 border border-cyan-500/20">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Connect Your Workspace
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Google is already connected during sign-in.
            <br />
            Optionally connect Slack and Jira for a complete picture.
          </p>
        </div>

        <div className="grid gap-4 mb-8">
          {/* Google — Auto-connected (read-only display) */}
          <div className="rounded-xl border bg-cyan-950/10 border-cyan-500/50 overflow-hidden">
            <div className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Mail className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-white">
                  Google Workspace
                </h3>
                <p className="text-sm text-slate-500">
                  Gmail & Calendar — Connected via OAuth
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-medium bg-emerald-950/40 px-2 py-1 rounded-full border border-emerald-800/50">
                  Auto-connected
                </span>
                <div className="w-6 h-6 rounded-full bg-cyan-500 border-2 border-cyan-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Slack */}
          <div
            className={`rounded-xl border transition-all duration-300 overflow-hidden ${slackConnected ? "bg-violet-950/10 border-violet-500/50" : "bg-[#0b1221] border-slate-800"}`}
          >
            <div className="p-5 flex items-center gap-4">
              <div
                className={`p-3 rounded-lg ${slackConnected ? "bg-violet-500/20 text-violet-400" : "bg-slate-800 text-slate-400"}`}
              >
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3
                  className={`font-semibold text-lg ${slackConnected ? "text-white" : "text-slate-300"}`}
                >
                  Slack
                </h3>
                <p className="text-sm text-slate-500">Channels & DMs</p>
              </div>
              {slackConnected ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-medium">
                    Connected
                  </span>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <button
                    onClick={() => handleDisconnect("slack")}
                    disabled={saving}
                    className="ml-2 px-3 py-1 rounded-md text-xs font-medium text-red-300 border border-red-900/70 bg-red-950/40 hover:bg-red-900/40 disabled:opacity-60"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect("slack")}
                  disabled={loadingConnections}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-60"
                >
                  Connect Slack
                </button>
              )}
            </div>
          </div>

          {/* Jira */}
          <div
            className={`rounded-xl border transition-all duration-300 overflow-hidden ${jiraConnected ? "bg-blue-950/10 border-blue-500/50" : "bg-[#0b1221] border-slate-800"}`}
          >
            <div className="p-5 flex items-center gap-4">
              <div
                className={`p-3 rounded-lg ${jiraConnected ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-400"}`}
              >
                <CheckSquare className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3
                  className={`font-semibold text-lg ${jiraConnected ? "text-white" : "text-slate-300"}`}
                >
                  Jira Software
                </h3>
                <p className="text-sm text-slate-500">Issues & Projects</p>
              </div>
              {jiraConnected ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-medium">
                    Connected
                  </span>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <button
                    onClick={() => handleDisconnect("jira")}
                    disabled={saving}
                    className="ml-2 px-3 py-1 rounded-md text-xs font-medium text-red-300 border border-red-900/70 bg-red-950/40 hover:bg-red-900/40 disabled:opacity-60"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect("jira")}
                  disabled={loadingConnections}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
                >
                  Connect Jira
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50 mb-4">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onContinue}
            className="w-full max-w-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
          >
            Continue to Dashboard
          </button>

          <div className="flex items-center gap-2 text-slate-600 text-xs">
            <Lock size={12} />
            <span>Tokens are encrypted and stored securely on the server.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
