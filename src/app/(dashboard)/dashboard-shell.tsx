'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AuroraBackground } from '@/components/layout/aurora-background';
import { CommandPalette } from '@/components/layout/command-palette';
import { GlassToastContainer } from '@/components/ui/glass-toast';
import { StoreHydration } from '@/components/providers/store-hydration';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';
import { bottomNavigation, mainNavigation } from '@/components/layout/navigation';
import { GlassAvatar } from '@/components/ui/glass-avatar';
import { X, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const SHELL_CUSTOMERS_REFACTOR_ENABLED =
  process.env.NEXT_PUBLIC_UI_REFACTOR_SHELL_CUSTOMERS === 'true';

type SessionUserWithOrgRole = {
  name?: string | null;
  email?: string | null;
  currentOrgRole?: string;
  image?: string | null;
};

function NotificationsPanel() {
  const open = useUIStore((s) => s.notificationsOpen);
  const setOpen = useUIStore((s) => s.setNotificationsOpen);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close notifications"
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm',
          SHELL_CUSTOMERS_REFACTOR_ENABLED && 'backdrop-blur-[2px]'
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          'absolute right-0 top-0 h-full w-full max-w-sm border-l border-white/[0.08] bg-zinc-950/95 backdrop-blur-xl',
          SHELL_CUSTOMERS_REFACTOR_ENABLED &&
            'border-[var(--border-soft)] bg-[var(--surface-2)]/95 backdrop-blur-sm'
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
          <h2 className="text-sm font-semibold text-white">Ειδοποιήσεις</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-white/60 hover:bg-white/[0.05] hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-white/60">Δεν υπάρχουν ειδοποιήσεις ακόμα.</p>
        </div>
      </aside>
    </div>
  );
}

function MobileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const open = useUIStore((s) => s.mobileMenuOpen);
  const setOpen = useUIStore((s) => s.setMobileMenuOpen);
  const { data: session } = useSession();
  const sessionUser = session?.user as SessionUserWithOrgRole | undefined;

  const role = sessionUser?.currentOrgRole;
  const canAdmin = role === 'owner' || role === 'admin';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm',
          SHELL_CUSTOMERS_REFACTOR_ENABLED && 'backdrop-blur-[2px]'
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          'absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-white/[0.08] bg-zinc-950/95 backdrop-blur-xl',
          SHELL_CUSTOMERS_REFACTOR_ENABLED &&
            'border-[var(--border-soft)] bg-[var(--surface-2)]/95 backdrop-blur-sm'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/[0.08]">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setOpen(false)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500">
              <span className="text-lg font-bold text-white">K</span>
            </div>
            <span className="text-lg font-semibold text-white">KK Tires</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/[0.05] hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  router.push(item.href);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  {
                    'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white border border-cyan-500/30': isActive,
                    'text-white/60 hover:text-white hover:bg-white/[0.05]': !isActive,
                  }
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', { 'text-cyan-400': isActive })} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.08] space-y-1">
          {bottomNavigation
            .filter((item) => (item.adminOnly ? canAdmin : true))
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    router.push(item.href);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    {
                      'bg-white/[0.08] text-white': isActive,
                      'text-white/60 hover:text-white hover:bg-white/[0.05]': !isActive,
                    }
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
        </div>

        <div className="p-3 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <GlassAvatar
              name={sessionUser?.name || sessionUser?.email || 'User'}
              src={sessionUser?.image || undefined}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {sessionUser?.name || sessionUser?.email || 'Χρήστης'}
              </p>
              <p className="text-xs text-white/50 truncate">
                {sessionUser?.email || ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-white/40 hover:text-white transition-colors"
              title="Αποσύνδεση"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div
      className={cn(
        'min-h-screen bg-zinc-950',
        SHELL_CUSTOMERS_REFACTOR_ENABLED && 'shell-customers-refactor bg-[var(--surface-1)]'
      )}
    >
      {/* Aurora Background */}
      <AuroraBackground />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={cn('min-h-screen pt-16 transition-all duration-200 pl-0', {
          'lg:pl-[260px]': !sidebarCollapsed,
          'lg:pl-[72px]': sidebarCollapsed,
        })}
      >
        <Header />
        <div className={cn('p-6', SHELL_CUSTOMERS_REFACTOR_ENABLED && 'md:p-5')}>{children}</div>
      </main>

      {/* Global Components */}
      <CommandPalette />
      <GlassToastContainer />
      <StoreHydration />
      <NotificationsPanel />
      <MobileSidebar />
    </div>
  );
}
