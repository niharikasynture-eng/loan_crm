import * as React from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8', className)}>
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
      {action && (
        <div className="flex items-center gap-2 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
