import * as React from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, style, ...props }, ref) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      primary:   { background: 'var(--brand)', color: '#fff' },
      secondary: { background: '#fff', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' },
      ghost:     { background: 'transparent', color: 'var(--text-muted)' },
      danger:    { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' },
      success:   { background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' },
    };

    const sizeClass = {
      sm: 'px-4 py-2 text-xs gap-2',
      md: 'px-6 py-3 text-sm gap-2.5',
      lg: 'px-8 py-4 text-base gap-3',
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={{ ...variantStyles[variant], ...style }}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150',
          'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shrink-0',
          'hover:opacity-90',
          sizeClass,
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button };
