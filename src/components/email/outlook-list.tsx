'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  MoreHorizontal,
  Trash2,
  Copy,
  Edit,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'paused';
  scheduledAt?: string | Date | null;
  sentAt?: string | Date | null;
  createdAt: string | Date;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  isStarred?: boolean;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string;
  createdAt: string | Date;
}

interface OutlookListProps {
  items: Campaign[] | Template[];
  type: 'campaigns' | 'templates';
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onEdit?: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  loading?: boolean;
}

const statusConfig = {
  draft: { label: 'Πρόχειρο', icon: FileText, color: 'var(--outlook-text-secondary)', bg: 'var(--outlook-bg-hover)' },
  scheduled: { label: 'Προγρ/μένο', icon: Clock, color: 'var(--outlook-warning)', bg: 'var(--outlook-warning-bg)' },
  sending: { label: 'Αποστολή', icon: Send, color: 'var(--outlook-info)', bg: 'var(--outlook-info-bg)' },
  sent: { label: 'Απεστάλη', icon: CheckCircle, color: 'var(--outlook-success)', bg: 'var(--outlook-success-bg)' },
  failed: { label: 'Αποτυχία', icon: AlertCircle, color: 'var(--outlook-error)', bg: 'var(--outlook-error-bg)' },
  paused: { label: 'Παύση', icon: Clock, color: 'var(--outlook-warning)', bg: 'var(--outlook-warning-bg)' },
};

const filterOptions = [
  { value: 'all', label: 'Όλα' },
  { value: 'draft', label: 'Πρόχειρα' },
  { value: 'scheduled', label: 'Προγραμματισμένα' },
  { value: 'sent', label: 'Απεσταλμένα' },
  { value: 'failed', label: 'Αποτυχημένα' },
];

