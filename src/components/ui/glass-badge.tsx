'use client';

import { cn } from '@/lib/utils';

export interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export function GlassBadge({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ...props
}: GlassBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        {
          // Variants
          'bg-white/[0.05] border border-white/[0.08] text-white/70':
            variant === 'default',
          'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300':
            variant === 'primary',
          'bg-violet-500/20 border border-violet-500/30 text-violet-300':
            variant === 'secondary',
          'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300':
            variant === 'success',
          'bg-amber-500/20 border border-amber-500/30 text-amber-300':
            variant === 'warning',
          'bg-red-500/20 border border-red-500/30 text-red-300':
            variant === 'error',
          // Sizes
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-1 text-xs': size === 'md',
          'px-3 py-1.5 text-sm': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', {
            'bg-white/50': variant === 'default',
            'bg-cyan-400': variant === 'primary',
            'bg-violet-400': variant === 'secondary',
            'bg-emerald-400': variant === 'success',
            'bg-amber-400': variant === 'warning',
            'bg-red-400': variant === 'error',
          })}
        />
      )}
      {children}
    </span>
  );
}

