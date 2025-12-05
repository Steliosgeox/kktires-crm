'use client';

import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';

export interface GlassAvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
  color?: string;
}

export function GlassAvatar({
  src,
  name,
  size = 'md',
  className,
  glow = false,
  color,
}: GlassAvatarProps) {
  const initials = getInitials(name);

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const bgColor = color || 'bg-gradient-to-br from-cyan-500 to-violet-500';

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full font-semibold text-white overflow-hidden',
        sizeClasses[size],
        {
          'shadow-[0_0_20px_rgba(14,165,233,0.4)]': glow,
          [bgColor]: !src,
        },
        className
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// Avatar group for showing multiple avatars stacked
export function GlassAvatarGroup({
  avatars,
  max = 4,
  size = 'md',
}: {
  avatars: Array<{ src?: string | null; name: string }>;
  max?: number;
  size?: GlassAvatarProps['size'];
}) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className="flex -space-x-2">
      {displayed.map((avatar, i) => (
        <GlassAvatar
          key={i}
          src={avatar.src}
          name={avatar.name}
          size={size}
          className="ring-2 ring-zinc-900"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-white/10 text-white/70 font-medium ring-2 ring-zinc-900',
            {
              'h-6 w-6 text-[10px]': size === 'xs',
              'h-8 w-8 text-xs': size === 'sm',
              'h-10 w-10 text-sm': size === 'md',
              'h-12 w-12 text-base': size === 'lg',
              'h-16 w-16 text-lg': size === 'xl',
            }
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

