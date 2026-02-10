'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import {
  User,
  Building2,
  Users,
  Mail,
  Calendar,
  MapPin,
  Palette,
  Bell,
  Database,
  Shield,
  Key,
  ExternalLink,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassSwitch } from '@/components/ui/glass-switch';
import { GlassAvatar } from '@/components/ui/glass-avatar';
import { cn } from '@/lib/utils';

const settingsNav = [
  { id: 'profile', label: 'Προφίλ', icon: User },
  { id: 'organization', label: 'Οργανισμός', icon: Building2 },
  { id: 'team', label: 'Ομάδα', icon: Users },
  { id: 'integrations', label: 'Συνδέσεις', icon: ExternalLink },
  { id: 'notifications', label: 'Ειδοποιήσεις', icon: Bell },
  { id: 'appearance', label: 'Εμφάνιση', icon: Palette },
  { id: 'data', label: 'Δεδομένα', icon: Database },
  { id: 'security', label: 'Ασφάλεια', icon: Shield },
];

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [activeSection, setActiveSection] = useState('profile');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    birthdays: true,
    tasks: true,
    campaigns: true,
  });

  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean;
    hasRefreshToken: boolean;
    scope: string | null;
    email: string | null;
  } | null>(null);

  useEffect(() => {
    fetch('/api/integrations/gmail')
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data) setGmailStatus(data);
      })
      .catch(() => undefined);
  }, []);

  const integrations = useMemo(() => {
    const mapsConnected = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const gmailConnected = !!gmailStatus?.connected && !!gmailStatus?.hasRefreshToken;

    return [
      {
        id: 'gmail',
        name: 'Gmail',
        icon: Mail,
        connected: gmailConnected,
        attention: !!gmailStatus?.connected && !gmailStatus?.hasRefreshToken,
        email: gmailStatus?.email || session?.user?.email || null,
        onConnect: () => signIn('google', { callbackUrl: '/settings' }),
      },
      { id: 'calendar', name: 'Google Calendar', icon: Calendar, connected: false, onConnect: () => undefined },
      { id: 'maps', name: 'Google Maps', icon: MapPin, connected: mapsConnected, onConnect: () => undefined },
    ] as const;
  }, [gmailStatus, session?.user?.email]);

  if (sessionStatus === 'loading') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ρυθμίσεις</h1>
          <p className="text-white/60">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Ρυθμίσεις</h1>
        <p className="text-white/60">Διαχείριση λογαριασμού και προτιμήσεων</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Settings Navigation */}
        <GlassCard padding="sm">
          <nav className="space-y-1">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    {
                      'bg-white/[0.08] text-white': isActive,
                      'text-white/60 hover:text-white hover:bg-white/[0.05]': !isActive,
                    }
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </GlassCard>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* Profile Settings */}
          {activeSection === 'profile' && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-6">Προφίλ</h2>
              
              {/* Avatar */}
              <div className="flex items-center gap-6 mb-8">
                <GlassAvatar name={session?.user?.name || session?.user?.email || 'Χρήστης'} size="xl" />
                <div>
                  <GlassButton variant="default" size="sm">
                    Αλλαγή Φωτογραφίας
                  </GlassButton>
                  <p className="text-xs text-white/40 mt-2">JPG, PNG. Μέγιστο 2MB</p>
                </div>
              </div>

              {/* Form */}
              <div className="grid gap-6 md:grid-cols-2">
                <GlassInput label="Όνομα" defaultValue={session?.user?.name || ''} />
                <GlassInput label="Επώνυμο" defaultValue="" />
                <GlassInput label="Email" type="email" defaultValue={session?.user?.email || ''} />
                <GlassInput label="Τηλέφωνο" defaultValue="" />
              </div>

              <div className="flex justify-end mt-6">
                <GlassButton variant="primary">Αποθήκευση</GlassButton>
              </div>
            </GlassCard>
          )}

          {/* Organization Settings */}
          {activeSection === 'organization' && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-6">Οργανισμός</h2>
              
              <div className="grid gap-6 md:grid-cols-2">
                <GlassInput label="Όνομα Επιχείρησης" defaultValue="KK Tires" />
                <GlassInput label="ΑΦΜ" defaultValue="" />
                <GlassInput label="Διεύθυνση" defaultValue="" />
                <GlassInput label="Πόλη" defaultValue="Αθήνα" />
                <GlassInput label="Τηλέφωνο" defaultValue="" />
                <GlassInput label="Website" defaultValue="" />
              </div>

              <div className="flex justify-end mt-6">
                <GlassButton variant="primary">Αποθήκευση</GlassButton>
              </div>
            </GlassCard>
          )}

          {/* Integrations */}
          {activeSection === 'integrations' && (
            <div className="space-y-4">
              <GlassCard>
                <h2 className="text-lg font-semibold text-white mb-6">Συνδέσεις</h2>
                <div className="space-y-4">
                  {integrations.map((integration) => {
                    const Icon = integration.icon;
                    return (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between rounded-xl border border-white/[0.08] p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                            <Icon className="h-5 w-5 text-white/60" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{integration.name}</h3>
                            {integration.connected ? (
                              <p className="text-sm text-white/50">{(integration as any).email || 'Συνδεδεμένο'}</p>
                            ) : (integration as any).attention ? (
                              <p className="text-sm text-amber-300/80">Χρειάζεται επανασύνδεση (λείπει refresh token)</p>
                            ) : (
                              <p className="text-sm text-white/40">Μη συνδεδεμένο</p>
                            )}
                          </div>
                        </div>
                        {integration.connected ? (
                          <div className="flex items-center gap-3">
                            <GlassBadge variant="success" size="sm">
                              <Check className="h-3 w-3 mr-1" />
                              Συνδεδεμένο
                            </GlassBadge>
                            <GlassButton variant="ghost" size="sm" onClick={() => (integration as any).onConnect?.()}>
                              Επανασύνδεση
                            </GlassButton>
                          </div>
                        ) : (
                          <GlassButton variant="primary" size="sm" onClick={() => (integration as any).onConnect?.()}>
                            {(integration as any).attention ? (
                              <span className="inline-flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Επανασύνδεση
                              </span>
                            ) : (
                              'Σύνδεση'
                            )}
                          </GlassButton>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              {/* API Keys */}
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white">API Keys</h3>
                  <GlassButton variant="default" size="sm" leftIcon={<Key className="h-3 w-3" />}>
                    Νέο Κλειδί
                  </GlassButton>
                </div>
                <p className="text-sm text-white/50">
                  Δημιουργήστε API keys για πρόσβαση από εξωτερικές εφαρμογές
                </p>
              </GlassCard>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-6">Ειδοποιήσεις</h2>
              <div className="space-y-6">
                <GlassSwitch
                  checked={notifications.email}
                  onChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  label="Email Ειδοποιήσεις"
                  description="Λήψη ειδοποιήσεων μέσω email"
                />
                <GlassSwitch
                  checked={notifications.push}
                  onChange={(checked) => setNotifications({ ...notifications, push: checked })}
                  label="Push Ειδοποιήσεις"
                  description="Ειδοποιήσεις browser"
                />
                <GlassSwitch
                  checked={notifications.birthdays}
                  onChange={(checked) => setNotifications({ ...notifications, birthdays: checked })}
                  label="Γενέθλια Πελατών"
                  description="Υπενθύμιση για γενέθλια πελατών"
                />
                <GlassSwitch
                  checked={notifications.tasks}
                  onChange={(checked) => setNotifications({ ...notifications, tasks: checked })}
                  label="Εργασίες"
                  description="Υπενθυμίσεις για εκκρεμείς εργασίες"
                />
                <GlassSwitch
                  checked={notifications.campaigns}
                  onChange={(checked) => setNotifications({ ...notifications, campaigns: checked })}
                  label="Email Campaigns"
                  description="Ενημερώσεις για την πρόοδο campaigns"
                />
              </div>
            </GlassCard>
          )}

          {/* Appearance */}
          {activeSection === 'appearance' && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-6">Εμφάνιση</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-white/70 block mb-3">Θέμα</label>
                  <div className="flex gap-4">
                    <button className="flex flex-col items-center gap-2 rounded-xl border-2 border-cyan-500 bg-zinc-900 p-4">
                      <div className="h-8 w-16 rounded bg-zinc-800" />
                      <span className="text-xs text-white">Σκούρο</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.1] bg-zinc-900 p-4 opacity-50 cursor-not-allowed">
                      <div className="h-8 w-16 rounded bg-white" />
                      <span className="text-xs text-white/50">Φωτεινό</span>
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Data */}
          {activeSection === 'data' && (
            <div className="space-y-4">
              <GlassCard>
                <h2 className="text-lg font-semibold text-white mb-4">Εξαγωγή Δεδομένων</h2>
                <p className="text-sm text-white/50 mb-4">
                  Κατεβάστε όλα τα δεδομένα σας σε μορφή CSV ή Excel
                </p>
                <GlassButton variant="default">Εξαγωγή Όλων</GlassButton>
              </GlassCard>
              <GlassCard className="border-red-500/20">
                <h2 className="text-lg font-semibold text-red-400 mb-4">Διαγραφή Λογαριασμού</h2>
                <p className="text-sm text-white/50 mb-4">
                  Η διαγραφή του λογαριασμού είναι μόνιμη και δεν μπορεί να αναιρεθεί
                </p>
                <GlassButton variant="danger">Διαγραφή Λογαριασμού</GlassButton>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

