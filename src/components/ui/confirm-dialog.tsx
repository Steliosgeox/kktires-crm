'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { GlassModal } from './glass-modal';
import { GlassButton } from './glass-button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Επιβεβαίωση',
  cancelText = 'Ακύρωση',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            variant === 'danger' ? 'bg-red-500/20' : 
            variant === 'warning' ? 'bg-amber-500/20' : 
            'bg-cyan-500/20'
          }`}>
            <AlertTriangle className={`h-6 w-6 ${
              variant === 'danger' ? 'text-red-400' : 
              variant === 'warning' ? 'text-amber-400' : 
              'text-cyan-400'
            }`} />
          </div>
          <div className="flex-1">
            <p className="text-white/70">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <GlassButton variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </GlassButton>
          <GlassButton 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={handleConfirm}
            disabled={loading}
            leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          >
            {loading ? 'Παρακαλώ περιμένετε...' : confirmText}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

