import React from 'react';
import { PrioritizedTask, InboxItem } from '../types';
import { SourceIcon } from './SourceIcon';
import { CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface PriorityCardProps {
  task: PrioritizedTask;
  originalItem?: InboxItem;
  rank: number;
  onComplete: (id: string) => void;
}

export const PriorityCard: React.FC<PriorityCardProps> = ({ task, originalItem, rank, onComplete }) => {
  const getBorderColor = (score: number) => {
    if (score >= 9) return 'border-l-rose-500';
    if (score >= 7) return 'border-l-orange-500';
    return 'border-l-cyan-500';
  };

  return (
    <div className={`group relative bg-[#0b1221] rounded-xl p-6 shadow-lg shadow-black/20 hover:shadow-xl transition-all duration-300 border border-slate-800/60 border-l-4 ${getBorderColor(task.urgencyScore)}`}>
      
      {/* Rank Indicator */}
      <div className="absolute -left-3 -top-3 w-8 h-8 bg-[#020617] text-cyan-100 rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-black/50 border-2 border-slate-800">
        {rank}
      </div>

      <div className="flex justify-between items-start mb-3 pl-2">
        <div className="flex items-center gap-2">
          {originalItem && <SourceIcon type={originalItem.source} className="w-4 h-4" />}
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{task.category}</span>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${task.urgencyScore >= 8 ? 'bg-rose-950/40 text-rose-400 border border-rose-900/50' : 'bg-cyan-950/40 text-cyan-400 border border-cyan-900/50'}`}>
            <Clock size={12} /> Urgency: {task.urgencyScore}/10
          </span>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-100 mb-1 pl-2 leading-tight group-hover:text-cyan-100 transition-colors">{task.title}</h3>
      <p className="text-slate-400 text-sm mb-4 pl-2 line-clamp-2">{task.summary}</p>

      <div className="bg-[#0f172a] rounded-lg p-3 mb-4 ml-2 border border-slate-800/50 relative overflow-hidden">
        <div className="flex items-start gap-2 relative z-10">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-300 italic">
            <span className="font-semibold text-slate-200">Why: </span>{task.reason}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pl-2 mt-4 pt-4 border-t border-slate-800/50">
        <div className="flex flex-col">
           <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Next Action</span>
           <span className="text-xs font-medium text-cyan-300 flex items-center gap-1">
             {task.suggestedAction} <ArrowRight size={10} />
           </span>
        </div>
        
        <button 
          onClick={() => onComplete(task.id)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-all active:scale-95 shadow-md shadow-cyan-900/20"
        >
          <CheckCircle size={16} />
          Done
        </button>
      </div>
    </div>
  );
};