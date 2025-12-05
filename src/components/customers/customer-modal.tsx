'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, User, Building, Mail, Phone, MapPin, CreditCard, FileText } from 'lucide-react';
import { GlassModal } from '@/components/ui/glass-modal';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassTextarea } from '@/components/ui/glass-textarea';
import { GlassSelect } from '@/components/ui/glass-select';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/glass-tabs';

interface Customer {
  id?: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  afm: string | null;
  doy: string | null;
  category: string;
  revenue: number;
  isVip: boolean;
  notes: string | null;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  mode: 'view' | 'edit' | 'create';
  onSave?: (customer: Customer) => Promise<void>;
}

const categoryOptions = [
  { value: 'retail', label: 'Λιανική' },
  { value: 'wholesale', label: 'Χονδρική' },
  { value: 'fleet', label: 'Στόλος' },
  { value: 'garage', label: 'Συνεργείο' },
  { value: 'vip', label: 'VIP' },
  { value: 'premium', label: 'Premium' },
];

const emptyCustomer: Customer = {
  firstName: '',
  lastName: null,
  company: null,
  email: null,
  phone: null,
  mobile: null,
  street: null,
  city: null,
  postalCode: null,
  afm: null,
  doy: null,
  category: 'retail',
  revenue: 0,
  isVip: false,
  notes: null,
};

