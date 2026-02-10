'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useUIStore } from '@/lib/stores/ui-store';
import {
  Mail,
  FileText,
  Users,
  Tag,
  Zap,
  Send,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  Moon,
  Sun,
  BarChart3,
  Archive,
  Inbox,
  Star,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  badge?: 'new' | 'alert';
}

interface SidebarSection {
  title?: string;
  items: SidebarItem[];
  collapsible?: boolean;
}

interface OutlookSidebarProps {
  activeItem: string;
  onItemSelect: (id: string) => void;
  onNewCampaign: () => void;
  folderCounts?: {
    all: number;
    draft: number;
    scheduled: number;
    sending: number;
    sent: number;
    failed: number;
  };
}

export function OutlookSidebar({
  activeItem,
  onItemSelect,
  onNewCampaign,
  folderCounts = { all: 0, draft: 0, scheduled: 0, sending: 0, sent: 0, failed: 0 },
}: OutlookSidebarProps) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useUIStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    folders: true,
    tools: true,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const sections: SidebarSection[] = [
    {
      items: [
        { id: 'all', label: 'Όλα τα Campaigns', icon: Inbox, count: folderCounts.all },
      ],
    },
    {
      title: 'Φάκελοι',
      collapsible: true,
      items: [
        { id: 'draft', label: 'Πρόχειρα', icon: FileText, count: folderCounts.draft },
        { id: 'scheduled', label: 'Προγραμματισμένα', icon: Clock, count: folderCounts.scheduled },
        { id: 'sending', label: 'Αποστολή', icon: Mail, count: folderCounts.sending },
        { id: 'sent', label: 'Απεσταλμένα', icon: Send, count: folderCounts.sent },
        { id: 'failed', label: 'Αποτυχημένα', icon: AlertCircle, count: folderCounts.failed, badge: folderCounts.failed > 0 ? 'alert' : undefined },
      ],
    },
    {
      title: 'Εργαλεία',
      collapsible: true,
      items: [
        { id: 'templates', label: 'Templates', icon: FileText },
        { id: 'contacts', label: 'Επαφές', icon: Users },
        { id: 'segments', label: 'Τμήματα', icon: Tag },
        { id: 'automations', label: 'Αυτοματισμοί', icon: Zap },
        { id: 'analytics', label: 'Αναλυτικά', icon: BarChart3 },
      ],
    },
  ];

  return (
    <div className="h-full flex flex-col" style={{ 
      background: 'var(--outlook-bg-panel)',
      color: 'var(--outlook-text-primary)',
    }}>
      {/* Header with New Button */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--outlook-border)' }}>
        <button
          onClick={onNewCampaign}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md font-medium transition-all"
          style={{
            background: 'var(--outlook-accent)',
            color: 'white',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--outlook-accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--outlook-accent)';
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Νέο Campaign</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto outlook-scrollbar py-2">
        {sections.map((section, sectionIndex) => {
          const sectionId = section.title?.toLowerCase().replace(/\s/g, '-') || `section-${sectionIndex}`;
          const isExpanded = expandedSections[sectionId] !== false;

          return (
            <div key={sectionId} className="mb-1">
              {/* Section Header */}
              {section.title && (
                <button
                  onClick={() => section.collapsible && toggleSection(sectionId)}
                  className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--outlook-text-tertiary)' }}
                >
                  {section.collapsible && (
                    isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )
                  )}
                  <span>{section.title}</span>
                </button>
              )}

              {/* Section Items */}
              {isExpanded && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onItemSelect(item.id)}
                        className="w-full flex items-center justify-between px-3 py-2 mx-1 rounded-md transition-all group"
                        style={{
                          width: 'calc(100% - 8px)',
                          background: isActive ? 'var(--outlook-bg-selected)' : 'transparent',
                          color: isActive ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)',
                          borderLeft: isActive ? '3px solid var(--outlook-accent)' : '3px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'var(--outlook-bg-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge === 'alert' && (
                            <span 
                              className="w-2 h-2 rounded-full"
                              style={{ background: 'var(--outlook-error)' }}
                            />
                          )}
                          {typeof item.count === 'number' && item.count > 0 && (
                            <span 
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                background: isActive ? 'var(--outlook-accent-light)' : 'var(--outlook-bg-hover)',
                                color: isActive ? 'var(--outlook-accent)' : 'var(--outlook-text-tertiary)',
                              }}
                            >
                              {item.count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer - User Profile & Theme Toggle */}
      <div 
        className="border-t p-3 space-y-2"
        style={{ borderColor: 'var(--outlook-border)' }}
      >
        {/* Theme Toggle */}
        <button
          onClick={() => toggleTheme()}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md transition-all"
          style={{ 
            background: 'var(--outlook-bg-hover)',
            color: 'var(--outlook-text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--outlook-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--outlook-text-secondary)';
          }}
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
            <span className="text-sm">{theme === 'dark' ? 'Σκοτεινό θέμα' : 'Φωτεινό θέμα'}</span>
          </div>
        </button>

        {/* User Profile */}
        {session?.user && (
          <div 
            className="flex items-center gap-3 px-3 py-2 rounded-md"
            style={{ background: 'var(--outlook-bg-surface)' }}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ 
                background: 'var(--outlook-accent)',
                color: 'white',
              }}
            >
              {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p 
                className="text-sm font-medium truncate"
                style={{ color: 'var(--outlook-text-primary)' }}
              >
                {session.user.name || 'Χρήστης'}
              </p>
              <p 
                className="text-xs truncate"
                style={{ color: 'var(--outlook-text-tertiary)' }}
              >
                {session.user.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

