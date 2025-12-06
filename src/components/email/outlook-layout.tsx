'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { useUIStore } from '@/lib/stores/ui-store';

interface OutlookLayoutProps {
  sidebar: ReactNode;
  list: ReactNode;
  editor: ReactNode;
  showEditor?: boolean;
}

export function OutlookLayout({ sidebar, list, editor, showEditor = true }: OutlookLayoutProps) {
  const theme = useUIStore((state) => state.theme);
  const [listWidth, setListWidth] = useState(360);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const sidebarWidth = 240;
      const newListWidth = e.clientX - containerRect.left - sidebarWidth;
      
      // Constrain between 280px and 500px
      setListWidth(Math.max(280, Math.min(500, newListWidth)));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="outlook-app h-full flex overflow-hidden"
      data-theme={theme}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left Sidebar - Fixed 240px */}
      <aside
        className="flex-shrink-0 h-full overflow-hidden"
        style={{ width: 'var(--outlook-sidebar-width)' }}
      >
        <div className="h-full overflow-y-auto outlook-scrollbar" style={{
          background: 'var(--outlook-bg-panel)',
          borderRight: '1px solid var(--outlook-border)',
        }}>
          {sidebar}
        </div>
      </aside>

      {/* Center List - Resizable */}
      <div
        className="flex-shrink-0 h-full overflow-hidden relative"
        style={{ width: listWidth }}
      >
        <div className="h-full overflow-y-auto outlook-scrollbar" style={{
          background: 'var(--outlook-bg-panel)',
          borderRight: '1px solid var(--outlook-border)',
        }}>
          {list}
        </div>
        
        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-10"
          onMouseDown={handleMouseDown}
          style={{
            background: isDragging ? 'var(--outlook-accent)' : 'transparent',
          }}
        >
          <div 
            className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[var(--outlook-accent)] transition-colors opacity-0 group-hover:opacity-30"
          />
        </div>
      </div>

      {/* Right Editor - Flexible */}
      <main className="flex-1 h-full overflow-hidden" style={{
        background: 'var(--outlook-bg-surface)',
      }}>
        {showEditor ? (
          <div className="h-full overflow-y-auto outlook-scrollbar outlook-animate-fade">
            {editor}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center" style={{
            color: 'var(--outlook-text-tertiary)',
          }}>
            <div className="text-center">
              <svg 
                className="w-16 h-16 mx-auto mb-4 opacity-30"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-medium">Επιλέξτε ένα campaign</p>
              <p className="text-sm mt-1">ή δημιουργήστε νέο για να ξεκινήσετε</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

