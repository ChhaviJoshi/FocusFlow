import React from 'react';
import { Mail, MessageSquare, CheckSquare, Calendar } from 'lucide-react';
import { SourceType } from '../types';

interface SourceIconProps {
  type: SourceType;
  className?: string;
}

export const SourceIcon: React.FC<SourceIconProps> = ({ type, className = "w-5 h-5" }) => {
  switch (type) {
    case SourceType.EMAIL:
      return <Mail className={`text-cyan-400 ${className}`} />;
    case SourceType.SLACK:
      return <MessageSquare className={`text-violet-400 ${className}`} />;
    case SourceType.JIRA:
      return <CheckSquare className={`text-blue-400 ${className}`} />;
    case SourceType.CALENDAR:
      return <Calendar className={`text-orange-400 ${className}`} />;
    default:
      return <Mail className={`text-slate-400 ${className}`} />;
  }
};