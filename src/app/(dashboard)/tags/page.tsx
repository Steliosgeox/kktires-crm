'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tag, Plus, Trash2, Edit2, Search, Users, 
  Check, X, Palette, Save, RefreshCw
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';

interface TagData {
  id: string;
  name: string;
  color: string;
  description: string | null;
  customerCount?: number;
  createdAt: string;
}

const TAG_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#14B8A6', // Teal
];

export default function TagsPage() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    setLoading(true);
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTag() {
    if (!newTag.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag),
      });
      if (res.ok) {
        setNewTag({ name: '', color: '#3B82F6', description: '' });
        setIsCreating(false);
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTag() {
    if (!editingTag) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTag.name,
          color: editingTag.color,
          description: editingTag.description,
        }),
      });
      if (res.ok) {
        setEditingTag(null);
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την ετικέτα;')) return;
    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  }

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Ετικέτες</h1>
          <p className="text-white/60 mt-1">
            Διαχείριση ετικετών για κατηγοριοποίηση πελατών
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="ghost" onClick={fetchTags}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Ανανέωση
          </GlassButton>
          <GlassButton onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Νέα Ετικέτα
          </GlassButton>
        </div>
      </div>

      {/* Search */}
      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Αναζήτηση ετικετών..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </GlassCard>

      {/* Create New Tag Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a2e]/95 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-cyan-400" />
                Νέα Ετικέτα
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">Όνομα *</label>
                  <input
                    type="text"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    placeholder="π.χ. VIP, Χονδρική, Premium"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-2">Χρώμα</label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTag({ ...newTag, color })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          newTag.color === color 
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a2e] scale-110' 
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Περιγραφή</label>
                  <textarea
                    value={newTag.description}
                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                    placeholder="Προαιρετική περιγραφή..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>
                
                {/* Preview */}
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-2">Προεπισκόπηση:</p>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: newTag.color + '30', borderColor: newTag.color, borderWidth: 1 }}
                  >
                    <Tag className="w-3.5 h-3.5" style={{ color: newTag.color }} />
                    {newTag.name || 'Όνομα ετικέτας'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <GlassButton variant="ghost" onClick={() => setIsCreating(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Ακύρωση
                </GlassButton>
                <GlassButton onClick={handleCreateTag} disabled={!newTag.name.trim() || saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Δημιουργία
                </GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Tag Modal */}
      <AnimatePresence>
        {editingTag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingTag(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a2e]/95 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                Επεξεργασία Ετικέτας
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">Όνομα *</label>
                  <input
                    type="text"
                    value={editingTag.name}
                    onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-2">Χρώμα</label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditingTag({ ...editingTag, color })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          editingTag.color === color 
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a2e] scale-110' 
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Περιγραφή</label>
                  <textarea
                    value={editingTag.description || ''}
                    onChange={(e) => setEditingTag({ ...editingTag, description: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <GlassButton variant="ghost" onClick={() => setEditingTag(null)}>
                  <X className="w-4 h-4 mr-2" />
                  Ακύρωση
                </GlassButton>
                <GlassButton onClick={handleUpdateTag} disabled={!editingTag.name.trim() || saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Αποθήκευση
                </GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tags Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTags.length === 0 ? (
        <GlassCard className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'Δεν βρέθηκαν ετικέτες' : 'Δεν υπάρχουν ετικέτες ακόμα'}
            </h3>
            <p className="text-white/60 mb-6">
              {searchQuery 
                ? 'Δοκιμάστε διαφορετική αναζήτηση' 
                : 'Δημιουργήστε ετικέτες για να κατηγοριοποιήσετε τους πελάτες σας'}
            </p>
            {!searchQuery && (
              <GlassButton onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Δημιουργία Ετικέτας
              </GlassButton>
            )}
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTags.map((tag, index) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-5 hover:border-white/20 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: tag.color + '30', borderColor: tag.color, borderWidth: 1 }}
                  >
                    <Tag className="w-3.5 h-3.5" style={{ color: tag.color }} />
                    {tag.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingTag(tag)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {tag.description && (
                  <p className="text-white/60 text-sm mb-3 line-clamp-2">
                    {tag.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-white/40 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{tag.customerCount || 0} πελάτες</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && tags.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{tags.length}</p>
                <p className="text-white/60 text-sm">Συνολικές Ετικέτες</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {tags.reduce((sum, t) => sum + (t.customerCount || 0), 0)}
                </p>
                <p className="text-white/60 text-sm">Ετικετοποιημένοι Πελάτες</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {new Set(tags.map(t => t.color)).size}
                </p>
                <p className="text-white/60 text-sm">Χρώματα σε χρήση</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

