'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, Bell, Info, CheckCircle2, AlertCircle } from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'error' | 'reminder';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    
    // Reminders stay for 10 seconds as requested
    const duration = type === 'reminder' ? 10000 : 5000;
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-10 right-10 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              relative flex items-center gap-4 p-3 pr-4 rounded-xl shadow-xl border-2 animate-toast-in pointer-events-auto overflow-hidden
              ${toast.type === 'reminder' || toast.type === 'warning' ? 'bg-[#fffbeb] border-[#fef3c7] text-[#92400e]' : ''}
              ${toast.type === 'success' ? 'bg-[#f0fdf4] border-[#dcfce7] text-[#166534]' : ''}
              ${toast.type === 'error' ? 'bg-[#fef2f2] border-[#fee2e2] text-[#991b1b]' : ''}
              ${toast.type === 'info' ? 'bg-[#eff6ff] border-[#dbeafe] text-[#1e40af]' : ''}
            `}
          >
            {/* Boxed Icon Wrapper */}
            <div className={`
              flex items-center justify-center w-11 h-11 rounded-lg shrink-0 shadow-sm
              ${toast.type === 'reminder' || toast.type === 'warning' ? 'bg-[#f59e0b] text-white' : ''}
              ${toast.type === 'success' ? 'bg-[#22c55e] text-white' : ''}
              ${toast.type === 'error' ? 'bg-[#ef4444] text-white' : ''}
              ${toast.type === 'info' ? 'bg-[#3b82f6] text-white' : ''}
            `}>
              {toast.type === 'reminder' && <Bell className="w-6 h-6 animate-bounce" />}
              {toast.type === 'warning' && <AlertCircle className="w-6 h-6" />}
              {toast.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
              {toast.type === 'error' && <AlertCircle className="w-6 h-6" />}
              {toast.type === 'info' && <Info className="w-6 h-6" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-sm font-bold leading-tight">{toast.message}</p>
            </div>

            {/* Vertical Separator */}
            <div className="w-px h-8 bg-black/10 mx-2" />

            <button 
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1.5 hover:bg-black/5 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4 opacity-40 hover:opacity-100" />
            </button>

            {/* Progress bar for reminders only (subtle line at the bottom) */}
            {toast.type === 'reminder' && (
              <div className="absolute bottom-0 left-0 h-1 bg-[#f59e0b]/30 w-full">
                <div className="h-full bg-[#f59e0b] animate-toast-progress-10" />
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
