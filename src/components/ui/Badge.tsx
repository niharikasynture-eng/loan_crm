import * as React from 'react';
import { cn } from '@/lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'pending' | 'completed';
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  success:   { background: '#ecfdf5', color: '#059669' },
  warning:   { background: '#fffbeb', color: '#d97706' },
  danger:    { background: '#fef2f2', color: '#dc2626' },
  info:      { background: '#eff6ff', color: '#2563eb' },
  neutral:   { background: '#f3f4f6', color: '#6b7280' },
  new:       { background: '#f3f1ff', color: '#7c3aed' },
  contacted: { background: '#eff6ff', color: '#2563eb' },
  qualified: { background: '#ecfdf5', color: '#059669' },
  won:       { background: '#dcfce7', color: '#15803d' },
  lost:      { background: '#fef2f2', color: '#dc2626' },
  pending:   { background: '#fffbeb', color: '#d97706' },
  completed: { background: '#ecfdf5', color: '#059669' },
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', style, ...props }, ref) => (
    <span
      ref={ref}
      style={{ ...VARIANT_STYLES[variant] ?? VARIANT_STYLES.neutral, ...style }}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize whitespace-nowrap',
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = 'Badge';
export { Badge };
