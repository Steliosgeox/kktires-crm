'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, FileSpreadsheet, Users, Calendar, Check, RefreshCw,
  Filter, ChevronDown
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';

const EXPORT_FIELDS = [
  { value: 'firstName', label: 'Όνομα', default: true },
  { value: 'lastName', label: 'Επώνυμο', default: true },
  { value: 'company', label: 'Εταιρεία', default: true },
  { value: 'email', label: 'Email', default: true },
  { value: 'phone', label: 'Τηλέφωνο', default: true },
  { value: 'mobile', label: 'Κινητό', default: true },
  { value: 'street', label: 'Διεύθυνση', default: false },
  { value: 'city', label: 'Πόλη', default: true },
  { value: 'postalCode', label: 'Τ.Κ.', default: false },
  { value: 'country', label: 'Χώρα', default: false },
  { value: 'afm', label: 'ΑΦΜ', default: true },
  { value: 'doy', label: 'ΔΟΥ', default: false },
  { value: 'category', label: 'Κατηγορία', default: true },
  { value: 'lifecycleStage', label: 'Στάδιο', default: false },
  { value: 'revenue', label: 'Τζίρος', default: false },
  { value: 'notes', label: 'Σημειώσεις', default: false },
  { value: 'createdAt', label: 'Ημ/νία Δημιουργίας', default: false },
];

export default function ExportPage() {
  const [selectedFields, setSelectedFields] = useState<string[]>(
    EXPORT_FIELDS.filter(f => f.default).map(f => f.value)
  );
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [filter, setFilter] = useState<'all' | 'active' | 'vip'>('all');
  const [exporting, setExporting] = useState(false);
  const [exportStats, setExportStats] = useState<{ count: number } | null>(null);

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const selectAll = () => {
    setSelectedFields(EXPORT_FIELDS.map(f => f.value));
  };

  const selectNone = () => {
    setSelectedFields(['firstName']); // Always keep firstName
  };

  const handleExport = async () => {
    setExporting(true);
    
    try {
      const res = await fetch('/api/customers/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: selectedFields,
          format,
          filter,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pelates_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Get stats from header
        const countHeader = res.headers.get('X-Export-Count');
        if (countHeader) {
          setExportStats({ count: parseInt(countHeader) });
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Εξαγωγή Πελατών</h1>
        <p className="text-white/60 mt-1">
          Εξαγωγή δεδομένων πελατών σε CSV ή Excel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field Selection */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Πεδία Εξαγωγής</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Όλα
              </button>
              <span className="text-white/20">|</span>
              <button
                onClick={selectNone}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Κανένα
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {EXPORT_FIELDS.map((field) => (
              <label
                key={field.value}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFields.includes(field.value)
                    ? 'bg-cyan-500/10 border border-cyan-500/30'
                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.value)}
                  onChange={() => toggleField(field.value)}
                  disabled={field.value === 'firstName'}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                  selectedFields.includes(field.value)
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'border-white/20'
                }`}>
                  {selectedFields.includes(field.value) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-white text-sm">{field.label}</span>
              </label>
            ))}
          </div>

          <p className="text-white/40 text-sm mt-4">
            {selectedFields.length} πεδία επιλεγμένα
          </p>
        </GlassCard>

        {/* Export Options */}
        <div className="space-y-6">
          {/* Format */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Μορφή Αρχείου</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-xl border transition-all ${
                  format === 'csv'
                    ? 'bg-cyan-500/10 border-cyan-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${
                  format === 'csv' ? 'text-cyan-400' : 'text-white/60'
                }`} />
                <p className={`font-medium ${format === 'csv' ? 'text-white' : 'text-white/60'}`}>
                  CSV
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Comma Separated Values
                </p>
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={`p-4 rounded-xl border transition-all ${
                  format === 'excel'
                    ? 'bg-cyan-500/10 border-cyan-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${
                  format === 'excel' ? 'text-cyan-400' : 'text-white/60'
                }`} />
                <p className={`font-medium ${format === 'excel' ? 'text-white' : 'text-white/60'}`}>
                  Excel
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Microsoft Excel (.xlsx)
                </p>
              </button>
            </div>
          </GlassCard>

          {/* Filter */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Φίλτρο Πελατών</h3>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'Όλοι οι Πελάτες', desc: 'Εξαγωγή όλων των πελατών' },
                { value: 'active', label: 'Ενεργοί', desc: 'Μόνο ενεργοί πελάτες' },
                { value: 'vip', label: 'VIP', desc: 'Μόνο VIP πελάτες' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    filter === opt.value
                      ? 'bg-cyan-500/10 border border-cyan-500/30'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="filter"
                    value={opt.value}
                    checked={filter === opt.value}
                    onChange={(e) => setFilter(e.target.value as typeof filter)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    filter === opt.value
                      ? 'border-cyan-500'
                      : 'border-white/20'
                  }`}>
                    {filter === opt.value && (
                      <div className="w-3 h-3 rounded-full bg-cyan-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{opt.label}</p>
                    <p className="text-white/40 text-xs">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </GlassCard>

          {/* Export Button */}
          <GlassButton 
            className="w-full py-4" 
            onClick={handleExport}
            disabled={exporting || selectedFields.length === 0}
          >
            {exporting ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Εξαγωγή...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Εξαγωγή Δεδομένων
              </>
            )}
          </GlassButton>

          {exportStats && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center"
            >
              <Check className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-medium">
                Εξήχθησαν {exportStats.count} πελάτες επιτυχώς!
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

