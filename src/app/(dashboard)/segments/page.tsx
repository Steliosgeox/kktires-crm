'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Eye,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassCard } from '@/components/ui/glass-card';
import { messagesEl } from '@/lib/i18n/ui/messages-el';
import { toast } from '@/lib/stores/ui-store';

interface SegmentCondition {
  field: string;
  operator: string;
  value: string | number | boolean | null;
}

interface SegmentData {
  id: string;
  name: string;
  description: string | null;
  filters: {
    conditions: SegmentCondition[];
    logic: 'and' | 'or';
  } | null;
  customerCount: number;
  dynamicCount?: number;
  staticCount?: number;
  staticCustomerIds?: string[];
}

interface CustomerData {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  city: string | null;
}

const FILTER_FIELDS = [
  { value: 'city', label: 'Πόλη', type: 'text' },
  { value: 'country', label: 'Χώρα', type: 'text' },
  { value: 'category', label: 'Κατηγορία', type: 'select', options: ['retail', 'wholesale', 'fleet', 'garage', 'vip'] },
  { value: 'isVip', label: 'VIP', type: 'boolean' },
  { value: 'lifecycleStage', label: 'Στάδιο', type: 'select', options: ['lead', 'prospect', 'customer', 'churned'] },
  { value: 'revenue', label: 'Τζίρος', type: 'number' },
  { value: 'leadScore', label: 'Lead Score', type: 'number' },
];

const OPERATORS = {
  text: [
    { value: 'equals', label: 'Είναι' },
    { value: 'contains', label: 'Περιέχει' },
    { value: 'startsWith', label: 'Αρχίζει με' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'greaterThan', label: '>' },
    { value: 'lessThan', label: '<' },
    { value: 'greaterOrEqual', label: '>=' },
    { value: 'lessOrEqual', label: '<=' },
  ],
  boolean: [{ value: 'equals', label: 'Είναι' }],
  select: [
    { value: 'equals', label: 'Είναι' },
    { value: 'notEquals', label: 'Δεν είναι' },
  ],
};

