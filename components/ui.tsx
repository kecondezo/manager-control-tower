import React from 'react';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '../constants';
import { Priority, Status } from '../types';
import { Clock, X } from 'lucide-react';

export const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-200 ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${className}`}>
    {children}
  </span>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge className={`${config.color} border dark:opacity-90`}>
      {config.icon}
      {priority}
    </Badge>
  );
};

export const StatusBadge = ({ status }: { status: Status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <Badge className={`${config.color} dark:opacity-90`}>
      <span className="mr-1.5">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

export const RiskBadge = ({ overdue, blocked }: { overdue: boolean; blocked: boolean }) => {
  if (blocked) return <Badge className="bg-rose-600 text-white animate-pulse">BLOCKED</Badge>;
  if (overdue) return <Badge className="bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"><Clock className="w-3 h-3 mr-1" />Overdue</Badge>;
  return null;
};

export const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
    <div 
      className={`h-2 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'}`} 
      style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}
    />
  </div>
);

export const Button: React.FC<{ 
  children?: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; 
  size?: 'sm' | 'md' | 'icon';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick,
  disabled,
  type = "button"
}) => {
  const base = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm dark:bg-indigo-600 dark:hover:bg-indigo-500",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
  };

  const sizes = {
    sm: "text-xs px-2.5 py-1.5 rounded-md",
    md: "text-sm px-4 py-2 rounded-lg",
    icon: "p-2 rounded-lg"
  };

  return (
    <button 
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
    <div className="space-y-1">
        {label && <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>}
        <input 
            className={`w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white disabled:opacity-50 ${className}`}
            {...props}
        />
    </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className = '', children, ...props }) => (
    <div className="space-y-1">
        {label && <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>}
        <select 
            className={`w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white ${className}`}
            {...props}
        >
            {children}
        </select>
    </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => (
    <div className="space-y-1">
        {label && <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>}
        <textarea 
            className={`w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white resize-none ${className}`}
            {...props}
        />
    </div>
);
