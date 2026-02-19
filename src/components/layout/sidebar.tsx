'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui-store';
import { GlassAvatar } from '@/components/ui/glass-avatar';
import { GlassTooltip } from '@/components/ui/glass-tooltip';
import { bottomNavigation, mainNavigation } from '@/components/layout/navigation';

const SHELL_CUSTOMERS_REFACTOR_ENABLED =
  process.env.NEXT_PUBLIC_UI_REFACTOR_SHELL_CUSTOMERS === 'true';

type SessionUserWithOrgRole = {
  name?: string | null;
  email?: string | null;
  currentOrgRole?: string;
  image?: string | null;
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { data: session } = useSession();
  const sessionUser = session?.user as SessionUserWithOrgRole | undefined;
  const rawName = sessionUser?.name?.trim();
  const email = sessionUser?.email?.trim();
  const name = rawName && rawName.toLowerCase() !== 'user' ? rawName : null;

  const role = sessionUser?.currentOrgRole;
  const canAdmin = role === 'owner' || role === 'admin';

  return (
    <LazyMotion features={domAnimation}>
      <m.aside
        initial={false}
        animate={SHELL_CUSTOMERS_REFACTOR_ENABLED ? undefined : { width: sidebarCollapsed ? 72 : 260 }}
        transition={SHELL_CUSTOMERS_REFACTOR_ENABLED ? undefined : { duration: 0.2 }}
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/[0.08] bg-zinc-950/90 backdrop-blur-xl lg:flex',
          SHELL_CUSTOMERS_REFACTOR_ENABLED &&
            'w-[260px] border-[var(--border-soft)] bg-[var(--surface-2)]/95 backdrop-blur-sm transition-[width] duration-200',
          SHELL_CUSTOMERS_REFACTOR_ENABLED && sidebarCollapsed && 'w-[72px]'
        )}
      >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/[0.08]">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500">
            <span className="text-lg font-bold text-white">K</span>
          </div>
          {!sidebarCollapsed && (
            <m.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-semibold text-white"
            >
              KK Tires
            </m.span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.05] hover:text-white transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {mainNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          const navItem = (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                {
                  'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white border border-cyan-500/30':
                    isActive,
                  'bg-[var(--surface-3)] text-[var(--text-1)] border border-[var(--border-strong)]':
                    isActive && SHELL_CUSTOMERS_REFACTOR_ENABLED,
                  'text-white/60 hover:text-white hover:bg-white/[0.05]': !isActive,
                  'text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]':
                    !isActive && SHELL_CUSTOMERS_REFACTOR_ENABLED,
                  'justify-center': sidebarCollapsed,
                }
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', { 'text-cyan-400': isActive })} />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );

          if (sidebarCollapsed) {
            return (
              <GlassTooltip key={item.name} content={item.name} side="right">
                {navItem}
              </GlassTooltip>
            );
          }

          return navItem;
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-white/[0.08] space-y-1">
        {bottomNavigation
          .filter((item) => (item.adminOnly ? canAdmin : true))
          .map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          const navItem = (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                {
                  'bg-white/[0.08] text-white': isActive,
                  'bg-[var(--surface-3)] text-[var(--text-1)] border border-[var(--border-strong)]':
                    isActive && SHELL_CUSTOMERS_REFACTOR_ENABLED,
                  'text-white/60 hover:text-white hover:bg-white/[0.05]': !isActive,
                  'text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]':
                    !isActive && SHELL_CUSTOMERS_REFACTOR_ENABLED,
                  'justify-center': sidebarCollapsed,
                }
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );

          if (sidebarCollapsed) {
            return (
              <GlassTooltip key={item.name} content={item.name} side="right">
                {navItem}
              </GlassTooltip>
            );
          }

          return navItem;
        })}
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-white/[0.08]">
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl p-2',
            { 'justify-center': sidebarCollapsed }
          )}
        >
          <GlassAvatar
            name={name || email || 'User'}
            src={sessionUser?.image || undefined}
            size="sm"
          />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {name || (email ? email.split('@')[0] : null) || 'Χρήστης'}
              </p>
              <p className="text-xs text-white/50 truncate">
                {email || ''}
              </p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-white/40 hover:text-white transition-colors"
              title="Αποσύνδεση"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      </m.aside>
    </LazyMotion>
  );
}

