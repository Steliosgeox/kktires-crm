'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface GlassSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const GlassSwitch = forwardRef<HTMLButtonElement, GlassSwitchProps>(
  ({ checked, onChange, label, description, disabled, className }, ref) => {
    return (
      <div className={cn('flex items-start gap-3', className)}>
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900',
            {
              'bg-gradient-to-r from-cyan-500 to-violet-500': checked,
              'bg-white/20': !checked,
              'opacity-50 cursor-not-allowed': disabled,
            }
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
              {
                'translate-x-5': checked,
                'translate-x-0': !checked,
              }
            )}
          />
        </button>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-white">{label}</span>
            )}
            {description && (
              <span className="text-xs text-white/50">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

GlassSwitch.displayName = 'GlassSwitch';

