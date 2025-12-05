'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  UserPlus,
  Mail,
  Map,
  BarChart3,
  CheckSquare,
  Settings,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui-store';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, closeCommandPalette, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Toggle with Cmd+K
  useKeyboardShortcut({
    key: 'k',
    modifiers: ['meta'],
    callback: toggleCommandPalette,
  });

  // Close with Escape
  useKeyboardShortcut({
    key: 'Escape',
    callback: closeCommandPalette,
    preventDefault: false,
  });

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      { id: 'nav-dashboard', title: 'Αρχική', icon: <BarChart3 className="h-4 w-4" />, action: () => router.push('/dashboard'), category: 'Πλοήγηση' },
      { id: 'nav-customers', title: 'Πελάτες', icon: <Users className="h-4 w-4" />, action: () => router.push('/dashboard/customers'), category: 'Πλοήγηση' },
      { id: 'nav-leads', title: 'Δυνητικοί', icon: <UserPlus className="h-4 w-4" />, action: () => router.push('/dashboard/leads'), category: 'Πλοήγηση' },
      { id: 'nav-email', title: 'Email Marketing', icon: <Mail className="h-4 w-4" />, action: () => router.push('/dashboard/email'), category: 'Πλοήγηση' },
      { id: 'nav-map', title: 'Χάρτης', icon: <Map className="h-4 w-4" />, action: () => router.push('/dashboard/map'), category: 'Πλοήγηση' },
      { id: 'nav-tasks', title: 'Εργασίες', icon: <CheckSquare className="h-4 w-4" />, action: () => router.push('/dashboard/tasks'), category: 'Πλοήγηση' },
      { id: 'nav-settings', title: 'Ρυθμίσεις', icon: <Settings className="h-4 w-4" />, action: () => router.push('/dashboard/settings'), category: 'Πλοήγηση' },
      // Quick Actions
      { id: 'action-new-customer', title: 'Νέος Πελάτης', description: 'Δημιουργία νέου πελάτη', icon: <Plus className="h-4 w-4" />, action: () => router.push('/dashboard/customers?new=true'), category: 'Ενέργειες' },
      { id: 'action-new-lead', title: 'Νέος Δυνητικός', description: 'Δημιουργία νέου δυνητικού', icon: <Plus className="h-4 w-4" />, action: () => router.push('/dashboard/leads?new=true'), category: 'Ενέργειες' },
      { id: 'action-new-email', title: 'Νέο Email', description: 'Σύνταξη νέου email', icon: <Mail className="h-4 w-4" />, action: () => router.push('/dashboard/email/compose'), category: 'Ενέργειες' },
      { id: 'action-new-task', title: 'Νέα Εργασία', description: 'Δημιουργία νέας εργασίας', icon: <CheckSquare className="h-4 w-4" />, action: () => router.push('/dashboard/tasks?new=true'), category: 'Ενέργειες' },
    ],
    [router]
  );

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Reset state when opening
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          cmd.action();
          closeCommandPalette();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, closeCommandPalette]);

  let currentIndex = 0;

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeCommandPalette}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-xl rounded-2xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
              <Search className="h-5 w-5 text-white/40" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Αναζήτηση εντολών..."
                className="flex-1 bg-transparent py-4 text-white outline-none placeholder:text-white/30"
              />
              <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-white/[0.1] bg-white/[0.03] px-2 text-xs text-white/40">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-sm text-white/40">
                  Δεν βρέθηκαν αποτελέσματα
                </div>
              ) : (
                Object.entries(groupedCommands).map(([category, items]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="px-3 py-2 text-xs font-medium text-white/40 uppercase tracking-wider">
                      {category}
                    </div>
                    {items.map((cmd) => {
                      const index = currentIndex++;
                      const isSelected = index === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            cmd.action();
                            closeCommandPalette();
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                            {
                              'bg-white/[0.08]': isSelected,
                              'hover:bg-white/[0.05]': !isSelected,
                            }
                          )}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-white/70">
                            {cmd.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white">
                              {cmd.title}
                            </div>
                            {cmd.description && (
                              <div className="text-xs text-white/50 truncate">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight className="h-4 w-4 text-white/40" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

