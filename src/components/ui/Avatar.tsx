import * as React from 'react';
import { cn } from '@/lib/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name, size = 'md', className, ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    const sizes = {
      sm: 'h-8 w-8 text-[10px]',
      md: 'h-10 w-10 text-xs',
      lg: 'h-12 w-12 text-sm',
      xl: 'h-16 w-16 text-lg',
    };

    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        ref={ref}
        className={cn('relative flex shrink-0 overflow-hidden rounded-full', sizes[size], className)}
        style={{ background: 'var(--brand-soft)', border: '1px solid rgba(124,58,237,0.15)' }}
        {...props}
      >
        {src && !hasError ? (
          <img src={src} alt={name} className="aspect-square h-full w-full object-cover" onError={() => setHasError(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-bold" style={{ color: 'var(--brand)', fontSize: 'inherit' }}>
            {initials}
          </div>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
