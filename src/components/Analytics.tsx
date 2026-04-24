import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AnalysisResult, CategoryType } from "../types";

interface AnalyticsProps {
  data: AnalysisResult["distribution"];
  score: number;
  onSelectCategory: (category: CategoryType | null) => void;
  selectedCategory: CategoryType | null;
}

export const Analytics: React.FC<AnalyticsProps> = ({
  data,
  score,
  onSelectCategory,
  selectedCategory,
}) => {
  const chartData = [
    { name: "Urgent", value: data.urgent, color: "#f43f5e" }, // Rose-500
    { name: "Important", value: data.important, color: "#1D4ED8" }, // Fleet Blue
    { name: "Routine", value: data.routine, color: "#10B981" }, // Fleet Success
    { name: "Noise", value: data.noise, color: "#475569" }, // Slate-600
  ];

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1F2937] p-6 rounded-xl shadow-lg border border-[#E5E7EB] dark:border-[#374151] h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 z-10">
        <h3 className="text-sm font-bold text-[#111827] dark:text-[#FFFFFF] uppercase tracking-wide">
          Workload Balance
        </h3>
        <div className="text-right">
          <span className="block text-[10px] text-[#111827]/60 dark:text-[#FFFFFF]/60 uppercase">
            Productivity Score
          </span>
          <span className="text-2xl font-bold text-[#1D4ED8] dark:text-[#3B82F6]">
            {score}
          </span>
        </div>
      </div>

      <div className="h-64 w-full relative z-10 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={4}
              dataKey="value"
              onClick={(data) => {
                const category = data.name as CategoryType;
                if (selectedCategory === category) {
                  onSelectCategory(null);
                } else {
                  onSelectCategory(category);
                }
              }}
              className="cursor-pointer outline-none"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={
                    selectedCategory === entry.name ? "#0f172a" : "transparent"
                  }
                  strokeWidth={selectedCategory === entry.name ? 4 : 0}
                  className={`transition-all duration-300 hover:opacity-90 outline-none ${selectedCategory && selectedCategory !== entry.name ? "opacity-40" : "opacity-100"}`}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                borderColor: "#374151",
                borderRadius: "8px",
                color: "#f8fafc",
              }}
              itemStyle={{ color: "#f8fafc" }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <span className="block text-3xl font-bold text-[#111827] dark:text-[#FFFFFF]">
              {selectedCategory
                ? data[selectedCategory.toLowerCase() as keyof typeof data]
                : data.urgent + data.important}
            </span>
            <span className="text-[10px] text-[#111827]/60 dark:text-[#FFFFFF]/60 uppercase tracking-wider">
              {selectedCategory ? selectedCategory : "Key Tasks"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6 z-10">
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
            selectedCategory === null
              ? "bg-[#1D4ED8]/15 dark:bg-[#3B82F6]/20 ring-1 ring-[#1D4ED8]/45 dark:ring-[#3B82F6]/45 shadow-lg"
              : "bg-[#F9FAFB] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] hover:opacity-90"
          }`}
        >
          <span
            className={`text-xs font-medium ${selectedCategory === null ? "text-[#1D4ED8] dark:text-[#3B82F6]" : "text-[#111827]/70 dark:text-[#FFFFFF]/70"}`}
          >
            All
          </span>
        </button>
        {chartData.map((item) => (
          <button
            key={item.name}
            onClick={() =>
              onSelectCategory(
                selectedCategory === item.name
                  ? null
                  : (item.name as CategoryType),
              )
            }
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              selectedCategory === item.name
                ? "bg-[#1D4ED8]/15 dark:bg-[#3B82F6]/20 ring-1 ring-[#1D4ED8]/45 dark:ring-[#3B82F6]/45 shadow-lg"
                : "bg-[#F9FAFB] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] hover:opacity-90"
            }`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
              style={{ backgroundColor: item.color }}
            />
            <span
              className={`text-xs font-medium ${selectedCategory === item.name ? "text-[#1D4ED8] dark:text-[#3B82F6]" : "text-[#111827]/70 dark:text-[#FFFFFF]/70"}`}
            >
              {item.name}
            </span>
          </button>
        ))}
      </div>

      {/* Decorative background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#1D4ED8]/10 dark:bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#10B981]/10 dark:bg-[#34D399]/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