export function OutlookList({
  items,
  type,
  selectedId,
  onSelect,
  onDelete,
  onDuplicate,
  onEdit,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  loading = false,
}: OutlookListProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query)
      );
    }

    // Status filter (only for campaigns)
    if (type === 'campaigns' && filter !== 'all') {
      result = result.filter((item) => (item as Campaign).status === filter);
    }

    return result;
  }, [items, searchQuery, filter, type]);

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      return formatDistanceToNow(d, { addSuffix: true, locale: el });
    } catch {
      return '';
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div 
      className="h-full flex flex-col"
      style={{ background: 'var(--outlook-bg-panel)' }}
      onClick={closeContextMenu}
    >
      {/* Search & Filter Header */}
      <div 
        className="p-3 space-y-2 border-b"
        style={{ borderColor: 'var(--outlook-border)' }}
      >
        {/* Search Input */}
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--outlook-text-tertiary)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={type === 'campaigns' ? 'Αναζήτηση καμπανιών...' : 'Αναζήτηση προτύπων...'}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-md transition-all outlook-input"
            style={{
              background: 'var(--outlook-bg-surface)',
              border: '1px solid var(--outlook-border)',
              color: 'var(--outlook-text-primary)',
            }}
          />
        </div>

        {/* Filter Chips */}
        {type === 'campaigns' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
              style={{
                background: showFilters ? 'var(--outlook-accent-light)' : 'var(--outlook-bg-hover)',
                color: showFilters ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)',
              }}
            >
              <Filter className="w-3 h-3" />
              <span>Φίλτρα</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {filter !== 'all' && (
              <span
                className="px-2 py-1 text-xs rounded-full"
                style={{
                  background: 'var(--outlook-accent-light)',
                  color: 'var(--outlook-accent)',
                }}
              >
                {filterOptions.find((f) => f.value === filter)?.label}
                <button
                  onClick={() => onFilterChange('all')}
                  className="ml-1 hover:opacity-70"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* Filter Dropdown */}
        {showFilters && type === 'campaigns' && (
          <div 
            className="flex flex-wrap gap-1 p-2 rounded-md outlook-animate-fade"
            style={{ background: 'var(--outlook-bg-surface)' }}
          >
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onFilterChange(option.value);
                  setShowFilters(false);
                }}
                className="px-3 py-1.5 text-xs rounded-md transition-all"
                style={{
                  background: filter === option.value ? 'var(--outlook-accent)' : 'var(--outlook-bg-hover)',
                  color: filter === option.value ? 'white' : 'var(--outlook-text-secondary)',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List Items */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar">
        {loading ? (
          // Loading skeleton
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i}
                className="p-3 rounded-md animate-pulse"
                style={{ background: 'var(--outlook-bg-hover)' }}
              >
                <div 
                  className="h-4 w-3/4 rounded mb-2"
                  style={{ background: 'var(--outlook-border)' }}
                />
                <div 
                  className="h-3 w-1/2 rounded"
                  style={{ background: 'var(--outlook-border)' }}
                />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div 
            className="flex flex-col items-center justify-center h-full p-6 text-center"
            style={{ color: 'var(--outlook-text-tertiary)' }}
          >
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {searchQuery ? 'Δεν βρέθηκαν αποτελέσματα' : 'Δεν υπάρχουν ακόμα'}
            </p>
            <p className="text-xs mt-1">
              {searchQuery ? 'Δοκιμάστε διαφορετική αναζήτηση' : 'Δημιουργήστε την πρώτη σας καμπάνια'}
            </p>
          </div>
        ) : (
          <div>
            {filteredItems.map((item) => {
              const campaign = item as Campaign;
              const isSelected = selectedId === item.id;
              const status = type === 'campaigns' ? statusConfig[campaign.status] : null;
              const StatusIcon = status?.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  onContextMenu={(e) => handleContextMenu(e, item.id)}
                  className="relative cursor-pointer transition-all group"
                  style={{
                    background: isSelected ? 'var(--outlook-bg-selected)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--outlook-accent)' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--outlook-bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div 
                    className="p-3 border-b"
                    style={{ borderColor: 'var(--outlook-border-subtle)' }}
                  >
                    {/* Title Row */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 
                        className="text-sm font-semibold truncate flex-1"
                        style={{ color: 'var(--outlook-text-primary)' }}
                      >
                        {item.name}
                      </h4>
                      <span 
                        className="text-xs whitespace-nowrap"
                        style={{ color: 'var(--outlook-text-tertiary)' }}
                      >
                        {formatDate(type === 'campaigns' ? campaign.sentAt || campaign.createdAt : item.createdAt)}
                      </span>
                    </div>

                    {/* Subject */}
                    <p 
                      className="text-xs truncate mb-2"
                      style={{ color: 'var(--outlook-text-secondary)' }}
                    >
                      {item.subject}
                    </p>

                    {/* Status & Stats */}
                    <div className="flex items-center justify-between">
                      {status && StatusIcon && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                          style={{
                            background: status.bg,
                            color: status.color,
                          }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      )}

                      {type === 'campaigns' && campaign.status === 'sent' && (
                        <div 
                          className="flex items-center gap-3 text-xs"
                          style={{ color: 'var(--outlook-text-tertiary)' }}
                        >
                          <span>{campaign.openCount} ανοίγματα</span>
                          <span>{campaign.clickCount} κλικ</span>
                        </div>
                      )}

                      {type === 'templates' && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: 'var(--outlook-bg-hover)',
                            color: 'var(--outlook-text-tertiary)',
                          }}
                        >
                          {(item as Template).category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    style={{ background: 'var(--outlook-bg-panel)' }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(item.id);
                      }}
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color: 'var(--outlook-text-tertiary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--outlook-bg-hover)';
                        e.currentTarget.style.color = 'var(--outlook-text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--outlook-text-tertiary)';
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu({ id: item.id, x: e.clientX, y: e.clientY });
                      }}
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color: 'var(--outlook-text-tertiary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--outlook-bg-hover)';
                        e.currentTarget.style.color = 'var(--outlook-text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--outlook-text-tertiary)';
                      }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div 
        className="px-3 py-2 text-xs border-t"
        style={{ 
          borderColor: 'var(--outlook-border)',
          color: 'var(--outlook-text-tertiary)',
        }}
      >
        {filteredItems.length} {type === 'campaigns' ? 'καμπάνιες' : 'πρότυπα'}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 py-1 rounded-md shadow-lg outlook-animate-scale"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--outlook-bg-panel)',
            border: '1px solid var(--outlook-border)',
            boxShadow: 'var(--outlook-shadow-lg)',
          }}
        >
          <button
            onClick={() => {
              onEdit?.(contextMenu.id);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
            style={{ color: 'var(--outlook-text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--outlook-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Edit className="w-4 h-4" />
            Επεξεργασία
          </button>
          <button
            onClick={() => {
              onDuplicate?.(contextMenu.id);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
            style={{ color: 'var(--outlook-text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--outlook-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Copy className="w-4 h-4" />
            Αντιγραφή
          </button>
          <div 
            className="my-1"
            style={{ borderTop: '1px solid var(--outlook-border)' }}
          />
          <button
            onClick={() => {
              onDelete?.(contextMenu.id);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
            style={{ color: 'var(--outlook-error)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--outlook-error-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 className="w-4 h-4" />
            Διαγραφή
          </button>
        </div>
      )}
    </div>
  );
}

