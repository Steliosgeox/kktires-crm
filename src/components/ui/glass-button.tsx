'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 outline-none shadow-sm focus-visible:ring-2 focus-visible:ring-cyan-500/50',
          {
            // Variants
            'bg-white/[0.03] border border-white/[0.08] text-white/90 hover:bg-white/[0.06] hover:border-white/[0.15] hover:-translate-y-0.5 active:translate-y-0':
              variant === 'default',
            'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.4)] hover:-translate-y-0.5 active:translate-y-0':
              variant === 'primary',
            'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:-translate-y-0.5 active:translate-y-0':
              variant === 'secondary',
            'bg-transparent text-white/70 hover:text-white hover:bg-white/[0.05]':
              variant === 'ghost',
            'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]':
              variant === 'danger',
            // Sizes
            'h-8 px-3 text-xs': size === 'sm',
            'h-10 px-5 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
            // Disabled
            'opacity-50 cursor-not-allowed hover:transform-none': isDisabled,
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

export { GlassButton };

