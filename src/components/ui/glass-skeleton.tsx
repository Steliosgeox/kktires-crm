'use client';

import { cn } from '@/lib/utils';

export interface GlassSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function GlassSkeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
}: GlassSkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 rounded bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03] bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]',
              { 'w-4/5': i === lines - 1 },
              className
            )}
            style={i < lines - 1 ? style : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03] bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]',
        {
          'h-4 rounded': variant === 'text',
          'rounded-full': variant === 'circular',
          'rounded-lg': variant === 'rectangular',
        },
        className
      )}
      style={style}
    />
  );
}

// Pre-built skeleton layouts
export function GlassSkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
      <div className="flex items-center gap-4">
        <GlassSkeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <GlassSkeleton width="60%" height={16} />
          <GlassSkeleton width="40%" height={12} />
        </div>
      </div>
      <GlassSkeleton lines={3} />
    </div>
  );
}

export function GlassSkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
        >
          <GlassSkeleton variant="circular" width={32} height={32} />
          <GlassSkeleton width="25%" height={14} />
          <GlassSkeleton width="20%" height={14} />
          <GlassSkeleton width="15%" height={14} />
          <GlassSkeleton width="10%" height={14} />
        </div>
      ))}
    </div>
  );
}

