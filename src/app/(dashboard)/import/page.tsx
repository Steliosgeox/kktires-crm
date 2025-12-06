'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileSpreadsheet, FileText, Check, X, AlertCircle,
  ArrowRight, ArrowLeft, Download, Users, Eye, RefreshCw
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';

interface ImportField {
  csvHeader: string;
  dbField: string | null;
  sample: string;
}

const DB_FIELDS = [
  { value: 'firstName', label: 'Όνομα', required: true },
  { value: 'lastName', label: 'Επώνυμο', required: false },
  { value: 'company', label: 'Εταιρεία', required: false },
  { value: 'email', label: 'Email', required: false },
  { value: 'phone', label: 'Τηλέφωνο', required: false },
  { value: 'mobile', label: 'Κινητό', required: false },
  { value: 'street', label: 'Διεύθυνση', required: false },
  { value: 'city', label: 'Πόλη', required: false },
  { value: 'postalCode', label: 'Τ.Κ.', required: false },
  { value: 'country', label: 'Χώρα', required: false },
  { value: 'afm', label: 'ΑΦΜ', required: false },
  { value: 'doy', label: 'ΔΟΥ', required: false },
  { value: 'category', label: 'Κατηγορία', required: false },
  { value: 'notes', label: 'Σημειώσεις', required: false },
];

