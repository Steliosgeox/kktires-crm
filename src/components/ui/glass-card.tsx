'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  glow?: 'none' | 'primary' | 'secondary' | 'success' | 'error';
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = true,
      glow = 'none',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-white/[0.10] bg-white/[0.04] backdrop-blur-xl shadow-sm transition-all duration-200',
          {
            // Variants
            'shadow-lg': variant === 'elevated',
            'border-white/[0.12]': variant === 'bordered',
            // Padding
            'p-0': padding === 'none',
            'p-4': padding === 'sm',
            'p-6': padding === 'md',
            'p-8': padding === 'lg',
            // Hover
            'hover:bg-white/[0.06] hover:border-white/[0.15]': hover,
            // Glow
            'hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]': glow === 'primary' && hover,
            'hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]': glow === 'secondary' && hover,
            'hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]': glow === 'success' && hover,
            'hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]': glow === 'error' && hover,
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard };

