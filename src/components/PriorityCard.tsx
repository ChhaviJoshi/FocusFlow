import React from "react";
import { PrioritizedTask, InboxItem } from "../types";
import { SourceIcon } from "./SourceIcon";
import { CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";

interface PriorityCardProps {
  task: PrioritizedTask;
  originalItem?: InboxItem;
  rank: number;
  onComplete: (id: string) => void;
}

export const PriorityCard: React.FC<PriorityCardProps> = ({
  task,
  originalItem,
  rank,
  onComplete,
}) => {
  const nativeUrl = originalItem?.nativeUrl || null;

  const handleCardClick = () => {
    if (!nativeUrl) {
      return;
    }

    window.open(nativeUrl, "_blank", "noopener,noreferrer");
  };

  const getBorderColor = (score: number) => {
    if (score >= 0.85) return "border-l-rose-500";
    if (score >= 0.65) return "border-l-orange-500";
    return "border-l-cyan-500";
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative bg-[#FFFFFF] dark:bg-[#1F2937] rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#E5E7EB] dark:border-[#374151] border-l-4 ${getBorderColor(task.urgencyScore)} ${nativeUrl ? "cursor-pointer" : ""}`}
    >
      {/* Rank Indicator */}
      <div className="absolute -left-3 -top-3 w-8 h-8 bg-[#1D4ED8] dark:bg-[#3B82F6] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white/20 dark:border-[#93C5FD]/30">
        {rank}
      </div>

      <div className="flex justify-between items-start mb-3 pl-2">
        <div className="flex items-center gap-2">
          {originalItem && (
            <SourceIcon type={originalItem.source} className="w-4 h-4" />
          )}
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            {task.category}
          </span>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${task.urgencyScore >= 0.8 ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-700/40" : "bg-[#1D4ED8]/10 dark:bg-[#3B82F6]/15 text-[#1D4ED8] dark:text-[#3B82F6] border border-[#1D4ED8]/30 dark:border-[#3B82F6]/35"}`}
          >
            <Clock size={12} /> Urgency: {Math.round(task.urgencyScore * 100)}%
          </span>
        </div>
      </div>

      <h3 className="text-lg font-bold text-[#111827] dark:text-[#FFFFFF] mb-1 pl-2 leading-tight group-hover:text-[#1D4ED8] dark:group-hover:text-[#3B82F6] transition-colors">
        {task.title}
      </h3>
      <p className="text-[#111827]/70 dark:text-[#FFFFFF]/70 text-sm mb-4 pl-2 line-clamp-2">
        {task.summary}
      </p>

      <div className="bg-[#F9FAFB] dark:bg-[#111827] rounded-lg p-3 mb-4 ml-2 border border-[#E5E7EB] dark:border-[#374151] relative overflow-hidden">
        <div className="flex items-start gap-2 relative z-10">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-[#111827]/75 dark:text-[#FFFFFF]/75 italic">
            <span className="font-semibold text-[#111827] dark:text-[#FFFFFF]">
              Why:{" "}
            </span>
            {task.reason}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pl-2 mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#374151]">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#111827]/60 dark:text-[#FFFFFF]/60 uppercase font-bold tracking-wider">
            Next Action
          </span>
          <span className="text-xs font-medium text-[#1D4ED8] dark:text-[#3B82F6] flex items-center gap-1">
            {task.suggestedAction} <ArrowRight size={10} />
          </span>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onComplete(task.id);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D4ED8] dark:bg-[#3B82F6] hover:opacity-90 text-white text-sm font-medium rounded-lg transition-all active:scale-95 shadow-md"
        >
          <CheckCircle size={16} />
          Done
        </button>
      </div>
    </div>
  );
};
