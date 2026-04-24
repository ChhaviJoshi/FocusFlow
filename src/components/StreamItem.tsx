import React from "react";
import { InboxItem } from "../types";
import { SourceIcon } from "./SourceIcon";

interface StreamItemProps {
  item: InboxItem;
  category?: string;
}

export const StreamItem: React.FC<StreamItemProps> = ({ item, category }) => {
  const timeDisplay = new Date(item.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sourceLabel = item.source.toLowerCase();

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case "Urgent":
        return "text-rose-400";
      case "Important":
        return "text-cyan-400";
      case "Routine":
        return "text-teal-400";
      case "Noise":
        return "text-slate-500";
      default:
        return "text-slate-500";
    }
  };

  return (
    <div
      onClick={() => {
        if (item.nativeUrl) {
          window.open(item.nativeUrl, "_blank", "noopener,noreferrer");
        }
      }}
      className="flex items-start gap-3 p-4 hover:bg-[#F3F4F6] dark:hover:bg-[#111827] rounded-lg transition-colors cursor-pointer border-b border-[#E5E7EB] dark:border-[#374151] last:border-0 group"
    >
      <div className="mt-1">
        <SourceIcon type={item.source} className="w-4 h-4 opacity-70" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-[#111827] dark:text-[#FFFFFF] truncate group-hover:text-[#1D4ED8] dark:group-hover:text-[#3B82F6] transition-colors">
              {item.sender}
            </h4>
            <span className="text-[10px] uppercase tracking-wider text-[#111827]/60 dark:text-[#FFFFFF]/65 px-1.5 py-0.5 rounded bg-[#FFFFFF] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              {sourceLabel}
            </span>
            {category && (
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${getCategoryColor(category)}`}
              >
                {category}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#111827]/55 dark:text-[#FFFFFF]/55 shrink-0 group-hover:text-[#111827]/75 dark:group-hover:text-[#FFFFFF]/75 transition-colors">
            {timeDisplay}
          </span>
        </div>
        <p className="text-xs text-[#111827]/85 dark:text-[#FFFFFF]/85 font-medium truncate mt-0.5">
          {item.subject}
        </p>
        <p className="text-xs text-[#111827]/60 dark:text-[#FFFFFF]/60 truncate mt-0.5 group-hover:text-[#111827]/80 dark:group-hover:text-[#FFFFFF]/80 transition-colors">
          {item.content}
        </p>
      </div>
    </div>
  );
};
