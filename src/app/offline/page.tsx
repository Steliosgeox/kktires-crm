'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
      <GlassCard className="p-8 max-w-md text-center">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-amber-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-3">
          Εκτός Σύνδεσης
        </h1>
        
        <p className="text-white/60 mb-6">
          Δεν υπάρχει σύνδεση στο διαδίκτυο. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.
        </p>
        
        <div className="space-y-3">
          <GlassButton 
            className="w-full" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Δοκιμάστε Ξανά
          </GlassButton>
          
          <p className="text-white/40 text-sm">
            Ορισμένες λειτουργίες μπορεί να είναι διαθέσιμες εκτός σύνδεσης.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

