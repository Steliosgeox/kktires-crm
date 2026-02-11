'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Command, Menu, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui-store';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassAvatar } from '@/components/ui/glass-avatar';
import { GlassDropdown } from '@/components/ui/glass-dropdown';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
}

export function Header({ title, showSearch = true }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: session } = useSession();
  const { 
    sidebarCollapsed, 
    openCommandPalette, 
    setNotificationsOpen,
    setMobileMenuOpen,
    theme,
    toggleTheme,
  } = useUIStore();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const rawName = session?.user?.name?.trim();
  const email = session?.user?.email?.trim();
  const name = rawName && rawName.toLowerCase() !== 'user' ? rawName : null;

  const avatarName = name || email || 'User';
  const userLabel =
    name?.split(' ')[0] ||
    email?.split('@')[0] ||
    'User';

  const userMenuItems = [
    { key: 'profile', label: 'Προφίλ', onClick: () => router.push('/settings?section=profile') },
    { key: 'settings', label: 'Ρυθμίσεις', onClick: () => router.push('/settings') },
    { key: 'divider', label: '', divider: true },
    { key: 'logout', label: 'Αποσύνδεση', onClick: handleSignOut, danger: true },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl px-6 transition-all duration-200',
        {
          'left-0': true,
          'lg:left-[260px]': !sidebarCollapsed,
          'lg:left-[72px]': sidebarCollapsed,
        }
      )}
    >
      {/* Left: Mobile menu + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden text-white/70 hover:text-white"
        >
          <Menu className="h-6 w-6" />
        </button>
        {title && (
          <h1 className="text-xl font-semibold text-white">{title}</h1>
        )}
      </div>

      {/* Center: Search */}
      {showSearch && (
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <GlassInput
              placeholder="Αναζήτηση... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={openCommandPalette}
              leftIcon={<Search className="h-4 w-4" />}
              className="pr-12"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/[0.1] bg-white/[0.03] px-1.5 text-[10px] text-white/40">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </div>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Command Palette Button (Mobile) */}
        <GlassButton
          variant="ghost"
          size="icon"
          onClick={openCommandPalette}
          className="md:hidden"
        >
          <Search className="h-5 w-5" />
        </GlassButton>

        {/* Theme Toggle */}
        <GlassButton
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Φωτεινό θέμα' : 'Σκούρο θέμα'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </GlassButton>

        {/* Notifications */}
        <GlassButton
          variant="ghost"
          size="icon"
          onClick={() => setNotificationsOpen(true)}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-500" />
        </GlassButton>

        {/* User Menu */}
        <GlassDropdown
          trigger={
            <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/[0.05] transition-colors">
              <GlassAvatar 
                name={avatarName}
                src={session?.user?.image || undefined}
                size="sm" 
              />
              <span className="hidden lg:block text-sm text-white/70 max-w-[160px] truncate">
                {userLabel}
              </span>
            </button>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}
