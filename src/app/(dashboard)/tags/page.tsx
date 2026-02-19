'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Edit2,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tag,
  Trash2,
  Loader2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassCard } from '@/components/ui/glass-card';
import { toast } from '@/lib/stores/ui-store';
import { messagesEl } from '@/lib/i18n/ui/messages-el';

interface TagData {
  id: string;
  name: string;
  color: string;
  description: string | null;
  customerCount?: number;
}

interface CustomerData {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  city: string | null;
}

const TAG_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#14B8A6'];

export default function TagsPage() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [memberTag, setMemberTag] = useState<TagData | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersSaving, setMembersSaving] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<CustomerData[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const deleteTagName = deleteId ? tags.find((tag) => tag.id === deleteId)?.name : null;

  useEffect(() => {
    void fetchTags();
  }, []);

  useEffect(() => {
    if (!memberTag) return;
    const ac = new AbortController();
    const id = setTimeout(() => {
      void fetchCustomersForMembers(memberSearch, ac.signal);
    }, 220);
    return () => {
      clearTimeout(id);
      ac.abort();
    };
  }, [memberTag, memberSearch]);

  const filteredTags = useMemo(
    () =>
      tags.filter(
        (tag) =>
          tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery, tags]
  );

  async function fetchTags() {
    setLoading(true);
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      toast.error('Αποτυχία φόρτωσης', error instanceof Error ? error.message : 'Αποτυχία φόρτωσης ετικετών');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomersForMembers(query: string, signal?: AbortSignal) {
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (query.trim()) params.set('search', query.trim());
      const response = await fetch(`/api/customers?${params.toString()}`, { signal });
      if (!response.ok) return;
      const data = await response.json();
      const options = (data.customers || []) as CustomerData[];
      setCustomerOptions((current) => {
        const byId = new Map<string, CustomerData>();
        for (const customer of [...options, ...current]) {
          byId.set(customer.id, customer);
        }
        return Array.from(byId.values());
      });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        toast.error('Αποτυχία φόρτωσης', 'Δεν ήταν δυνατή η φόρτωση πελατών.');
      }
    }
  }

  async function openMembersModal(tag: TagData) {
    setMemberTag(tag);
    setMemberSearch('');
    setMembersLoading(true);
    try {
      const [membersRes, customersRes] = await Promise.all([
        fetch(`/api/tags/${tag.id}/customers?page=1&limit=200`),
        fetch('/api/customers?page=1&limit=100'),
      ]);

      if (!membersRes.ok) throw new Error('Failed to fetch tag members');
      const membersData = await membersRes.json();
      const members = (membersData.customers || []) as CustomerData[];
      setSelectedMemberIds(members.map((customer) => customer.id));

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        const customers = (customersData.customers || []) as CustomerData[];
        const byId = new Map<string, CustomerData>();
        for (const customer of [...customers, ...members]) byId.set(customer.id, customer);
        setCustomerOptions(Array.from(byId.values()));
      } else {
        setCustomerOptions(members);
      }
    } catch (error) {
      toast.error('Αποτυχία φόρτωσης', error instanceof Error ? error.message : 'Αποτυχία φόρτωσης μελών');
      setMemberTag(null);
    } finally {
      setMembersLoading(false);
    }
  }

  async function saveMembers() {
    if (!memberTag) return;
    setMembersSaving(true);
    try {
      const response = await fetch(`/api/tags/${memberTag.id}/customers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: selectedMemberIds }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Αποτυχία αποθήκευσης μελών');
      }
      toast.success('Αποθηκεύτηκαν', 'Τα μέλη της ετικέτας ενημερώθηκαν.');
      setMemberTag(null);
      await fetchTags();
    } catch (error) {
      toast.error('Αποτυχία αποθήκευσης', error instanceof Error ? error.message : 'Αποτυχία αποθήκευσης');
    } finally {
      setMembersSaving(false);
    }
  }

  function toggleMember(customerId: string) {
    setSelectedMemberIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId]
    );
  }

  async function handleCreateTag() {
    if (!newTag.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || 'Αποτυχία δημιουργίας ετικέτας');
      setNewTag({ name: '', color: '#3B82F6', description: '' });
      setIsCreating(false);
      toast.success('Δημιουργήθηκε', 'Η ετικέτα δημιουργήθηκε επιτυχώς.');
      await fetchTags();
    } catch (error) {
      toast.error('Αποτυχία', error instanceof Error ? error.message : 'Αποτυχία δημιουργίας');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTag() {
    if (!editingTag) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTag.name,
          color: editingTag.color,
          description: editingTag.description,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || 'Αποτυχία ενημέρωσης ετικέτας');
      setEditingTag(null);
      toast.success('Αποθηκεύτηκε', 'Η ετικέτα ενημερώθηκε επιτυχώς.');
      await fetchTags();
    } catch (error) {
      toast.error('Αποτυχία', error instanceof Error ? error.message : 'Αποτυχία ενημέρωσης');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteTag(tagId: string) {
    setDeleteId(tagId);
    setDeleteOpen(true);
  }

  async function confirmDeleteTag() {
    const tagId = deleteId;
    if (!tagId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || 'Αποτυχία διαγραφής');
      toast.success('Διαγράφηκε', 'Η ετικέτα διαγράφηκε επιτυχώς.');
      await fetchTags();
    } catch (error) {
      toast.error('Αποτυχία διαγραφής', error instanceof Error ? error.message : 'Αποτυχία διαγραφής');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteId(null);
    }
  }

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
        onConfirm={confirmDeleteTag}
        title="Διαγραφή Ετικέτας"
        description={deleteTagName ? `Να διαγραφεί η ετικέτα "${deleteTagName}";` : 'Να διαγραφεί η ετικέτα;'}
        confirmText={messagesEl.common.delete}
        cancelText={messagesEl.common.cancel}
        variant="danger"
        loading={deleting}
      />

      <AnimatePresence>
        {memberTag && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4">
            <div className="max-w-4xl mx-auto mt-12 bg-[#11182b] border border-white/10 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{messagesEl.tags.manageMembers}: {memberTag.name}</h3>
                  <p className="text-sm text-white/60">{messagesEl.tags.selectedMembers}: {selectedMemberIds.length}</p>
                </div>
                <button onClick={() => setMemberTag(null)} className="p-2 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-4 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Αναζήτηση πελατών..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {membersLoading || membersSaving ? (
                  <div className="flex items-center justify-center py-12 text-white/60">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> {messagesEl.common.loading}
                  </div>
                ) : (
                  customerOptions
                    .filter((customer) => {
                      if (!memberSearch.trim()) return true;
                      const text = `${customer.firstName || ''} ${customer.lastName || ''} ${customer.company || ''} ${customer.email || ''}`.toLowerCase();
                      return text.includes(memberSearch.toLowerCase());
                    })
                    .map((customer) => {
                      const selected = selectedMemberIds.includes(customer.id);
                      const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.company || 'Χωρίς όνομα';
                      return (
                        <button
                          key={customer.id}
                          onClick={() => toggleMember(customer.id)}
                          className={`w-full p-3 rounded-lg border transition-all text-left ${selected ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-white">{name}</div>
                              <div className="text-xs text-white/60">{customer.email || '—'} {customer.city ? `• ${customer.city}` : ''}</div>
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selected ? 'bg-cyan-500 border-cyan-500' : 'border-white/30'}`}>
                              {selected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })
                )}
              </div>

              <div className="p-4 border-t border-white/10 flex justify-end gap-3">
                <GlassButton variant="ghost" onClick={() => setMemberTag(null)}>{messagesEl.common.cancel}</GlassButton>
                <GlassButton onClick={saveMembers} disabled={membersSaving}>
                  {membersSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {messagesEl.common.save}
                </GlassButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{messagesEl.tags.title}</h1>
          <p className="text-white/60 mt-1">{messagesEl.tags.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="ghost" onClick={() => void fetchTags()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {messagesEl.common.refresh}
          </GlassButton>
          <GlassButton onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {messagesEl.tags.newTag}
          </GlassButton>
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Αναζήτηση ετικετών..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/40"
          />
        </div>
      </GlassCard>

      {(isCreating || editingTag) && (
        <GlassCard className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            {editingTag ? <Edit2 className="w-5 h-5 text-cyan-400" /> : <Tag className="w-5 h-5 text-cyan-400" />}
            {editingTag ? messagesEl.tags.editTag : messagesEl.tags.newTag}
          </h2>
          <div className="space-y-4">
            <input
              value={editingTag ? editingTag.name : newTag.name}
              onChange={(event) =>
                editingTag
                  ? setEditingTag({ ...editingTag, name: event.target.value })
                  : setNewTag((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Όνομα ετικέτας"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white"
            />
            <textarea
              value={editingTag ? editingTag.description || '' : newTag.description}
              onChange={(event) =>
                editingTag
                  ? setEditingTag({ ...editingTag, description: event.target.value })
                  : setNewTag((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Περιγραφή"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white resize-none"
            />
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((color) => {
                const selected = (editingTag ? editingTag.color : newTag.color) === color;
                return (
                  <button
                    key={color}
                    onClick={() =>
                      editingTag
                        ? setEditingTag({ ...editingTag, color })
                        : setNewTag((current) => ({ ...current, color }))
                    }
                    className={`w-7 h-7 rounded-full border-2 ${selected ? 'border-white' : 'border-transparent'}`}
                    style={{ background: color }}
                  />
                );
              })}
            </div>
            <div className="flex gap-2 justify-end">
              <GlassButton variant="ghost" onClick={() => { setIsCreating(false); setEditingTag(null); }}>
                {messagesEl.common.cancel}
              </GlassButton>
              <GlassButton onClick={editingTag ? handleUpdateTag : handleCreateTag} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {messagesEl.common.save}
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((index) => <div key={index} className="h-36 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredTags.length === 0 ? (
        <GlassCard className="p-10 text-center text-white/70">{messagesEl.common.noResults}</GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTags.map((tag) => (
            <GlassCard key={tag.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{ backgroundColor: `${tag.color}30`, borderColor: tag.color, borderWidth: 1 }}>
                  <Tag className="w-3.5 h-3.5" style={{ color: tag.color }} />
                  {tag.name}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingTag(tag)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => void openMembersModal(tag)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><UserCheck className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteTag(tag.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/70"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {tag.description && <p className="text-white/60 text-sm mb-3 line-clamp-2">{tag.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-white/50">
                  <Users className="w-4 h-4" /> {tag.customerCount || 0} πελάτες
                </div>
                <GlassButton variant="ghost" size="sm" onClick={() => void openMembersModal(tag)}>
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  {messagesEl.tags.manageMembers}
                </GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {!loading && tags.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center"><Tag className="w-5 h-5 text-cyan-400" /></div>
              <div><p className="text-2xl font-bold text-white">{tags.length}</p><p className="text-white/60 text-sm">{messagesEl.tags.totalTags}</p></div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-purple-400" /></div>
              <div><p className="text-2xl font-bold text-white">{tags.reduce((sum, tag) => sum + (tag.customerCount || 0), 0)}</p><p className="text-white/60 text-sm">{messagesEl.tags.taggedCustomers}</p></div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center"><Palette className="w-5 h-5 text-green-400" /></div>
              <div><p className="text-2xl font-bold text-white">{new Set(tags.map((tag) => tag.color)).size}</p><p className="text-white/60 text-sm">{messagesEl.tags.colorsInUse}</p></div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
