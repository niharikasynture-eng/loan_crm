'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { ArrowLeft } from 'lucide-react';
import { useNavigation } from '@/context/NavigationContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showBack?: boolean;
  className?: string;
}

export function PageHeader({ title, subtitle, action, showBack = false, className }: PageHeaderProps) {
  const { goBack, canGoBack } = useNavigation();

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8', className)}>
      <div className="flex items-start gap-3">
        {showBack && (
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={cn(
              'mt-1 p-1.5 rounded-lg border transition-all active:scale-95 shrink-0',
              canGoBack
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-sm'
                : 'bg-slate-50/50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
            )}
            title="Go back to previous page"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
        )}
        <div>
          <h1
            className="font-black leading-tight tracking-tight"
            style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 leading-relaxed font-semibold" style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex items-center gap-2 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

