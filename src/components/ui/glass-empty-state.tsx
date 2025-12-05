'use client';

import { cn } from '@/lib/utils';
import { GlassButton } from './glass-button';

export interface GlassEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function GlassEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: GlassEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05] text-white/40">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-white/50">{description}</p>
      )}
      {action && (
        <GlassButton
          variant="primary"
          onClick={action.onClick}
          className="mt-6"
        >
          {action.label}
        </GlassButton>
      )}
    </div>
  );
}

