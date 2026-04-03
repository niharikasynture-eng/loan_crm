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
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              flex items-start gap-4 p-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-slide-up
              ${toast.type === 'reminder' ? 'bg-indigo-600/90 border-indigo-400 text-white' : ''}
              ${toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : ''}
              ${toast.type === 'error' ? 'bg-rose-600/90 border-rose-400 text-white' : ''}
              ${toast.type === 'info' ? 'bg-slate-800/90 border-slate-600 text-white' : ''}
            `}
          >
            <div className="p-2 rounded-xl bg-white/20">
              {toast.type === 'reminder' && <Bell className="w-5 h-5" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            
            <div className="flex-1 pt-0.5">
              {toast.title && <h4 className="font-black text-sm uppercase tracking-tighter mb-1">{toast.title}</h4>}
              <p className="text-sm font-medium leading-relaxed opacity-90">{toast.message}</p>
            </div>

            <button 
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 hover:bg-black/20 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
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
