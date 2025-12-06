'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/ui-store';

/**
 * Component that handles Zustand store hydration on the client.
 * This prevents SSR hydration mismatches by delaying store rehydration
 * until after React has finished its own hydration.
 */
export function StoreHydration() {
  useEffect(() => {
    // Manually trigger Zustand persist rehydration after React hydration completes
    useUIStore.persist.rehydrate();
  }, []);

  return null;
}

