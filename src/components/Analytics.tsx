import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnalysisResult, CategoryType } from '../types';

interface AnalyticsProps {
  data: AnalysisResult['distribution'];
  score: number;
  onSelectCategory: (category: CategoryType | null) => void;
  selectedCategory: CategoryType | null;
}

export const Analytics: React.FC<AnalyticsProps> = ({ data, score, onSelectCategory, selectedCategory }) => {
  const chartData = [
    { name: 'Urgent', value: data.urgent, color: '#f43f5e' },     // Rose-500
    { name: 'Important', value: data.important, color: '#06b6d4' }, // Cyan-500
    { name: 'Routine', value: data.routine, color: '#14b8a6' },   // Teal-500
    { name: 'Noise', value: data.noise, color: '#475569' },       // Slate-600
  ];

  return (
    <div className="bg-[#0b1221] p-6 rounded-xl shadow-lg shadow-black/40 border border-slate-800/60 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 z-10">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Workload Balance</h3>
        <div className="text-right">
           <span className="block text-[10px] text-slate-400 uppercase">Productivity Score</span>
           <span className="text-2xl font-bold text-cyan-400">{score}</span>
        </div>
      </div>

      <div className="h-52 w-full relative z-10">
         <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
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
                    stroke={selectedCategory === entry.name ? '#0f172a' : 'transparent'}
                    strokeWidth={selectedCategory === entry.name ? 4 : 0}
                    className={`transition-all duration-300 hover:opacity-90 outline-none ${selectedCategory && selectedCategory !== entry.name ? 'opacity-40' : 'opacity-100'}`}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
              />
            </PieChart>
         </ResponsiveContainer>
         {/* Center Text */}
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
               <span className="block text-3xl font-bold text-white">
                  {selectedCategory 
                    ? data[selectedCategory.toLowerCase() as keyof typeof data] 
                    : (data.urgent + data.important)}
               </span>
               <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                 {selectedCategory ? selectedCategory : 'Key Tasks'}
               </span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6 z-10">
        {chartData.map((item) => (
           <button 
             key={item.name} 
             onClick={() => onSelectCategory(selectedCategory === item.name ? null : item.name as CategoryType)}
             className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
               selectedCategory === item.name 
                 ? 'bg-slate-800/80 ring-1 ring-cyan-500 shadow-lg' 
                 : 'bg-slate-900/40 hover:bg-slate-800/60'
             }`}
           >
              <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: item.color }} />
              <span className={`text-xs font-medium ${selectedCategory === item.name ? 'text-white' : 'text-slate-400'}`}>{item.name}</span>
           </button>
        ))}
      </div>
      
      {/* Decorative background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};