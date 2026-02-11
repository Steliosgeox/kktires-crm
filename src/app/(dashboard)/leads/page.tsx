'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { GlassModal, GlassModalBody, GlassModalFooter } from '@/components/ui/glass-modal';
import { GlassSelect } from '@/components/ui/glass-select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/stores/ui-store';
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
  notes: string | null;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    source: 'manual',
    status: 'new',
    score: '0',
    notes: '',
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openCreate();
      router.replace('/leads');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
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

  const openCreate = () => {
    setEditingLead(null);
    setForm({
      firstName: '',
      lastName: '',
      company: '',
      email: '',
      phone: '',
      source: 'manual',
      status: 'new',
      score: '0',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || 'manual',
      status: lead.status || 'new',
      score: String(lead.score ?? 0),
      notes: lead.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) {
      toast.error('Σφάλμα', 'Το όνομα είναι υποχρεωτικό.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || null,
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        source: form.source,
        status: form.status,
        score: Number.parseInt(form.score || '0', 10) || 0,
        notes: form.notes.trim() || null,
      };

      const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads';
      const method = editingLead ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to save lead');

      toast.success('Αποθηκεύτηκε', editingLead ? 'Το lead ενημερώθηκε.' : 'Το lead δημιουργήθηκε.');
      setModalOpen(false);
      await fetchLeads();
    } catch (e) {
      toast.error('Αποτυχία αποθήκευσης', e instanceof Error ? e.message : 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async (lead: Lead) => {
    setConvertingId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to convert lead');

      toast.success('Μετατροπή', 'Το lead μετατράπηκε σε πελάτη.');
      await fetchLeads();
    } catch (e) {
      toast.error('Αποτυχία μετατροπής', e instanceof Error ? e.message : 'Failed to convert lead');
    } finally {
      setConvertingId(null);
    }
  };

  const handleDelete = async () => {
    if (!editingLead) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${editingLead.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to delete lead');
      toast.success('Διαγράφηκε', 'Το lead διαγράφηκε.');
      setDeleteDialogOpen(false);
      setModalOpen(false);
      await fetchLeads();
    } catch (e) {
      toast.error('Αποτυχία διαγραφής', e instanceof Error ? e.message : 'Failed to delete lead');
    } finally {
      setDeleting(false);
    }
  };

  const handleContact = (lead: Lead) => {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, '_self');
      return;
    }
    if (lead.email) {
      window.open(`mailto:${lead.email}`, '_self');
      return;
    }
    toast.info('Επικοινωνία', 'Δεν υπάρχει τηλέφωνο ή email για αυτό το lead.');
  };

  const getRowActions = (lead: Lead) => [
    { key: 'view', label: 'Προβολή', onClick: () => openEdit(lead) },
    { key: 'contact', label: 'Επικοινωνία', icon: <Phone className="h-4 w-4" />, onClick: () => handleContact(lead) },
    {
      key: 'convert',
      label: 'Μετατροπή σε Πελάτη',
      icon: <UserCheck className="h-4 w-4" />,
      onClick: () => handleConvert(lead),
      disabled: convertingId === lead.id,
    },
    { key: 'divider1', label: '', divider: true },
    { key: 'delete', label: 'Διαγραφή', icon: <Trash2 className="h-4 w-4" />, onClick: () => {
      setEditingLead(lead);
      setDeleteDialogOpen(true);
    }, danger: true },
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
          <GlassButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
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
        <GlassButton variant="default" leftIcon={<Filter className="h-4 w-4" />} disabled title="Not implemented yet">
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
                    <GlassCard
                      key={lead.id}
                      padding="sm"
                      className="cursor-pointer"
                      hover
                      glow="primary"
                      onClick={() => openEdit(lead)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <GlassAvatar
                          name={`${lead.firstName} ${lead.lastName || ''}`}
                          size="sm"
                        />
                        <GlassDropdown
                          trigger={
                            <button className="text-white/40 hover:text-white" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          }
                          items={getRowActions(lead)}
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

      <GlassModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLead ? 'Επεξεργασία Lead' : 'Νέος Δυνητικός'}
        size="lg"
      >
        <GlassModalBody>
          <div className="grid gap-5 md:grid-cols-2">
            <GlassInput
              label="Όνομα *"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
            <GlassInput
              label="Επώνυμο"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
            <GlassInput
              label="Εταιρεία"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
            <GlassInput
              label="Τηλέφωνο"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <GlassInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />

            <GlassSelect
              label="Πηγή"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              options={[
                { value: 'manual', label: 'Χειροκίνητη' },
                { value: 'website', label: 'Ιστοσελίδα' },
                { value: 'referral', label: 'Σύσταση' },
                { value: 'import', label: 'Εισαγωγή' },
              ]}
            />

            <GlassSelect
              label="Κατάσταση"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              options={[
                { value: 'new', label: 'Νέο' },
                { value: 'contacted', label: 'Επικοινωνήθηκε' },
                { value: 'qualified', label: 'Κατάλληλο' },
                { value: 'proposal', label: 'Πρόταση' },
                { value: 'lost', label: 'Χάθηκε' },
                { value: 'won', label: 'Κερδήθηκε' },
              ]}
            />

            <GlassInput
              label="Score"
              type="number"
              value={form.score}
              onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-white/70">Σημειώσεις</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={4}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white/90 placeholder:text-white/40 backdrop-blur-xl shadow-sm transition-all duration-150 outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(14,165,233,0.2)]"
            />
          </div>
        </GlassModalBody>

        <GlassModalFooter className={editingLead ? 'justify-between' : undefined}>
          {editingLead ? (
            <div className="flex items-center gap-2">
              <GlassButton
                variant="danger"
                onClick={() => setDeleteDialogOpen(true)}
                leftIcon={<Trash2 className="h-4 w-4" />}
                disabled={saving}
              >
                Διαγραφή
              </GlassButton>
              <GlassButton
                variant="default"
                onClick={() => handleConvert(editingLead)}
                leftIcon={<UserCheck className="h-4 w-4" />}
                disabled={saving || convertingId === editingLead.id}
              >
                {convertingId === editingLead.id ? 'Μετατροπή...' : 'Μετατροπή'}
              </GlassButton>
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            <GlassButton variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Ακύρωση
            </GlassButton>
            <GlassButton variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </GlassButton>
          </div>
        </GlassModalFooter>
      </GlassModal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Διαγραφή Lead"
        description="Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το lead; Η ενέργεια δεν μπορεί να αναιρεθεί."
        confirmText="Διαγραφή"
        cancelText="Ακύρωση"
        variant="danger"
      />
    </div>
  );
}
