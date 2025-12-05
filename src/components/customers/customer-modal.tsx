'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, User, Building, Mail, Phone, MapPin, CreditCard, Tag } from 'lucide-react';
import { GlassModal } from '@/components/ui/glass-modal';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassTextarea } from '@/components/ui/glass-textarea';
import { GlassSelect } from '@/components/ui/glass-select';
import { GlassBadge } from '@/components/ui/glass-badge';

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
  category: string | null;
  revenue: number | null;
  isVip: boolean | null;
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

  useEffect(() => {
    if (customer && mode !== 'create') {
      setFormData(customer);
    } else {
      setFormData(emptyCustomer);
    }
    setErrors({});
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
    <GlassModal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/70">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">Βασικά Στοιχεία</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="Όνομα *"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              disabled={isReadOnly}
              error={errors.firstName}
            />
            <GlassInput
              label="Επώνυμο"
              value={formData.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value || null)}
              disabled={isReadOnly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="Εταιρεία"
              value={formData.company || ''}
              onChange={(e) => handleChange('company', e.target.value || null)}
              disabled={isReadOnly}
              leftIcon={<Building className="h-4 w-4" />}
            />
            <GlassSelect
              label="Κατηγορία"
              value={formData.category ?? 'retail'}
              onChange={(e) => handleChange('category', e.target.value)}
              options={categoryOptions}
              disabled={isReadOnly}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isVip ?? false}
                onChange={(e) => handleChange('isVip', e.target.checked)}
                disabled={isReadOnly}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500"
              />
              <span className="text-sm text-white/70">VIP Πελάτης ⭐</span>
            </label>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/70">
            <Mail className="h-4 w-4" />
            <span className="text-sm font-medium">Στοιχεία Επικοινωνίας</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value || null)}
              disabled={isReadOnly}
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email}
            />
            <GlassInput
              label="Τηλέφωνο"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value || null)}
              disabled={isReadOnly}
              leftIcon={<Phone className="h-4 w-4" />}
            />
          </div>

          <GlassInput
            label="Κινητό"
            value={formData.mobile || ''}
            onChange={(e) => handleChange('mobile', e.target.value || null)}
            disabled={isReadOnly}
            leftIcon={<Phone className="h-4 w-4" />}
          />
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/70">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">Διεύθυνση</span>
          </div>

          <GlassInput
            label="Οδός"
            value={formData.street || ''}
            onChange={(e) => handleChange('street', e.target.value || null)}
            disabled={isReadOnly}
          />

          <div className="grid grid-cols-3 gap-4">
            <GlassInput
              label="Πόλη"
              value={formData.city || ''}
              onChange={(e) => handleChange('city', e.target.value || null)}
              disabled={isReadOnly}
            />
            <GlassInput
              label="Τ.Κ."
              value={formData.postalCode || ''}
              onChange={(e) => handleChange('postalCode', e.target.value || null)}
              disabled={isReadOnly}
            />
            <div /> {/* Spacer */}
          </div>
        </div>

        {/* Tax Info Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/70">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm font-medium">Φορολογικά Στοιχεία</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="ΑΦΜ"
              value={formData.afm || ''}
              onChange={(e) => handleChange('afm', e.target.value || null)}
              disabled={isReadOnly}
              error={errors.afm}
            />
            <GlassInput
              label="ΔΟΥ"
              value={formData.doy || ''}
              onChange={(e) => handleChange('doy', e.target.value || null)}
              disabled={isReadOnly}
            />
          </div>

          <GlassInput
            label="Τζίρος (€)"
            type="number"
            value={formData.revenue ?? 0}
            onChange={(e) => handleChange('revenue', parseFloat(e.target.value) || 0)}
            disabled={isReadOnly}
          />
        </div>

        {/* Notes Section */}
        <div className="space-y-4">
          <GlassTextarea
            label="Σημειώσεις"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value || null)}
            disabled={isReadOnly}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
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
