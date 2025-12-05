'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, Plus, Trash2, Search, Users, 
  Check, X, RefreshCw, Play
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  filters: {
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    logic: 'and' | 'or';
  } | null;
  customerCount: number;
  createdAt: string;
}

const FILTER_FIELDS = [
  { value: 'city', label: 'Πόλη', type: 'text' },
  { value: 'category', label: 'Κατηγορία', type: 'select', options: ['retail', 'wholesale', 'fleet', 'garage', 'vip'] },
  { value: 'isVip', label: 'VIP', type: 'boolean' },
  { value: 'lifecycleStage', label: 'Στάδιο', type: 'select', options: ['lead', 'prospect', 'customer', 'churned'] },
  { value: 'revenue', label: 'Τζίρος', type: 'number' },
  { value: 'leadScore', label: 'Lead Score', type: 'number' },
  { value: 'country', label: 'Χώρα', type: 'text' },
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
  boolean: [
    { value: 'equals', label: 'Είναι' },
  ],
  select: [
    { value: 'equals', label: 'Είναι' },
    { value: 'notEquals', label: 'Δεν είναι' },
  ],
};

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newSegment, setNewSegment] = useState({
    name: '',
    description: '',
    filters: {
      conditions: [{ field: 'city', operator: 'equals', value: '' }],
      logic: 'and' as 'and' | 'or',
    },
  });

  useEffect(() => {
    fetchSegments();
  }, []);

  async function fetchSegments() {
    setLoading(true);
    try {
      const res = await fetch('/api/segments');
      if (res.ok) {
        const data = await res.json();
        setSegments(data.segments || []);
      }
    } catch (error) {
      console.error('Failed to fetch segments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSegment() {
    if (!newSegment.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSegment),
      });
      if (res.ok) {
        setNewSegment({
          name: '',
          description: '',
          filters: {
            conditions: [{ field: 'city', operator: 'equals', value: '' }],
            logic: 'and',
          },
        });
        setIsCreating(false);
        fetchSegments();
      }
    } catch (error) {
      console.error('Failed to create segment:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSegment(segmentId: string) {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το τμήμα;')) return;
    try {
      const res = await fetch(`/api/segments/${segmentId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSegments();
      }
    } catch (error) {
      console.error('Failed to delete segment:', error);
    }
  }

  function addCondition() {
    setNewSegment({
      ...newSegment,
      filters: {
        ...newSegment.filters,
        conditions: [
          ...newSegment.filters.conditions,
          { field: 'city', operator: 'equals', value: '' },
        ],
      },
    });
  }

  function removeCondition(index: number) {
    setNewSegment({
      ...newSegment,
      filters: {
        ...newSegment.filters,
        conditions: newSegment.filters.conditions.filter((_: { field: string; operator: string; value: string }, i: number) => i !== index),
      },
    });
  }

  function updateCondition(index: number, updates: Partial<{ field: string; operator: string; value: string }>) {
    const newConditions = [...newSegment.filters.conditions];
    newConditions[index] = { ...newConditions[index], ...updates as { field: string; operator: string; value: string } };
    setNewSegment({
      ...newSegment,
      filters: {
        ...newSegment.filters,
        conditions: newConditions,
      },
    });
  }

  const filteredSegments = segments.filter((segment: Segment) =>
    segment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    segment.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFieldType = (fieldValue: string) => {
    return FILTER_FIELDS.find(f => f.value === fieldValue)?.type || 'text';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Τμήματα Πελατών</h1>
          <p className="text-white/60 mt-1">
            Δυναμικές ομάδες πελατών με βάση κριτήρια
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="ghost" onClick={fetchSegments}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Ανανέωση
          </GlassButton>
          <GlassButton onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Νέο Τμήμα
          </GlassButton>
        </div>
      </div>

      {/* Search */}
      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Αναζήτηση τμημάτων..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </GlassCard>

      {/* Create Segment Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a2e]/95 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-cyan-400" />
                Νέο Τμήμα Πελατών
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">Όνομα *</label>
                  <input
                    type="text"
                    value={newSegment.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSegment({ ...newSegment, name: e.target.value })}
                    placeholder="π.χ. VIP Πελάτες Αθήνας"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Περιγραφή</label>
                  <textarea
                    value={newSegment.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewSegment({ ...newSegment, description: e.target.value })}
                    placeholder="Περιγραφή του τμήματος..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>

                {/* Filters */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-white/60 text-sm">Κριτήρια Φιλτραρίσματος</label>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/40">Λογική:</span>
                      <select
                        value={newSegment.filters.logic}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSegment({
                          ...newSegment,
                          filters: { ...newSegment.filters, logic: e.target.value as 'and' | 'or' }
                        })}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="and">ΚΑΙ</option>
                        <option value="or">Ή</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {newSegment.filters.conditions.map((condition: { field: string; operator: string; value: string }, index: number) => {
                      const fieldType = getFieldType(condition.field);
                      const operators = OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text;
                      const fieldConfig = FILTER_FIELDS.find(f => f.value === condition.field);

                      return (
                        <div key={index} className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
                          {/* Field */}
                          <select
                            value={condition.field}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCondition(index, { field: e.target.value, operator: 'equals', value: '' })}
                            className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 flex-shrink-0"
                          >
                            {FILTER_FIELDS.map(field => (
                              <option key={field.value} value={field.value}>{field.label}</option>
                            ))}
                          </select>

                          {/* Operator */}
                          <select
                            value={condition.operator}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCondition(index, { operator: e.target.value })}
                            className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 flex-shrink-0"
                          >
                            {operators.map(op => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>

                          {/* Value */}
                          {fieldType === 'boolean' ? (
                            <select
                              value={condition.value as string}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCondition(index, { value: e.target.value })}
                              className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                            >
                              <option value="true">Ναι</option>
                              <option value="false">Όχι</option>
                            </select>
                          ) : fieldType === 'select' && fieldConfig?.options ? (
                            <select
                              value={condition.value as string}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCondition(index, { value: e.target.value })}
                              className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                            >
                              <option value="">Επιλέξτε...</option>
                              {fieldConfig.options.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={fieldType === 'number' ? 'number' : 'text'}
                              value={condition.value as string}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCondition(index, { 
                                value: e.target.value 
                              })}
                              placeholder="Τιμή..."
                              className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-cyan-500/50"
                            />
                          )}

                          {/* Remove */}
                          {newSegment.filters.conditions.length > 1 && (
                            <button
                              onClick={() => removeCondition(index)}
                              className="p-2 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={addCondition}
                    className="mt-3 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Προσθήκη Κριτηρίου
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <GlassButton variant="ghost" onClick={() => setIsCreating(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Ακύρωση
                </GlassButton>
                <GlassButton onClick={handleCreateSegment} disabled={!newSegment.name.trim() || saving}>
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

      {/* Segments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredSegments.length === 0 ? (
        <GlassCard className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'Δεν βρέθηκαν τμήματα' : 'Δεν υπάρχουν τμήματα ακόμα'}
            </h3>
            <p className="text-white/60 mb-6">
              {searchQuery 
                ? 'Δοκιμάστε διαφορετική αναζήτηση' 
                : 'Δημιουργήστε τμήματα για να ομαδοποιήσετε τους πελάτες σας'}
            </p>
            {!searchQuery && (
              <GlassButton onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Δημιουργία Τμήματος
              </GlassButton>
            )}
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSegments.map((segment: Segment, index: number) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-5 hover:border-white/20 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <FolderKanban className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{segment.name}</h3>
                      <p className="text-white/40 text-xs">
                        {segment.filters?.conditions?.length || 0} κριτήρια
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteSegment(segment.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {segment.description && (
                  <p className="text-white/60 text-sm mb-3 line-clamp-2">
                    {segment.description}
                  </p>
                )}

                {/* Conditions Preview */}
                {segment.filters?.conditions && segment.filters.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {segment.filters.conditions.slice(0, 3).map((cond: { field: string; operator: string; value: unknown }, i: number) => (
                      <span 
                        key={i}
                        className="text-xs px-2 py-1 bg-white/5 rounded text-white/60"
                      >
                        {FILTER_FIELDS.find(f => f.value === cond.field)?.label}: {String(cond.value)}
                      </span>
                    ))}
                    {segment.filters.conditions.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-white/5 rounded text-white/40">
                        +{segment.filters.conditions.length - 3} ακόμα
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-white/60">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">{segment.customerCount}</span>
                    <span className="text-sm">πελάτες</span>
                  </div>
                  <GlassButton variant="ghost" size="sm">
                    <Play className="w-3 h-3 mr-1" />
                    Προβολή
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

