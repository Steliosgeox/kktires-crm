'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface GlassTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ className, label, error, hint, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-white/70">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-white/90 placeholder:text-white/30 backdrop-blur-xl transition-all duration-200 outline-none resize-none min-h-[100px]',
            'border-white/[0.08] hover:border-white/[0.15]',
            'focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(14,165,233,0.2)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            {
              'border-red-500/50 focus:border-red-500/50 focus:shadow-[0_0_20px_rgba(239,68,68,0.2)]':
                error,
            },
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-white/40">{hint}</p>
        )}
      </div>
    );
  }
);

GlassTextarea.displayName = 'GlassTextarea';

export { GlassTextarea };

