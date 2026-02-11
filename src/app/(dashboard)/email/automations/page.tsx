'use client';

import { Suspense } from 'react';
import { AutomationBuilder } from '@/components/email/automation-builder';
import { GlassSkeleton } from '@/components/ui/glass-skeleton';
import { toast } from '@/lib/stores/ui-store';

export default function AutomationsPage() {
  const handleSave = async (nodes: any[], edges: any[], name: string) => {
    try {
      // Convert flow nodes/edges to automation format
      const trigger = nodes.find((n) => n.type === 'trigger');
      const actions = nodes
        .filter((n) => n.type !== 'trigger')
        .map((n) => ({
          type: n.type,
          label: n.data.label,
          config: n.data.config || {},
        }));

      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          trigger: trigger?.data?.label || 'manual',
          triggerConfig: trigger?.data?.config || {},
          actions,
          isActive: false,
        }),
      });

      if (response.ok) {
        toast.success('Αποθηκεύτηκε', 'Ο αυτοματισμός αποθηκεύτηκε επιτυχώς!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving automation:', error);
      toast.error('Σφάλμα', 'Σφάλμα αποθήκευσης αυτοματισμού');
    }
  };

  return (
    <div className="h-[calc(100vh-120px)]">
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <GlassSkeleton className="w-full h-full" />
          </div>
        }
      >
        <AutomationBuilder onSave={handleSave} />
      </Suspense>
    </div>
  );
}