export default function SegmentsPage() {
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerData[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [previewSegment, setPreviewSegment] = useState<SegmentData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSummary, setPreviewSummary] = useState({ dynamicCount: 0, staticCount: 0, totalResolved: 0 });
  const [previewCustomers, setPreviewCustomers] = useState<CustomerData[]>([]);

  const [newSegment, setNewSegment] = useState({
    name: '',
    description: '',
    staticCustomerIds: [] as string[],
    filters: {
      conditions: [{ field: 'city', operator: 'equals', value: '' }] as SegmentCondition[],
      logic: 'and' as 'and' | 'or',
    },
  });

  const deleteSegmentName = deleteId ? segments.find((segment) => segment.id === deleteId)?.name : null;

  useEffect(() => {
    void fetchSegments();
  }, []);

  useEffect(() => {
    if (!isCreating) return;
    const ac = new AbortController();
    const id = setTimeout(() => void fetchCustomers(customerSearch, ac.signal), 220);
    return () => {
      clearTimeout(id);
      ac.abort();
    };
  }, [isCreating, customerSearch]);

  const filteredSegments = useMemo(
    () =>
      segments.filter(
        (segment) =>
          segment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          segment.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery, segments]
  );

  async function fetchSegments() {
    setLoading(true);
    try {
      const response = await fetch('/api/segments');
      if (!response.ok) throw new Error('Failed to fetch segments');
      const data = await response.json();
      setSegments(data.segments || []);
    } catch (error) {
      toast.error('Αποτυχία φόρτωσης', error instanceof Error ? error.message : 'Αποτυχία φόρτωσης τμημάτων');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers(query: string, signal?: AbortSignal) {
    setMembersLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (query.trim()) params.set('search', query.trim());
      const response = await fetch(`/api/customers?${params.toString()}`, { signal });
      if (!response.ok) return;
      const data = await response.json();
      const rows = (data.customers || []) as CustomerData[];
      setCustomerOptions((current) => {
        const map = new Map<string, CustomerData>();
        for (const customer of [...rows, ...current]) map.set(customer.id, customer);
        return Array.from(map.values());
      });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        toast.error('Αποτυχία φόρτωσης', 'Δεν ήταν δυνατή η φόρτωση πελατών.');
      }
    } finally {
      setMembersLoading(false);
    }
  }

  function addCondition() {
    setNewSegment((current) => ({
      ...current,
      filters: {
        ...current.filters,
        conditions: [...current.filters.conditions, { field: 'city', operator: 'equals', value: '' }],
      },
    }));
  }

  function removeCondition(index: number) {
    setNewSegment((current) => ({
      ...current,
      filters: {
        ...current.filters,
        conditions: current.filters.conditions.filter((_, conditionIndex) => conditionIndex !== index),
      },
    }));
  }

  function updateCondition(index: number, updates: Partial<SegmentCondition>) {
    setNewSegment((current) => {
      const nextConditions = [...current.filters.conditions];
      nextConditions[index] = { ...nextConditions[index], ...updates };
      return {
        ...current,
        filters: { ...current.filters, conditions: nextConditions },
      };
    });
  }

  function toggleStaticMember(customerId: string) {
    setNewSegment((current) => ({
      ...current,
      staticCustomerIds: current.staticCustomerIds.includes(customerId)
        ? current.staticCustomerIds.filter((id) => id !== customerId)
        : [...current.staticCustomerIds, customerId],
    }));
  }

  async function handleCreateSegment() {
    if (!newSegment.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSegment.name,
          description: newSegment.description || undefined,
          filters: newSegment.filters,
          staticCustomerIds: newSegment.staticCustomerIds,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || 'Αποτυχία δημιουργίας τμήματος');

      toast.success('Δημιουργήθηκε', 'Το τμήμα δημιουργήθηκε επιτυχώς.');
      setIsCreating(false);
      setCustomerSearch('');
      setNewSegment({
        name: '',
        description: '',
        staticCustomerIds: [],
        filters: {
          conditions: [{ field: 'city', operator: 'equals', value: '' }],
          logic: 'and',
        },
      });
      await fetchSegments();
    } catch (error) {
      toast.error('Αποτυχία δημιουργίας', error instanceof Error ? error.message : 'Αποτυχία δημιουργίας');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteSegment(segmentId: string) {
    setDeleteId(segmentId);
    setDeleteOpen(true);
  }

  async function confirmDeleteSegment() {
    const segmentId = deleteId;
    if (!segmentId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/segments/${segmentId}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || 'Αποτυχία διαγραφής');
      toast.success('Διαγράφηκε', 'Το τμήμα διαγράφηκε επιτυχώς.');
      await fetchSegments();
    } catch (error) {
      toast.error('Αποτυχία διαγραφής', error instanceof Error ? error.message : 'Αποτυχία διαγραφής');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteId(null);
    }
  }

  async function openPreview(segment: SegmentData) {
    setPreviewSegment(segment);
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/segments/${segment.id}/customers?page=1&limit=100`);
      if (!response.ok) throw new Error('Failed to load segment members');
      const data = await response.json();
      setPreviewSummary(data.summary || { dynamicCount: 0, staticCount: 0, totalResolved: 0 });
      setPreviewCustomers(data.customers || []);
    } catch (error) {
      toast.error('Αποτυχία φόρτωσης', error instanceof Error ? error.message : 'Αποτυχία φόρτωσης μελών');
      setPreviewSegment(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  const staticCustomersPreview = customerOptions.filter((customer) =>
    newSegment.staticCustomerIds.includes(customer.id)
  );

  const getFieldType = (fieldValue: string) => FILTER_FIELDS.find((field) => field.value === fieldValue)?.type || 'text';

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteId(null);
          }
        }}
        onConfirm={confirmDeleteSegment}
        title="Διαγραφή Τμήματος"
        description={deleteSegmentName ? `Να διαγραφεί το τμήμα "${deleteSegmentName}";` : 'Να διαγραφεί το τμήμα;'}
        confirmText={messagesEl.common.delete}
        cancelText={messagesEl.common.cancel}
        variant="danger"
        loading={deleting}
      />

      <AnimatePresence>
        {previewSegment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4">
            <div className="max-w-4xl mx-auto mt-12 bg-[#11182b] border border-white/10 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{messagesEl.segments.resolvedMembers}: {previewSegment.name}</h3>
                  <p className="text-sm text-white/60">
                    {messagesEl.segments.dynamicCount}: {previewSummary.dynamicCount} • {messagesEl.segments.staticCount}: {previewSummary.staticCount} • {messagesEl.segments.resolvedCount}: {previewSummary.totalResolved}
                  </p>
                </div>
                <button onClick={() => setPreviewSegment(null)} className="p-2 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {previewLoading ? (
                  <div className="flex justify-center py-12 text-white/60"><Loader2 className="w-5 h-5 animate-spin mr-2" />{messagesEl.common.loading}</div>
                ) : (
                  previewCustomers.map((customer) => (
                    <div key={customer.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-sm font-medium text-white">{`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.company || 'Χωρίς όνομα'}</div>
                      <div className="text-xs text-white/60">{customer.email || '—'} {customer.city ? `• ${customer.city}` : ''}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{messagesEl.segments.title}</h1>
          <p className="text-white/60 mt-1">{messagesEl.segments.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="ghost" onClick={() => void fetchSegments()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {messagesEl.common.refresh}
          </GlassButton>
          <GlassButton onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {messagesEl.segments.newSegment}
          </GlassButton>
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Αναζήτηση τμημάτων..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/40"
          />
        </div>
      </GlassCard>

      {isCreating && (
        <GlassCard className="p-5">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-cyan-400" />
            {messagesEl.segments.newSegment}
          </h2>

          <div className="space-y-4">
            <input
              value={newSegment.name}
              onChange={(event) => setNewSegment((current) => ({ ...current, name: event.target.value }))}
              placeholder="Όνομα τμήματος"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white"
            />
            <textarea
              value={newSegment.description}
              onChange={(event) => setNewSegment((current) => ({ ...current, description: event.target.value }))}
              placeholder="Περιγραφή"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white resize-none"
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-white/70">{messagesEl.segments.dynamicRules}</label>
                <select
                  value={newSegment.filters.logic}
                  onChange={(event) =>
                    setNewSegment((current) => ({
                      ...current,
                      filters: { ...current.filters, logic: event.target.value as 'and' | 'or' },
                    }))
                  }
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="and">ΚΑΙ</option>
                  <option value="or">Ή</option>
                </select>
              </div>

              {newSegment.filters.conditions.map((condition, index) => {
                const type = getFieldType(condition.field) as keyof typeof OPERATORS;
                const field = FILTER_FIELDS.find((entry) => entry.value === condition.field);
                return (
                  <div key={`${condition.field}-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                    <select
                      value={condition.field}
                      onChange={(event) => updateCondition(index, { field: event.target.value, operator: 'equals', value: '' })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      {FILTER_FIELDS.map((entry) => (
                        <option key={entry.value} value={entry.value}>{entry.label}</option>
                      ))}
                    </select>
                    <select
                      value={condition.operator}
                      onChange={(event) => updateCondition(index, { operator: event.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      {OPERATORS[type].map((operator) => (
                        <option key={operator.value} value={operator.value}>{operator.label}</option>
                      ))}
                    </select>
                    {type === 'boolean' ? (
                      <select
                        value={String(condition.value)}
                        onChange={(event) => updateCondition(index, { value: event.target.value === 'true' })}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      >
                        <option value="true">Ναι</option>
                        <option value="false">Όχι</option>
                      </select>
                    ) : type === 'select' && field?.options ? (
                      <select
                        value={String(condition.value || '')}
                        onChange={(event) => updateCondition(index, { value: event.target.value })}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      >
                        <option value="">Επιλέξτε...</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={type === 'number' ? 'number' : 'text'}
                        value={String(condition.value || '')}
                        onChange={(event) => updateCondition(index, { value: type === 'number' ? Number(event.target.value || 0) : event.target.value })}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    )}
                    <button onClick={() => removeCondition(index)} className="px-2 rounded-lg hover:bg-white/10 text-white/70" disabled={newSegment.filters.conditions.length <= 1}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              <GlassButton variant="ghost" onClick={addCondition}>
                <Plus className="w-4 h-4 mr-2" />
                Προσθήκη Κριτηρίου
              </GlassButton>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">{messagesEl.segments.staticMembers}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Αναζήτηση πελατών..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/40"
                />
              </div>

              {membersLoading ? (
                <div className="flex items-center text-white/60 text-sm py-3"><Loader2 className="w-4 h-4 animate-spin mr-2" />{messagesEl.common.loading}</div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {customerOptions
                    .filter((customer) => {
                      if (!customerSearch.trim()) return true;
                      const text = `${customer.firstName || ''} ${customer.lastName || ''} ${customer.company || ''} ${customer.email || ''}`.toLowerCase();
                      return text.includes(customerSearch.toLowerCase());
                    })
                    .map((customer) => {
                      const selected = newSegment.staticCustomerIds.includes(customer.id);
                      const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.company || 'Χωρίς όνομα';
                      return (
                        <button
                          key={customer.id}
                          onClick={() => toggleStaticMember(customer.id)}
                          className={`w-full p-2 rounded-lg border text-left transition-all ${selected ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm text-white">{name}</div>
                              <div className="text-xs text-white/60">{customer.email || '—'}</div>
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selected ? 'bg-cyan-500 border-cyan-500' : 'border-white/30'}`}>
                              {selected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
              {staticCustomersPreview.length > 0 && (
                <div className="text-xs text-white/60">
                  {messagesEl.segments.staticCount}: {staticCustomersPreview.length}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <GlassButton variant="ghost" onClick={() => setIsCreating(false)}>{messagesEl.common.cancel}</GlassButton>
              <GlassButton onClick={handleCreateSegment} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {messagesEl.common.create}
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((index) => <div key={index} className="h-40 bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : filteredSegments.length === 0 ? (
        <GlassCard className="p-10 text-center text-white/70">{messagesEl.common.noResults}</GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSegments.map((segment) => (
            <GlassCard key={segment.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{segment.name}</h3>
                  <p className="text-xs text-white/50">{segment.filters?.conditions?.length || 0} κριτήρια</p>
                </div>
                <button onClick={() => handleDeleteSegment(segment.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/70">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {segment.description && <p className="text-white/60 text-sm mb-3 line-clamp-2">{segment.description}</p>}

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="p-2 rounded-lg bg-white/5 text-center text-white/70">
                  <div>{messagesEl.segments.dynamicCount}</div>
                  <div className="text-white font-semibold">{segment.dynamicCount ?? Math.max(0, segment.customerCount - (segment.staticCount ?? 0))}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/5 text-center text-white/70">
                  <div>{messagesEl.segments.staticCount}</div>
                  <div className="text-white font-semibold">{segment.staticCount ?? (segment.staticCustomerIds?.length || 0)}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/5 text-center text-white/70">
                  <div>{messagesEl.segments.resolvedCount}</div>
                  <div className="text-white font-semibold">{segment.customerCount}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-white/60 text-sm">
                  <Users className="w-4 h-4" />
                  {segment.customerCount} πελάτες
                </div>
                <GlassButton variant="ghost" size="sm" onClick={() => void openPreview(segment)}>
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  {messagesEl.segments.previewMembers}
                </GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
