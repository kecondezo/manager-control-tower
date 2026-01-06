import React from 'react';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  PlayCircle, 
  StopCircle,
  AlertTriangle,
  ArrowUp
} from 'lucide-react';
import { Priority, Status } from './types';

export const PRIORITY_CONFIG: Record<Priority, { label: string, color: string, icon: React.ReactNode }> = {
  [Priority.P0]: { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="w-3 h-3 mr-1" /> },
  [Priority.P1]: { label: 'High', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <ArrowUp className="w-3 h-3 mr-1" /> },
  [Priority.P2]: { label: 'Medium', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: null },
  [Priority.P3]: { label: 'Low', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: null },
};

export const STATUS_CONFIG: Record<Status, { label: string, color: string, icon: React.ReactNode }> = {
  [Status.NotStarted]: { label: 'Not Started', color: 'bg-slate-100 text-slate-600', icon: <StopCircle className="w-3 h-3" /> },
  [Status.InProgress]: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: <PlayCircle className="w-3 h-3" /> },
  [Status.Blocked]: { label: 'Blocked', color: 'bg-rose-100 text-rose-700', icon: <AlertCircle className="w-3 h-3" /> },
  [Status.Done]: { label: 'Done', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
};

export const TEAM_COLORS: Record<string, string> = {
  'team_ops': 'bg-blue-600',
  'team_tech': 'bg-violet-600',
  'team_personal': 'bg-emerald-500',
  'default': 'bg-slate-500'
};
