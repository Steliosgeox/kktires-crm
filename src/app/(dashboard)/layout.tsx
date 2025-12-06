'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AuroraBackground } from '@/components/layout/aurora-background';
import { CommandPalette } from '@/components/layout/command-palette';
import { GlassToastContainer } from '@/components/ui/glass-toast';
import { StoreHydration } from '@/components/providers/store-hydration';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Aurora Background */}
      <AuroraBackground />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen pt-16 transition-all duration-200',
          {
            'pl-[260px]': !sidebarCollapsed,
            'pl-[72px]': sidebarCollapsed,
          }
        )}
      >
        <Header />
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Global Components */}
      <CommandPalette />
      <GlassToastContainer />
      <StoreHydration />
    </div>
  );
}

