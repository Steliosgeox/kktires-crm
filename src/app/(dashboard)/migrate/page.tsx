'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Users,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassBadge } from '@/components/ui/glass-badge';

interface MigrationStats {
  customersImported: number;
  tagsCreated: number;
  tagAssociations: number;
}

interface MigrationStatus {
  status: string;
  currentData: {
    customers: number;
    tags: number;
  };
}

export default function MigratePage() {
  const { data: session, status: sessionStatus } = useSession();
  const role = (session?.user as any)?.currentOrgRole as string | undefined;
  const canAdmin = role === 'owner' || role === 'admin';

  const [jsonData, setJsonData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; stats?: MigrationStats } | null>(null);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [clearExisting, setClearExisting] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/migrate');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  }, []);

  useEffect(() => {
    if (!canAdmin) return;
    fetchStatus();
  }, [canAdmin, fetchStatus]);

  if (sessionStatus === 'loading') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Μετεγκατάσταση Δεδομένων</h1>
          <p className="text-white/60">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (!canAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Μετεγκατάσταση</h1>
          <p className="text-white/60">Δεν έχετε δικαίωμα πρόσβασης.</p>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      
      // Handle CSV
      if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const customers = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length >= 2) {
            const customer: Record<string, string> = {};
            headers.forEach((header, index) => {
              customer[header] = values[index] || '';
            });
            customers.push(customer);
          }
        }
        
        setJsonData(JSON.stringify({ customers }, null, 2));
      } else {
        // Handle JSON
        setJsonData(text);
      }
    };
    reader.readAsText(file);
  };

  const handleMigrate = async () => {
    setLoading(true);
    setResult(null);

    try {
      let data;
      try {
        data = JSON.parse(jsonData);
      } catch {
        throw new Error('Invalid JSON format');
      }

      // Ensure we have the right structure
      if (!data.customers && Array.isArray(data)) {
        data = { customers: data };
      }

      data.clearExisting = clearExisting;

      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (response.ok) {
        setResult({ success: true, message: result.message, stats: result.stats });
        fetchStatus();
      } else {
        setResult({ success: false, message: result.error || 'Migration failed' });
      }
    } catch (error) {
      setResult({ success: false, message: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const sampleData = `{
  "customers": [
    {
      "FirstName": "Γιώργος",
      "LastName": "Παπαδόπουλος",
      "Company": "ΑΒΓ Μεταφορές ΑΕ",
      "Email": "g.papadopoulos@abg.gr",
      "Phone": "210 1234567",
      "Mobile": "697 1234567",
      "City": "Αθήνα",
      "AFM": "123456789",
      "DOY": "Α' Αθηνών",
      "Category": "Χονδρική",
      "Revenue": 45000,
      "IsVip": true,
      "Tags": "Πιστός, Χονδρική"
    },
    {
      "FirstName": "Μαρία",
      "LastName": "Κωνσταντίνου",
      "Company": "Express Logistics",
      "Email": "maria@express.gr",
      "Phone": "2310 654321",
      "City": "Θεσσαλονίκη",
      "Category": "Στόλος",
      "Revenue": 28500
    }
  ]
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Μετεγκατάσταση Δεδομένων</h1>
          <p className="text-white/60">
            Εισαγωγή πελατών από WPF βάση δεδομένων ή Excel/CSV
          </p>
        </div>
        <GlassButton variant="default" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={fetchStatus}>
          Ανανέωση
        </GlassButton>
      </div>

      {/* Current Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
              <Database className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Κατάσταση</p>
              <p className="text-lg font-semibold text-white">
                {status?.status === 'ready' ? 'Έτοιμο' : 'Φόρτωση...'}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Πελάτες στο Turso</p>
              <p className="text-lg font-semibold text-white">
                {status?.currentData?.customers || 0}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
              <Tag className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Ετικέτες</p>
              <p className="text-lg font-semibold text-white">
                {status?.currentData?.tags || 0}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Upload Section */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-white mb-4">Ανέβασμα Αρχείου</h2>
        
        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors">
          <input
            type="file"
            accept=".json,.csv,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <FileSpreadsheet className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/70 mb-2">
              Σύρετε αρχείο ή κάντε κλικ για επιλογή
            </p>
            <p className="text-sm text-white/40">
              Υποστηρίζονται: JSON, CSV
            </p>
          </label>
        </div>
      </GlassCard>

      {/* JSON Editor */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Δεδομένα JSON</h2>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setJsonData(sampleData)}
          >
            Φόρτωση Παραδείγματος
          </GlassButton>
        </div>

        <textarea
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          placeholder='Επικολλήστε JSON δεδομένα εδώ...\n\nΜορφή: { "customers": [...] }'
          className="w-full h-64 bg-black/30 border border-white/10 rounded-xl p-4 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />

        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="rounded border-white/20 bg-white/5"
            />
            <span>Διαγραφή υπαρχόντων δεδομένων πριν την εισαγωγή</span>
          </label>
        </div>
      </GlassCard>

      {/* Result */}
      {result && (
        <GlassCard className={result.success ? 'border-emerald-500/30' : 'border-red-500/30'}>
          <div className="flex items-start gap-4">
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
            )}
            <div>
              <p className={`font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.success ? 'Επιτυχία!' : 'Σφάλμα'}
              </p>
              <p className="text-white/70 mt-1">{result.message}</p>
              
              {result.stats && (
                <div className="flex gap-4 mt-3">
                  <GlassBadge variant="success">
                    {result.stats.customersImported} πελάτες
                  </GlassBadge>
                  <GlassBadge variant="primary">
                    {result.stats.tagsCreated} ετικέτες
                  </GlassBadge>
                  <GlassBadge variant="default">
                    {result.stats.tagAssociations} συσχετίσεις
                  </GlassBadge>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <GlassButton
          variant="primary"
          size="lg"
          leftIcon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          onClick={handleMigrate}
          disabled={loading || !jsonData.trim()}
        >
          {loading ? 'Μετεγκατάσταση...' : 'Εκκίνηση Μετεγκατάστασης'}
        </GlassButton>
      </div>

      {/* Instructions */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-white mb-4">Οδηγίες</h2>
        <div className="space-y-3 text-white/70">
          <p>
            <strong className="text-white">1.</strong> Εξάγετε τα δεδομένα από το WPF σε Excel/CSV ή JSON
          </p>
          <p>
            <strong className="text-white">2.</strong> Ανεβάστε το αρχείο ή επικολλήστε JSON
          </p>
          <p>
            <strong className="text-white">3.</strong> Υποστηριζόμενα πεδία:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-4">
            {['FirstName', 'LastName', 'Company', 'Email', 'Phone', 'Mobile', 'City', 'Address', 'PostalCode', 'AFM', 'DOY', 'Category', 'Revenue', 'IsVip', 'Tags', 'Notes'].map(field => (
              <code key={field} className="text-xs bg-white/5 px-2 py-1 rounded text-cyan-400">
                {field}
              </code>
            ))}
          </div>
          <p>
            <strong className="text-white">4.</strong> Κατηγορίες: Λιανική, Χονδρική, Στόλος, VIP, Premium, Συνεργείο
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