export function CustomerModal({ isOpen, onClose, customer, mode, onSave }: CustomerModalProps) {
  const [formData, setFormData] = useState<Customer>(emptyCustomer);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (customer && mode !== 'create') {
      setFormData(customer);
    } else {
      setFormData(emptyCustomer);
    }
    setErrors({});
    setActiveTab('basic');
  }, [customer, mode, isOpen]);

  const handleChange = (field: keyof Customer, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Το όνομα είναι υποχρεωτικό';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Μη έγκυρο email';
    }
    
    if (formData.afm && !/^\d{9}$/.test(formData.afm)) {
      newErrors.afm = 'Το ΑΦΜ πρέπει να είναι 9 ψηφία';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (mode === 'view') return;
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave?.(formData);
      onClose();
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? 'Νέος Πελάτης' : mode === 'edit' ? 'Επεξεργασία Πελάτη' : 'Στοιχεία Πελάτη';

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="p-6">
        <GlassTabs value={activeTab} onValueChange={setActiveTab}>
          <GlassTabsList className="mb-6">
            <GlassTabsTrigger value="basic">
              <User className="h-4 w-4 mr-2" />
              Βασικά
            </GlassTabsTrigger>
            <GlassTabsTrigger value="contact">
              <Phone className="h-4 w-4 mr-2" />
              Επικοινωνία
            </GlassTabsTrigger>
            <GlassTabsTrigger value="address">
              <MapPin className="h-4 w-4 mr-2" />
              Διεύθυνση
            </GlassTabsTrigger>
            <GlassTabsTrigger value="tax">
              <CreditCard className="h-4 w-4 mr-2" />
              Φορολογικά
            </GlassTabsTrigger>
            <GlassTabsTrigger value="notes">
              <FileText className="h-4 w-4 mr-2" />
              Σημειώσεις
            </GlassTabsTrigger>
          </GlassTabsList>

          {/* Basic Info Tab */}
          <GlassTabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassInput
                label="Όνομα *"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                disabled={isReadOnly}
                error={errors.firstName}
                placeholder="π.χ. Γιώργος"
              />
              <GlassInput
                label="Επώνυμο"
                value={formData.lastName || ''}
                onChange={(e) => handleChange('lastName', e.target.value || null)}
                disabled={isReadOnly}
                placeholder="π.χ. Παπαδόπουλος"
              />
            </div>

            <GlassInput
              label="Εταιρεία / Επωνυμία"
              value={formData.company || ''}
              onChange={(e) => handleChange('company', e.target.value || null)}
              disabled={isReadOnly}
              leftIcon={<Building className="h-4 w-4" />}
              placeholder="π.χ. KK Tires Α.Ε."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassSelect
                label="Κατηγορία Πελάτη"
                value={formData.category}
                onChange={(value) => handleChange('category', value)}
                options={categoryOptions}
                disabled={isReadOnly}
              />
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-colors w-full">
                  <input
                    type="checkbox"
                    checked={formData.isVip}
                    onChange={(e) => handleChange('isVip', e.target.checked)}
                    disabled={isReadOnly}
                    className="h-5 w-5 rounded border-white/20 bg-white/5 text-amber-500 accent-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-lg">⭐</span>
                    <span className="text-white font-medium">VIP Πελάτης</span>
                  </div>
                </label>
              </div>
            </div>
          </GlassTabsContent>

          {/* Contact Tab */}
          <GlassTabsContent value="contact" className="space-y-6">
            <GlassInput
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value || null)}
              disabled={isReadOnly}
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email}
              placeholder="example@email.com"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassInput
                label="Τηλέφωνο"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value || null)}
                disabled={isReadOnly}
                leftIcon={<Phone className="h-4 w-4" />}
                placeholder="210-1234567"
              />
              <GlassInput
                label="Κινητό"
                value={formData.mobile || ''}
                onChange={(e) => handleChange('mobile', e.target.value || null)}
                disabled={isReadOnly}
                leftIcon={<Phone className="h-4 w-4" />}
                placeholder="69X-XXXXXXX"
              />
            </div>
          </GlassTabsContent>

          {/* Address Tab */}
          <GlassTabsContent value="address" className="space-y-6">
            <GlassInput
              label="Οδός & Αριθμός"
              value={formData.street || ''}
              onChange={(e) => handleChange('street', e.target.value || null)}
              disabled={isReadOnly}
              leftIcon={<MapPin className="h-4 w-4" />}
              placeholder="π.χ. Λεωφόρος Αλεξάνδρας 123"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassInput
                label="Πόλη"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value || null)}
                disabled={isReadOnly}
                placeholder="π.χ. Αθήνα"
              />
              <GlassInput
                label="Ταχυδρομικός Κώδικας"
                value={formData.postalCode || ''}
                onChange={(e) => handleChange('postalCode', e.target.value || null)}
                disabled={isReadOnly}
                placeholder="π.χ. 11521"
              />
              <div className="flex items-end">
                <GlassBadge variant="default" className="h-10 flex items-center px-4">
                  🇬🇷 Ελλάδα
                </GlassBadge>
              </div>
            </div>
          </GlassTabsContent>

          {/* Tax Tab */}
          <GlassTabsContent value="tax" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassInput
                label="ΑΦΜ (Αριθμός Φορολογικού Μητρώου)"
                value={formData.afm || ''}
                onChange={(e) => handleChange('afm', e.target.value || null)}
                disabled={isReadOnly}
                error={errors.afm}
                placeholder="9 ψηφία"
                maxLength={9}
              />
              <GlassInput
                label="ΔΟΥ (Δημόσια Οικονομική Υπηρεσία)"
                value={formData.doy || ''}
                onChange={(e) => handleChange('doy', e.target.value || null)}
                disabled={isReadOnly}
                placeholder="π.χ. Α' Αθηνών"
              />
            </div>

            <GlassInput
              label="Συνολικός Τζίρος (€)"
              type="number"
              value={formData.revenue}
              onChange={(e) => handleChange('revenue', parseFloat(e.target.value) || 0)}
              disabled={isReadOnly}
              placeholder="0.00"
            />

            {isReadOnly && formData.revenue > 0 && (
              <div className="p-4 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-emerald-400 font-medium">
                  💰 Συνολική Αξία Πελάτη: {new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(formData.revenue)}
                </p>
              </div>
            )}
          </GlassTabsContent>

          {/* Notes Tab */}
          <GlassTabsContent value="notes" className="space-y-6">
            <GlassTextarea
              label="Σημειώσεις"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value || null)}
              disabled={isReadOnly}
              rows={8}
              placeholder="Προσθέστε σημειώσεις για τον πελάτη..."
            />
          </GlassTabsContent>
        </GlassTabs>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/[0.08]">
          <GlassButton variant="ghost" onClick={onClose}>
            {isReadOnly ? 'Κλείσιμο' : 'Ακύρωση'}
          </GlassButton>
          {!isReadOnly && (
            <GlassButton
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
              leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            >
              {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </GlassButton>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
