import * as React from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-16 px-6 text-center rounded-card border-2 border-dashed border-gray-100 bg-gray-50/30',
          className
        )}
        {...props}
      >
        {icon && (
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-card mb-6 text-gray-400">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto mb-8 font-medium leading-relaxed">
          {description}
        </p>
        {action && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            {action}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
