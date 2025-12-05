'use client';

import { createContext, useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a GlassTabs');
  }
  return context;
}

export interface GlassTabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
  onChange?: (value: string) => void;
}

export function GlassTabs({
  defaultValue,
  children,
  className,
  onChange,
}: GlassTabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultValue);

  const setActiveTab = (value: string) => {
    setActiveTabState(value);
    onChange?.(value);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface GlassTabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassTabsList({ children, className }: GlassTabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface GlassTabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function GlassTabsTrigger({
  value,
  children,
  className,
  disabled,
}: GlassTabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={cn(
        'relative px-4 py-2 text-sm font-medium rounded-lg transition-colors',
        'text-white/60 hover:text-white/90',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 rounded-lg bg-white/[0.08]"
          transition={{ type: 'spring', duration: 0.3 }}
        />
      )}
      <span className={cn('relative z-10', { 'text-white': isActive })}>
        {children}
      </span>
    </button>
  );
}

export interface GlassTabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function GlassTabsContent({
  value,
  children,
  className,
}: GlassTabsContentProps) {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

