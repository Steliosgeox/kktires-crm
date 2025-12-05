'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Mail,
  Map,
  BarChart3,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Tag,
  FolderKanban,
  Upload,
  Download,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui-store';
import { GlassAvatar } from '@/components/ui/glass-avatar';
import { GlassTooltip } from '@/components/ui/glass-tooltip';

const navigation = [
  { name: 'Αρχική', href: '/', icon: LayoutDashboard },
  { name: 'Πελάτες', href: '/customers', icon: Users },
  { name: 'Δυνητικοί', href: '/leads', icon: UserPlus },
  { name: 'Ετικέτες', href: '/tags', icon: Tag },
  { name: 'Τμήματα', href: '/segments', icon: FolderKanban },
  { name: 'Εισαγωγή', href: '/import', icon: Upload },
  { name: 'Εξαγωγή', href: '/export', icon: Download },
  { name: 'Email Marketing', href: '/email', icon: Mail },
  { name: 'Χάρτης', href: '/map', icon: Map },
  { name: 'Στατιστικά', href: '/statistics', icon: BarChart3 },
  { name: 'Εργασίες', href: '/tasks', icon: CheckSquare },
];

const bottomNavigation = [
  { name: 'Μετεγκατάσταση', href: '/migrate', icon: Database },
  { name: 'Ρυθμίσεις', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/[0.08] bg-zinc-950/90 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/[0.08]">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500">
            <span className="text-lg font-bold text-white">K</span>
          </div>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-semibold text-white"
            >
              KK Tires
            </motion.span>
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
        {navigation.map((item) => {
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
                  'text-white/60 hover:text-white hover:bg-white/[0.05]': !isActive,
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
        {bottomNavigation.map((item) => {
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
                  'text-white/60 hover:text-white hover:bg-white/[0.05]': !isActive,
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
          <GlassAvatar name="User" size="sm" />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Χρήστης</p>
              <p className="text-xs text-white/50 truncate">user@kktires.gr</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button className="text-white/40 hover:text-white transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

