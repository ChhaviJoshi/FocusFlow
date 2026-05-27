import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Brain,
  RefreshCw,
  Layers,
  Inbox,
  Filter,
  X,
  CheckCircle,
  LogOut,
  Settings,
  Trophy,
  Moon,
  Sun,
} from "lucide-react";
import { InboxItem, AnalysisResult, CategoryType, SourceType } from "../types";
import {
  fetchInbox,
  analyzeItems,
  updateTaskByOriginalItemId,
  getTasks,
  logout,
} from "../services/api";
import { PriorityCard } from "./PriorityCard";
import { StreamItem } from "./StreamItem";
import { Analytics } from "./Analytics";

interface DashboardProps {
  userName: string;
  integrations: Array<{ provider: string; connected: boolean }>;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  userName,
  integrations,
  theme,
  onToggleTheme,
}) => {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedResult, setCachedResult] = useState<boolean>(false);
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({
    gmail: 0,
    calendar: 0,
    jira: 0,
    slack: 0,
  });
  const [selectedSource, setSelectedSource] = useState<SourceType | "ALL">(
    "ALL",
  );
  const [showIntegrationsModal, setShowIntegrationsModal] =
    useState<boolean>(false);

  // Filtering State
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(
    null,
  );
  const streamEndRef = useRef<HTMLDivElement>(null);

  const initializeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch inbox and known task states together so we can hide completed work.
      const [inboxResponse, taskResponse] = await Promise.all([
        fetchInbox(),
        getTasks(undefined, 500),
      ]);
      const items = inboxResponse.items as InboxItem[];
      setInboxItems(items);
      setSourceCounts(
        inboxResponse.sources || { gmail: 0, calendar: 0, jira: 0, slack: 0 },
      );

      const tasks = taskResponse.tasks || [];
      const completedOrDismissed = new Set(
        tasks
          .filter(
            (task) =>
              task.status === "completed" || task.status === "dismissed",
          )
          .map((task) => task.original_item_id)
          .filter((id): id is string => Boolean(id)),
      );
      setCompletedCount(
        tasks.filter((task) => task.status === "completed").length,
      );
      setPendingCount(tasks.filter((task) => task.status === "pending").length);

      const analyzableItems = items.filter(
        (item) => !completedOrDismissed.has(item.id),
      );

      if (analyzableItems.length === 0) {
        setAnalysis(null);
        setLoading(false);
        return;
      }

      // 2. Analyze non-completed items with Gemini via backend.
      const analysisResponse = await analyzeItems(analyzableItems);
      const result = analysisResponse.result as AnalysisResult;
      const filteredResult: AnalysisResult = {
        ...result,
        topPriorities: result.topPriorities.filter(
          (task) => !completedOrDismissed.has(task.originalItemId),
        ),
      };
      setAnalysis(filteredResult);
      setCachedResult(analysisResponse.cached);
    } catch (err: any) {
      console.error("Dashboard Error:", err);
      if (err.message === "analysis_unavailable") {
        setError(
          "AI analysis is temporarily unavailable. Please try again shortly.",
        );
      } else {
        setError(err.message || "Failed to load data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    initializeData();
  }, []);

  // Navigation Effect: Scroll to stream when category selected
  useEffect(() => {
    if (selectedCategory && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedCategory]);

  const handleCompleteTask = async (taskId: string, originalItemId: string) => {
    if (!analysis) return;

    try {
      // Persist completion to backend using original inbox item ID.
      await updateTaskByOriginalItemId(originalItemId, "completed");
    } catch {
      console.warn("Failed to persist task completion");
      return;
    }

    setAnalysis((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        topPriorities: prev.topPriorities.filter((task) => task.id !== taskId),
      };
    });
    setCompletedCount((current) => current + 1);
    setPendingCount((current) => Math.max(0, current - 1));
  };

  const handleCategorySelect = (category: CategoryType | null) => {
    setSelectedCategory(category);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch {
      // Force reload even if API call fails
      window.location.href = "/";
    }
  };

  const getFilteredInbox = () => {
    let sourceFiltered = inboxItems;

    if (selectedSource !== "ALL") {
      sourceFiltered = sourceFiltered.filter(
        (item) => item.source === selectedSource,
      );
    }

    if (!analysis || !selectedCategory) return sourceFiltered;

    const categoryItemIds = new Set(
      analysis.itemClassifications
        .filter((c) => c.category === selectedCategory)
        .map((c) => c.itemId),
    );

    return sourceFiltered.filter((item) => categoryItemIds.has(item.id));
  };

  const getCategoryForItem = (id: string) => {
    return analysis?.itemClassifications.find((c) => c.itemId === id)?.category;
  };

  const sourceOptions: Array<{
    label: string;
    value: SourceType | "ALL";
    count: number;
  }> = [
    { label: "All", value: "ALL", count: inboxItems.length },
    { label: "Gmail", value: SourceType.EMAIL, count: sourceCounts.gmail || 0 },
    {
      label: "Calendar",
      value: SourceType.CALENDAR,
      count: sourceCounts.calendar || 0,
    },
    { label: "Jira", value: SourceType.JIRA, count: sourceCounts.jira || 0 },
    { label: "Slack", value: SourceType.SLACK, count: sourceCounts.slack || 0 },
  ];

  const completionRate =
    completedCount + pendingCount > 0
      ? Math.round((completedCount / (completedCount + pendingCount)) * 100)
      : 0;
  const renderedPriorityCount = analysis?.topPriorities.length || 0;

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0F172A] text-[#111827] dark:text-[#FFFFFF] font-sans pb-10 selection:bg-[#1D4ED8]/30 dark:selection:bg-[#3B82F6]/30">
      {/* Navigation / Header */}
      <nav className="bg-[#1E3A8A] dark:bg-[#F3F4F6] text-[#FFFFFF] dark:text-[#1E3A8A] backdrop-blur-md border-b border-[#1E3A8A]/40 dark:border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1D4ED8] dark:bg-[#3B82F6] rounded-lg flex items-center justify-center shadow-lg">
                <Brain className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white dark:text-[#1E3A8A]">
                FocusFlow
              </span>
              {cachedResult && (
                <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981]/20 dark:bg-[#34D399]/20 border border-[#10B981]/50 dark:border-[#34D399]/50 text-[10px] text-[#10B981] dark:text-[#34D399] font-medium">
                  Cached
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-2 text-sm font-medium text-white/85 dark:text-[#1E3A8A] hover:text-white dark:hover:text-[#1D4ED8] transition-colors"
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={initializeData}
                disabled={loading}
                className="flex items-center gap-2 text-sm font-medium text-white/80 dark:text-[#1E3A8A]/80 hover:text-white dark:hover:text-[#1D4ED8] transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">
                  {loading ? "Analyzing..." : "Refresh"}
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-white/70 dark:text-[#1E3A8A]/70 hover:text-white dark:hover:text-[#1D4ED8] transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
              <button
                onClick={() => {
                  window.location.href = "/settings/integrations";
                }}
                className="flex items-center gap-2 text-sm font-medium text-white/70 dark:text-[#1E3A8A]/70 hover:text-white dark:hover:text-[#1D4ED8] transition-colors"
                title="Integrations"
              >
                <Settings size={16} />
              </button>
              <div className="w-8 h-8 rounded-full bg-[#1D4ED8] dark:bg-[#DBEAFE] border border-white/20 dark:border-[#BFDBFE] flex items-center justify-center text-xs font-bold text-white dark:text-[#1E3A8A] shadow-inner">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Top Section: Header text */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#111827] dark:text-[#FFFFFF] mb-2">
            Good Morning, {userName.split(" ")[0]}.
          </h1>
          <p className="text-[#111827]/75 dark:text-[#FFFFFF]/75 text-sm sm:text-base">
            FocusFlow has analyzed{" "}
            <span className="font-semibold text-[#1D4ED8] dark:text-[#3B82F6]">
              {renderedPriorityCount} items
            </span>{" "}
            from your connected sources.
          </p>
          {/* Source summary */}
          <div className="flex flex-wrap gap-2 mt-2">
            {integrations.map((i) => (
              <span
                key={i.provider}
                className="text-[10px] uppercase tracking-wider font-medium text-[#111827]/70 dark:text-[#FFFFFF]/70 bg-[#FFFFFF] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] px-2 py-0.5 rounded-full"
              >
                {i.provider}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6 rounded-r-md backdrop-blur-sm">
            <p className="text-red-700 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {analysis?.lowConfidence && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md backdrop-blur-sm">
            <p className="text-amber-700 dark:text-amber-200 text-sm">
              AI confidence is low - results may not reflect actual priorities.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column: The Priority Feed */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#111827] dark:text-[#FFFFFF]">
                <Layers
                  size={20}
                  className="text-[#1D4ED8] dark:text-[#3B82F6]"
                />
                Top Priorities
              </h2>
              <span className="text-xs bg-[#1D4ED8]/15 dark:bg-[#3B82F6]/15 text-[#1D4ED8] dark:text-[#3B82F6] border border-[#1D4ED8]/40 dark:border-[#3B82F6]/40 px-2 py-1 rounded-full font-medium">
                AI Optimized
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-48 bg-[#FFFFFF] dark:bg-[#1F2937] rounded-xl animate-pulse shadow-sm border border-[#E5E7EB] dark:border-[#374151]"
                  />
                ))}
              </div>
            ) : analysis?.topPriorities.length === 0 ? (
              <div className="bg-[#FFFFFF] dark:bg-[#1F2937] rounded-xl p-10 text-center shadow-sm border border-[#E5E7EB] dark:border-[#374151]">
                <CheckCircle
                  className="mx-auto text-[#10B981] dark:text-[#34D399] mb-4"
                  size={48}
                />
                <h3 className="text-lg font-bold text-[#111827] dark:text-[#FFFFFF]">
                  All Caught Up!
                </h3>
                <p className="text-[#111827]/70 dark:text-[#FFFFFF]/70">
                  No urgent priorities found in your stream.
                </p>
              </div>
            ) : (
              analysis?.topPriorities.map((task, index) => {
                const original = inboxItems.find(
                  (i) => i.id === task.originalItemId,
                );
                return (
                  <PriorityCard
                    key={task.id}
                    task={task}
                    rank={index + 1}
                    originalItem={original}
                    onComplete={(taskId) =>
                      handleCompleteTask(taskId, task.originalItemId)
                    }
                  />
                );
              })
            )}
          </div>

          {/* Right Column: Context & Stream */}
          <div className="lg:col-span-5 space-y-6 lg:space-y-8">
            {/* Completed Work */}
            <div className="bg-[#FFFFFF] dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#111827] dark:text-[#FFFFFF] uppercase tracking-wide flex items-center gap-2">
                  <Trophy
                    size={14}
                    className="text-[#10B981] dark:text-[#34D399]"
                  />
                  Work Done
                </h3>
                <span className="text-lg font-bold text-[#10B981] dark:text-[#34D399]">
                  {completionRate}%
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-[#E5E7EB] dark:bg-[#111827] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#10B981] to-[#1D4ED8] dark:from-[#34D399] dark:to-[#3B82F6] transition-all duration-300"
                  style={{ width: `${completionRate}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#F9FAFB] dark:bg-[#111827] rounded-lg border border-[#E5E7EB] dark:border-[#374151] px-3 py-2">
                  <p className="text-[#111827]/65 dark:text-[#FFFFFF]/70 uppercase tracking-wider">
                    Completed
                  </p>
                  <p className="text-[#10B981] dark:text-[#34D399] text-lg font-bold">
                    {completedCount}
                  </p>
                </div>
                <div className="bg-[#F9FAFB] dark:bg-[#111827] rounded-lg border border-[#E5E7EB] dark:border-[#374151] px-3 py-2">
                  <p className="text-[#111827]/65 dark:text-[#FFFFFF]/70 uppercase tracking-wider">
                    Pending
                  </p>
                  <p className="text-[#1D4ED8] dark:text-[#3B82F6] text-lg font-bold">
                    {pendingCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Analytics Card */}
            <div className="h-[420px]">
              {analysis ? (
                <Analytics
                  data={analysis.distribution}
                  score={analysis.productivityScore}
                  onSelectCategory={handleCategorySelect}
                  selectedCategory={selectedCategory}
                />
              ) : (
                <div className="h-full bg-[#FFFFFF] dark:bg-[#1F2937] rounded-xl animate-pulse border border-[#E5E7EB] dark:border-[#374151]" />
              )}
            </div>

            {/* Incoming Stream */}
            <div
              ref={streamEndRef}
              className="bg-[#FFFFFF] dark:bg-[#1F2937] rounded-xl shadow-lg border border-[#E5E7EB] dark:border-[#374151] overflow-hidden flex flex-col max-h-[600px] scroll-mt-24"
            >
              <div className="p-4 border-b border-[#E5E7EB] dark:border-[#374151] bg-[#F9FAFB] dark:bg-[#111827] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-[#111827] dark:text-[#FFFFFF] text-sm flex items-center gap-2">
                    <Inbox
                      size={16}
                      className="text-[#1D4ED8] dark:text-[#3B82F6]"
                    />
                    {selectedCategory
                      ? `${selectedCategory} Items`
                      : "Incoming Stream"}
                  </h3>
                  {selectedCategory && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#1D4ED8] dark:bg-[#3B82F6] text-white rounded-full border border-[#1D4ED8]/30 dark:border-[#3B82F6]/30 shadow-sm">
                      Filtered
                    </span>
                  )}
                </div>
                {selectedCategory ? (
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedSource("ALL");
                    }}
                    className="text-xs text-[#111827]/70 dark:text-[#FFFFFF]/70 hover:text-[#111827] dark:hover:text-[#FFFFFF] flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] px-2 py-1 rounded-lg transition-colors"
                  >
                    <X size={12} /> Clear
                  </button>
                ) : (
                  <button className="text-[#111827]/60 dark:text-[#FFFFFF]/60 hover:text-[#1D4ED8] dark:hover:text-[#3B82F6] transition-colors">
                    <Filter size={14} />
                  </button>
                )}
              </div>

              <div className="px-4 pt-3 pb-2 border-b border-[#E5E7EB] dark:border-[#374151] bg-[#F9FAFB] dark:bg-[#111827] flex flex-wrap gap-2">
                {sourceOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setSelectedSource(option.value)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                      selectedSource === option.value
                        ? "bg-[#1D4ED8]/15 dark:bg-[#3B82F6]/20 border-[#1D4ED8]/40 dark:border-[#3B82F6]/40 text-[#1D4ED8] dark:text-[#3B82F6]"
                        : "bg-[#FFFFFF] dark:bg-[#1F2937] border-[#E5E7EB] dark:border-[#374151] text-[#111827]/70 dark:text-[#FFFFFF]/70 hover:text-[#111827] dark:hover:text-[#FFFFFF]"
                    }`}
                  >
                    {option.label} ({option.count})
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {getFilteredInbox().length === 0 ? (
                  <div className="p-8 text-center text-[#111827]/60 dark:text-[#FFFFFF]/60 text-sm">
                    {selectedCategory
                      ? `No ${selectedCategory.toLowerCase()} items found.`
                      : "No items in your inbox yet."}
                  </div>
                ) : (
                  getFilteredInbox().map((item) => (
                    <StreamItem
                      key={item.id}
                      item={item}
                      category={getCategoryForItem(item.id)}
                    />
                  ))
                )}
              </div>

              <div className="p-3 border-t border-[#E5E7EB] dark:border-[#374151] bg-[#F9FAFB] dark:bg-[#111827] text-center">
                <button
                  onClick={() => setShowIntegrationsModal(true)}
                  className="text-xs text-[#1D4ED8] dark:text-[#3B82F6] font-medium hover:opacity-80 transition-colors"
                >
                  View All Integrations
                </button>
              </div>
            </div>
          </div>
        </div>

        {showIntegrationsModal && (
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-xl shadow-2xl">
              <div className="p-4 border-b border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between">
                <h3 className="font-semibold text-[#111827] dark:text-[#FFFFFF]">
                  Connected Integrations
                </h3>
                <button
                  onClick={() => setShowIntegrationsModal(false)}
                  className="text-[#111827]/70 dark:text-[#FFFFFF]/70 hover:text-[#111827] dark:hover:text-[#FFFFFF]"
                  aria-label="Close integrations"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-2">
                {integrations.map((integration) => {
                  const providerKey =
                    integration.provider.toLowerCase() === "google"
                      ? "gmail"
                      : integration.provider.toLowerCase();
                  const count = sourceCounts[providerKey] || 0;

                  return (
                    <div
                      key={integration.provider}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F9FAFB] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#111827] dark:text-[#FFFFFF] capitalize">
                          {integration.provider}
                        </p>
                        <p className="text-[11px] text-[#111827]/65 dark:text-[#FFFFFF]/65">
                          {count} item(s) in current stream
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${integration.connected ? "bg-[#10B981]/20 dark:bg-[#34D399]/20 text-[#10B981] dark:text-[#34D399] border border-[#10B981]/40 dark:border-[#34D399]/40" : "bg-[#E5E7EB] dark:bg-[#374151] text-[#111827]/70 dark:text-[#FFFFFF]/70 border border-[#D1D5DB] dark:border-[#4B5563]"}`}
                      >
                        {integration.connected ? "Connected" : "Not Connected"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
