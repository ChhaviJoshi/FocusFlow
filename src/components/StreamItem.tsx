import React from 'react';
import { InboxItem } from '../types';
import { SourceIcon } from './SourceIcon';

interface StreamItemProps {
  item: InboxItem;
  category?: string;
}

export const StreamItem: React.FC<StreamItemProps> = ({ item, category }) => {
  const timeDisplay = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getCategoryColor = (cat?: string) => {
    switch(cat) {
      case 'Urgent': return 'text-rose-400';
      case 'Important': return 'text-cyan-400';
      case 'Routine': return 'text-teal-400';
      case 'Noise': return 'text-slate-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-[#1e293b]/50 rounded-lg transition-colors cursor-pointer border-b border-slate-800/60 last:border-0 group">
      <div className="mt-1">
        <SourceIcon type={item.source} className="w-4 h-4 opacity-70" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <div className="flex items-center gap-2">
             <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-cyan-100 transition-colors">{item.sender}</h4>
             {category && (
               <span className={`text-[10px] uppercase font-bold tracking-wider ${getCategoryColor(category)}`}>
                 {category}
               </span>
             )}
          </div>
          <span className="text-[10px] text-slate-500 shrink-0 group-hover:text-slate-400 transition-colors">{timeDisplay}</span>
        </div>
        <p className="text-xs text-slate-300 font-medium truncate mt-0.5">{item.subject}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5 group-hover:text-slate-400 transition-colors">{item.content}</p>
      </div>
    </div>
  );
};