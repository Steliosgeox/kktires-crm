'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface GlassInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-white/70">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            className={cn(
              'w-full rounded-md border bg-white/[0.04] px-4 py-2.5 text-sm text-white/90 placeholder:text-white/40 backdrop-blur-xl shadow-sm transition-all duration-150 outline-none',
              'border-white/[0.08] hover:border-white/[0.15]',
              'focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(14,165,233,0.2)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              {
                'pl-11': leftIcon,
                'pr-11': rightIcon,
                'border-red-500/50 focus:border-red-500/50 focus:shadow-[0_0_20px_rgba(239,68,68,0.2)]':
                  error,
              },
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-400">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-white/40">{hint}</p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export { GlassInput };
