'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface GlassSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      options,
      placeholder = 'Επιλέξτε...',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-white/70">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full appearance-none rounded-xl border bg-white/[0.03] px-4 py-3 pr-10 text-sm text-white/90 backdrop-blur-xl transition-all duration-200 outline-none cursor-pointer',
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
          >
            <option value="" className="bg-zinc-900">
              {placeholder}
            </option>
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-zinc-900"
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-white/40">{hint}</p>
        )}
      </div>
    );
  }
);

GlassSelect.displayName = 'GlassSelect';

export { GlassSelect };

