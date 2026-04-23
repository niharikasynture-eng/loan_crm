'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'reminder';
export type ReminderPriority = 'high' | 'medium' | 'low';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  link?: string;
  autoDismiss?: boolean;
  priority?: ReminderPriority;
}

interface ToastContextType {
  toast: (type: ToastType, message: string, options?: { title?: string; link?: string; autoDismiss?: boolean; priority?: ReminderPriority }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  showToast: (message: string, type?: ToastType, title?: string, priority?: any, link?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Priority → color config
const PRIORITY_CONFIG: Record<ReminderPriority, {
  bg: string; border: string; text: string;
  iconBg: string; iconColor: string; barColor: string;
  label: string;
}> = {
  high: {
    bg: '#fff5f5', border: '#fca5a5', text: '#7f1d1d',
    iconBg: '#dc2626', iconColor: '#fff', barColor: '#dc2626',
    label: '🔴 HIGH PRIORITY',
  },
  medium: {
    bg: '#fffbeb', border: '#fcd34d', text: '#78350f',
    iconBg: '#f59e0b', iconColor: '#fff', barColor: '#f59e0b',
    label: '🟡 MEDIUM PRIORITY',
  },
  low: {
    bg: '#f0fdf4', border: '#86efac', text: '#14532d',
    iconBg: '#16a34a', iconColor: '#fff', barColor: '#16a34a',
    label: '🟢 LOW PRIORITY',
  },
};

const REGULAR_CONFIG: Record<string, { bg: string; border: string; iconBg: string; textColor: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', iconBg: '#16a34a', textColor: '#14532d' },
  error:   { bg: '#fff5f5', border: '#fca5a5', iconBg: '#dc2626', textColor: '#7f1d1d' },
  warning: { bg: '#fffbeb', border: '#fcd34d', iconBg: '#f59e0b', textColor: '#78350f' },
  info:    { bg: '#eff6ff', border: '#93c5fd', iconBg: '#2563eb', textColor: '#1e3a8a' },
};

const MAX_TOASTS = 6;
const AUTO_DISMISS_MS = 5000;
const REMINDER_DISMISS_MS = 12000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((
    type: ToastType,
    message: string,
    options: { title?: string; link?: string; autoDismiss?: boolean; priority?: ReminderPriority } = {}
  ) => {
    const id = uuidv4();
    const isReminder = type === 'reminder';
    const autoDismiss = options.autoDismiss !== undefined
      ? options.autoDismiss
      : true; // all auto-dismiss now, reminders just stay longer

    setToasts(prev => {
      const next = [...prev, { id, type, message, ...options, autoDismiss }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });

    if (autoDismiss) {
      setTimeout(() => removeToast(id), isReminder ? REMINDER_DISMISS_MS : AUTO_DISMISS_MS);
    }
  }, [removeToast]);

  const success = (msg: string) => toast('success', msg);
  const error   = (msg: string) => toast('error', msg);
  const info    = (msg: string) => toast('info', msg);
  const warning = (msg: string) => toast('warning', msg);

  // Legacy bridge — maps old showToast(msg, type, title, priority, link) to new system
  const showToast = (
    message: string,
    type: ToastType = 'info',
    title?: string,
    priority?: ReminderPriority,
    link?: string
  ) => {
    toast(type, message, { title, priority, link });
  };

  const handleClick = (t: Toast) => {
    if (t.link) {
      router.push(t.link);
      removeToast(t.id);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning, showToast }}>
      {children}

      {/* Toast Container — TOP RIGHT */}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none"
        style={{ maxWidth: 360, width: '100%' }}
      >
        {toasts.map(t => {
          const isReminder = t.type === 'reminder';
          const prio = (t.priority ?? 'medium') as ReminderPriority;
          const pc = PRIORITY_CONFIG[prio];
          const rc = REGULAR_CONFIG[t.type];

          const bg      = isReminder ? pc.bg      : rc.bg;
          const border  = isReminder ? pc.border  : rc.border;
          const iconBg  = isReminder ? pc.iconBg  : rc.iconBg;
          const textClr = isReminder ? pc.text    : rc.textColor;
          const barClr  = isReminder ? pc.barColor : rc.iconBg;

          return (
            <div
              key={t.id}
              className="pointer-events-auto animate-toast-in"
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                overflow: 'hidden',
                cursor: t.link ? 'pointer' : 'default',
              }}
              onClick={() => handleClick(t)}
            >
              {/* Priority bar */}
              {isReminder && (
                <div style={{ height: 3, background: barClr, borderRadius: '14px 14px 0 0' }} />
              )}

              <div className="flex items-start gap-3 p-3.5">
                {/* Icon */}
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
                  style={{ background: iconBg }}
                >
                  {t.type === 'success' && <CheckCircle size={18} color="#fff" />}
                  {t.type === 'error'   && <AlertCircle size={18} color="#fff" />}
                  {t.type === 'warning' && <AlertTriangle size={18} color="#fff" />}
                  {t.type === 'info'    && <Info size={18} color="#fff" />}
                  {isReminder           && <Bell size={18} color="#fff" className="animate-bounce" />}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  {/* Priority label or type label */}
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                    style={{ color: textClr, opacity: 0.65 }}
                  >
                    {isReminder ? pc.label : (t.title ?? t.type)}
                  </p>

                  {/* Title (for reminders with separate title) */}
                  {isReminder && t.title && (
                    <p className="text-[11px] font-semibold mb-0.5" style={{ color: textClr, opacity: 0.8 }}>
                      {t.title}
                    </p>
                  )}

                  <p className="text-[13px] font-medium leading-snug" style={{ color: textClr }}>
                    {t.message}
                  </p>

                  {t.link && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <p
                        className="text-[11px] font-semibold"
                        style={{ color: textClr, opacity: 0.65 }}
                      >
                        Tap to view lead
                      </p>
                      <ArrowRight size={11} style={{ color: textClr, opacity: 0.65 }} />
                    </div>
                  )}
                </div>

                {/* Close */}
                <button
                  onClick={e => { e.stopPropagation(); removeToast(t.id); }}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-colors mt-0.5"
                  style={{ color: textClr, opacity: 0.5 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