export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<ImportField[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      alert('Παρακαλώ επιλέξτε αρχείο CSV');
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(line => 
        line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      ).filter(line => line.length > 1 && line.some(cell => cell.length > 0));
      
      setCsvData(lines);
      
      // Create initial field mappings
      if (lines.length > 0) {
        const headers = lines[0];
        const samples = lines[1] || [];
        
        const mappings: ImportField[] = headers.map((header, i) => {
          // Try to auto-detect field mappings
          const lowerHeader = header.toLowerCase();
          let dbField: string | null = null;
          
          if (lowerHeader.includes('όνομα') || lowerHeader.includes('first') || lowerHeader.includes('name')) {
            dbField = 'firstName';
          } else if (lowerHeader.includes('επώνυμο') || lowerHeader.includes('last')) {
            dbField = 'lastName';
          } else if (lowerHeader.includes('εταιρ') || lowerHeader.includes('company')) {
            dbField = 'company';
          } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
            dbField = 'email';
          } else if (lowerHeader.includes('τηλ') || lowerHeader.includes('phone')) {
            dbField = 'phone';
          } else if (lowerHeader.includes('κιν') || lowerHeader.includes('mobile')) {
            dbField = 'mobile';
          } else if (lowerHeader.includes('διεύθ') || lowerHeader.includes('address') || lowerHeader.includes('street')) {
            dbField = 'street';
          } else if (lowerHeader.includes('πόλη') || lowerHeader.includes('city')) {
            dbField = 'city';
          } else if (lowerHeader.includes('τ.κ') || lowerHeader.includes('postal') || lowerHeader.includes('zip')) {
            dbField = 'postalCode';
          } else if (lowerHeader.includes('αφμ') || lowerHeader.includes('vat') || lowerHeader.includes('tax')) {
            dbField = 'afm';
          } else if (lowerHeader.includes('δου') || lowerHeader.includes('doy')) {
            dbField = 'doy';
          }
          
          return {
            csvHeader: header,
            dbField,
            sample: samples[i] || '',
          };
        });
        
        setFieldMappings(mappings);
        setStep(2);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const updateMapping = (index: number, dbField: string | null) => {
    const newMappings = [...fieldMappings];
    newMappings[index].dbField = dbField;
    setFieldMappings(newMappings);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);

    try {
      // Prepare data for import
      const headers = csvData[0];
      const rows = csvData.slice(1);
      
      const customers = rows.map(row => {
        const customer: Record<string, string> = {};
        
        fieldMappings.forEach((mapping, i) => {
          if (mapping.dbField && row[i]) {
            customer[mapping.dbField] = row[i];
          }
        });
        
        return customer;
      }).filter(c => c.firstName); // Only import rows with a first name

      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers }),
      });

      const result = await res.json();
      setImportResult(result);
      setStep(4);
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: 0,
        failed: csvData.length - 1,
        errors: ['Σφάλμα κατά την εισαγωγή'],
      });
      setStep(4);
    } finally {
      setImporting(false);
    }
  };

  const requiredFieldsMapped = fieldMappings.some(m => m.dbField === 'firstName');

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Εισαγωγή Πελατών</h1>
        <p className="text-white/60 mt-1">
          Μαζική εισαγωγή πελατών από αρχείο CSV
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step >= s 
                ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white' 
                : 'bg-white/10 text-white/40'
            }`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-16 h-1 mx-2 rounded ${
                step > s ? 'bg-gradient-to-r from-cyan-500 to-violet-500' : 'bg-white/10'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-between text-sm text-white/60 px-4">
        <span className={step >= 1 ? 'text-white' : ''}>Αρχείο</span>
        <span className={step >= 2 ? 'text-white' : ''}>Αντιστοίχιση</span>
        <span className={step >= 3 ? 'text-white' : ''}>Προεπισκόπηση</span>
        <span className={step >= 4 ? 'text-white' : ''}>Ολοκλήρωση</span>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: File Upload */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard 
              className={`p-12 border-2 border-dashed transition-colors ${
                dragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/20'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileSpreadsheet className="w-10 h-10 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Σύρετε το αρχείο CSV εδώ
                </h3>
                <p className="text-white/60 mb-6">
                  ή κάντε κλικ για να επιλέξετε
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-white/[0.08] bg-white/[0.03] text-white/90 text-sm font-medium hover:bg-white/[0.05] transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Επιλογή Αρχείου
                  </span>
                </label>
                
                <div className="mt-8 text-left bg-white/5 rounded-xl p-4">
                  <h4 className="font-medium text-white mb-2">Οδηγίες:</h4>
                  <ul className="text-sm text-white/60 space-y-1">
                    <li>• Το αρχείο πρέπει να είναι σε μορφή CSV</li>
                    <li>• Η πρώτη γραμμή πρέπει να περιέχει τις κεφαλίδες</li>
                    <li>• Υποστηριζόμενα πεδία: Όνομα, Επώνυμο, Email, Τηλέφωνο, κλπ.</li>
                    <li>• Το πεδίο Όνομα είναι υποχρεωτικό</li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Step 2: Field Mapping */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Αντιστοίχιση Πεδίων
              </h3>
              <p className="text-white/60 text-sm mb-6">
                Αντιστοιχίστε τις στήλες του CSV με τα πεδία της βάσης δεδομένων
              </p>
              
              <div className="space-y-3">
                {fieldMappings.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-4 bg-white/5 rounded-lg p-3">
                    <div className="flex-1">
                      <p className="text-white font-medium">{mapping.csvHeader}</p>
                      <p className="text-white/40 text-sm truncate">
                        Δείγμα: {mapping.sample || '-'}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/40" />
                    <div className="flex-1">
                      <select
                        value={mapping.dbField || ''}
                        onChange={(e) => updateMapping(index, e.target.value || null)}
                        className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="">-- Παράλειψη --</option>
                        {DB_FIELDS.map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label} {field.required && '*'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {!requiredFieldsMapped && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">
                    Το πεδίο "Όνομα" είναι υποχρεωτικό. Αντιστοιχίστε μια στήλη σε αυτό.
                  </p>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <GlassButton variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Πίσω
                </GlassButton>
                <GlassButton 
                  onClick={() => setStep(3)} 
                  disabled={!requiredFieldsMapped}
                >
                  Συνέχεια
                  <ArrowRight className="w-4 h-4 ml-2" />
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Προεπισκόπηση Εισαγωγής
              </h3>
              
              <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 rounded-xl">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{csvData.length - 1}</p>
                  <p className="text-white/60">Πελάτες προς εισαγωγή</p>
                </div>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {fieldMappings.filter(m => m.dbField).map((m, i) => (
                        <th key={i} className="text-left py-2 px-3 text-white/60 text-sm font-medium">
                          {DB_FIELDS.find(f => f.value === m.dbField)?.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1, 6).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-white/5">
                        {fieldMappings.filter(m => m.dbField).map((m, colIndex) => {
                          const originalIndex = fieldMappings.findIndex(fm => fm === m);
                          return (
                            <td key={colIndex} className="py-2 px-3 text-white text-sm">
                              {row[originalIndex] || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvData.length > 6 && (
                  <p className="text-white/40 text-sm mt-2 text-center">
                    ...και {csvData.length - 6} ακόμα εγγραφές
                  </p>
                )}
              </div>

              <div className="flex justify-between">
                <GlassButton variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Πίσω
                </GlassButton>
                <GlassButton onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Εισαγωγή...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Εισαγωγή Τώρα
                    </>
                  )}
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && importResult && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard className="p-8 text-center">
              {importResult.success > 0 ? (
                <>
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Επιτυχής Εισαγωγή!
                  </h3>
                  <p className="text-white/60 mb-6">
                    {importResult.success} πελάτες εισήχθησαν επιτυχώς
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <X className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Η Εισαγωγή Απέτυχε
                  </h3>
                  <p className="text-white/60 mb-6">
                    Δεν ήταν δυνατή η εισαγωγή πελατών
                  </p>
                </>
              )}

              {importResult.failed > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-left">
                  <p className="text-amber-400 font-medium mb-2">
                    {importResult.failed} εγγραφές δεν εισήχθησαν
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="text-amber-400/60 text-sm">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-4">
                <GlassButton variant="ghost" onClick={() => {
                  setStep(1);
                  setFile(null);
                  setCsvData([]);
                  setFieldMappings([]);
                  setImportResult(null);
                }}>
                  Νέα Εισαγωγή
                </GlassButton>
                <GlassButton onClick={() => window.location.href = '/customers'}>
                  <Eye className="w-4 h-4 mr-2" />
                  Προβολή Πελατών
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Template */}
      {step === 1 && (
        <div className="text-center">
          <GlassButton variant="ghost" onClick={() => {
            const headers = DB_FIELDS.map(f => f.label).join(',');
            const sample = 'Γιάννης,Παπαδόπουλος,ΑΒΓ ΕΠΕ,giannis@example.gr,2101234567,6971234567,Σταδίου 10,Αθήνα,10562,Ελλάδα,123456789,Α Αθηνών,retail,Σημείωση';
            const csv = `${headers}\n${sample}`;
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'template_pelaton.csv';
            link.click();
          }}>
            <Download className="w-4 h-4 mr-2" />
            Κατέβασμα Προτύπου CSV
          </GlassButton>
        </div>
      )}
    </div>
  );
}

