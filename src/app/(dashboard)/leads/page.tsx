'use client';

import { useState, useEffect } from 'react';
import {
  UserPlus,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MoreHorizontal,
  UserCheck,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassAvatar } from '@/components/ui/glass-avatar';
import { GlassDropdown } from '@/components/ui/glass-dropdown';
import { GlassSkeleton } from '@/components/ui/glass-skeleton';
import { getLeadStatusLabel } from '@/lib/utils';

interface Lead {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  score: number | null;
  createdAt: string;
}

const statusColors = {
  new: 'primary',
  contacted: 'warning',
  qualified: 'success',
  proposal: 'secondary',
  won: 'success',
  lost: 'error',
} as const;

const sourceLabels: Record<string, string> = {
  website: 'Ιστοσελίδα',
  referral: 'Σύσταση',
  import: 'Εισαγωγή',
  manual: 'Χειροκίνητη',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [byStatus, setByStatus] = useState<Record<string, Lead[]>>({});

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setByStatus(data.byStatus || {});
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    return (
      lead.firstName.toLowerCase().includes(query) ||
      lead.lastName?.toLowerCase().includes(query) ||
      lead.company?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query)
    );
  });

  const getRowActions = (leadId: string) => [
    { key: 'view', label: 'Προβολή', onClick: () => {} },
    { key: 'contact', label: 'Επικοινωνία', icon: <Phone className="h-4 w-4" />, onClick: () => {} },
    { key: 'convert', label: 'Μετατροπή σε Πελάτη', icon: <UserCheck className="h-4 w-4" />, onClick: () => {} },
    { key: 'divider1', label: '', divider: true },
    { key: 'delete', label: 'Διαγραφή', icon: <Trash2 className="h-4 w-4" />, onClick: () => {}, danger: true },
  ];

  const statuses = ['new', 'contacted', 'qualified', 'proposal'];

  // Filter by search per status
  const getFilteredByStatus = (status: string) => {
    return filteredLeads.filter((l) => l.status === status);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Δυνητικοί Πελάτες</h1>
          <p className="text-white/60">
            Διαχείριση leads και pipeline πωλήσεων ({leads.length} σύνολο)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="ghost" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Ανανέωση
          </GlassButton>
          <GlassButton variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
            Νέος Δυνητικός
          </GlassButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statuses.map((status) => {
          const count = leads.filter((l) => l.status === status).length;
          return (
            <GlassCard key={status}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">{getLeadStatusLabel(status)}</p>
                  <p className="text-2xl font-bold text-white">{loading ? '...' : count}</p>
                </div>
                <GlassBadge variant={statusColors[status as keyof typeof statusColors]}>
                  {count}
                </GlassBadge>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <GlassInput
            placeholder="Αναζήτηση δυνητικών..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <GlassButton variant="default" leftIcon={<Filter className="h-4 w-4" />}>
          Φίλτρα
        </GlassButton>
      </div>

      {/* Leads Kanban */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {statuses.map((status) => (
            <div key={status} className="space-y-3">
              <GlassSkeleton className="h-6 w-24" />
              <GlassSkeleton className="h-32 w-full" />
              <GlassSkeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {statuses.map((status) => {
            const statusLeads = getFilteredByStatus(status);
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/70">
                    {getLeadStatusLabel(status)}
                  </h3>
                  <span className="text-xs text-white/40">{statusLeads.length}</span>
                </div>
                <div className="space-y-3">
                  {statusLeads.map((lead) => (
                    <GlassCard key={lead.id} padding="sm" className="cursor-pointer" hover glow="primary">
                      <div className="flex items-start justify-between mb-3">
                        <GlassAvatar
                          name={`${lead.firstName} ${lead.lastName || ''}`}
                          size="sm"
                        />
                        <GlassDropdown
                          trigger={
                            <button className="text-white/40 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          }
                          items={getRowActions(lead.id)}
                        />
                      </div>
                      <h4 className="font-medium text-white">
                        {lead.firstName} {lead.lastName}
                      </h4>
                      {lead.company && (
                        <p className="text-sm text-white/50">{lead.company}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-white/40">
                        {lead.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{lead.email}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]">
                        <GlassBadge size="sm" variant="default">
                          {sourceLabels[lead.source] || lead.source}
                        </GlassBadge>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/40">Score:</span>
                          <span className="text-xs font-medium text-cyan-400">{lead.score || 0}</span>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                  {statusLeads.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/[0.1] p-6 text-center">
                      <p className="text-sm text-white/30">Κανένας δυνητικός</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
