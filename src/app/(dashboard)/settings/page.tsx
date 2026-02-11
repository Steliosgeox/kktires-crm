'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
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
import { toast, useUIStore } from '@/lib/stores/ui-store';

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

const DEFAULT_NOTIFICATIONS = {
  email: true,
  push: true,
  birthdays: true,
  tasks: true,
  campaigns: true,
};

type ProfileData = {
  name: string | null;
  email: string;
  image: string | null;
};

type OrgData = {
  id: string;
  name: string;
  settings: {
    companyProfile?: {
      vatId?: string;
      address?: string;
      city?: string;
      phone?: string;
      website?: string;
    };
  } | null;
};

type PreferencesData = {
  notifications: typeof DEFAULT_NOTIFICATIONS;
  theme: 'dark' | 'light';
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileData>({
    name: null,
    email: session?.user?.email || '',
    image: session?.user?.image || null,
  });

  const [org, setOrg] = useState({
    name: '',
    vatId: '',
    address: '',
    city: '',
    phone: '',
    website: '',
  });

  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [prefsTheme, setPrefsTheme] = useState<'dark' | 'light'>('dark');
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean;
    hasRefreshToken: boolean;
    scope: string | null;
    email: string | null;
  } | null>(null);

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    if (settingsNav.some((s) => s.id === section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

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

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [profileRes, orgRes, prefsRes] = await Promise.all([
          fetch('/api/settings/profile'),
          fetch('/api/settings/org'),
          fetch('/api/settings/preferences'),
        ]);

        if (!profileRes.ok) {
          const msg = await profileRes.json().catch(() => null);
          throw new Error(msg?.error || 'Failed to load profile');
        }
        if (!orgRes.ok) {
          const msg = await orgRes.json().catch(() => null);
          throw new Error(msg?.error || 'Failed to load organization');
        }
        if (!prefsRes.ok) {
          const msg = await prefsRes.json().catch(() => null);
          throw new Error(msg?.error || 'Failed to load preferences');
        }

        const profileData = (await profileRes.json()) as ProfileData;
        setProfile(profileData);

        const orgData = (await orgRes.json()) as OrgData;
        const companyProfile = orgData.settings?.companyProfile;
        setOrg({
          name: orgData.name || '',
          vatId: companyProfile?.vatId || '',
          address: companyProfile?.address || '',
          city: companyProfile?.city || '',
          phone: companyProfile?.phone || '',
          website: companyProfile?.website || '',
        });

        const prefsData = (await prefsRes.json()) as PreferencesData;
        setNotifications(prefsData.notifications || DEFAULT_NOTIFICATIONS);
        setPrefsTheme(prefsData.theme || 'dark');
        setTheme(prefsData.theme || 'dark');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Αποτυχία φόρτωσης ρυθμίσεων';
        setLoadError(message);
        toast.error('Αποτυχία φόρτωσης', message);
      } finally {
        setLoading(false);
      }
    };

    load().catch(() => undefined);
  }, [sessionStatus, setTheme]);

  const handleSaveProfile = async () => {
    setSavingSection('profile');
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name || '' }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to save profile');

      setProfile(data as ProfileData);
      toast.success('Αποθηκεύτηκε', 'Το προφίλ ενημερώθηκε.');
    } catch (e) {
      toast.error('Αποτυχία αποθήκευσης', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveOrg = async () => {
    setSavingSection('organization');
    try {
      const res = await fetch('/api/settings/org', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: org.name,
          vatId: org.vatId || null,
          address: org.address || null,
          city: org.city || null,
          phone: org.phone || null,
          website: org.website || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to save organization');

      toast.success('Αποθηκεύτηκε', 'Ο οργανισμός ενημερώθηκε.');
    } catch (e) {
      toast.error('Αποτυχία αποθήκευσης', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingSection('notifications');
    try {
      const res = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to save preferences');

      toast.success('Αποθηκεύτηκε', 'Οι ειδοποιήσεις ενημερώθηκαν.');
    } catch (e) {
      toast.error('Αποτυχία αποθήκευσης', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveAppearance = async () => {
    setSavingSection('appearance');
    try {
      const res = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: prefsTheme }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to save preferences');

      toast.success('Αποθηκεύτηκε', 'Η εμφάνιση ενημερώθηκε.');
    } catch (e) {
      toast.error('Αποτυχία αποθήκευσης', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSavingSection(null);
    }
  };

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
      { id: 'calendar', name: 'Google Calendar', icon: Calendar, connected: false, disabled: true },
      { id: 'maps', name: 'Google Maps', icon: MapPin, connected: mapsConnected, disabled: true },
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
          {loading && (
            <GlassCard>
              <p className="text-white/60 text-sm">Φόρτωση ρυθμίσεων...</p>
            </GlassCard>
          )}

          {!loading && loadError && (
            <GlassCard className="border-red-500/20">
              <p className="text-red-300 text-sm">{loadError}</p>
            </GlassCard>
          )}

          {/* Profile Settings */}
          {!loading && activeSection === 'profile' && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-6">Προφίλ</h2>
              
              {/* Avatar */}
              <div className="flex items-center gap-6 mb-8">
                <GlassAvatar name={profile.name || profile.email || 'Χρήστης'} size="xl" />
                <div>
                  <GlassButton variant="default" size="sm" disabled title="Not implemented yet">
                    Αλλαγή Φωτογραφίας
                  </GlassButton>
                  <p className="text-xs text-white/40 mt-2">Η αλλαγή φωτογραφίας δεν έχει υλοποιηθεί ακόμα.</p>
                </div>
              </div>

              {/* Form */}
              <div className="grid gap-6 md:grid-cols-2">
                <GlassInput
                  label="Όνομα"
                  value={profile.name || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                />
                <GlassInput
                  label="Email"
                  type="email"
                  value={profile.email || ''}
                  disabled
                  hint="Το email προέρχεται από το login και δεν μπορεί να αλλάξει από εδώ."
                />
              </div>

              <div className="flex justify-end mt-6">
                <GlassButton
                  variant="primary"
                  onClick={handleSaveProfile}
                  disabled={savingSection === 'profile'}
                >
                  {savingSection === 'profile' ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {/* Organization Settings */}
          {!loading && activeSection === 'organization' && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-6">Οργανισμός</h2>
              
              <div className="grid gap-6 md:grid-cols-2">
                <GlassInput
                  label="Όνομα Επιχείρησης"
                  value={org.name}
                  onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
                />
                <GlassInput
                  label="ΑΦΜ"
                  value={org.vatId}
                  onChange={(e) => setOrg((o) => ({ ...o, vatId: e.target.value }))}
                />
                <GlassInput
                  label="Διεύθυνση"
                  value={org.address}
                  onChange={(e) => setOrg((o) => ({ ...o, address: e.target.value }))}
                />
                <GlassInput
                  label="Πόλη"
                  value={org.city}
                  onChange={(e) => setOrg((o) => ({ ...o, city: e.target.value }))}
                />
                <GlassInput
                  label="Τηλέφωνο"
                  value={org.phone}
                  onChange={(e) => setOrg((o) => ({ ...o, phone: e.target.value }))}
                />
                <GlassInput
                  label="Website"
                  value={org.website}
                  onChange={(e) => setOrg((o) => ({ ...o, website: e.target.value }))}
                />
              </div>

              <div className="flex justify-end mt-6">
                <GlassButton
                  variant="primary"
                  onClick={handleSaveOrg}
                  disabled={savingSection === 'organization' || !org.name.trim()}
                >
                  {savingSection === 'organization' ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {/* Team (Not implemented MVP) */}
          {!loading && activeSection === 'team' && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-2">Ομάδα</h2>
              <p className="text-sm text-white/60">
                Η διαχείριση ομάδας δεν έχει υλοποιηθεί ακόμα στο MVP.
              </p>
            </GlassCard>
          )}

          {/* Integrations */}
          {!loading && activeSection === 'integrations' && (
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
                            {(integration as any).disabled && (
                              <p className="text-xs text-white/40 mt-1">Δεν έχει υλοποιηθεί ακόμα.</p>
                            )}
                          </div>
                        </div>
                        {integration.connected ? (
                          <div className="flex items-center gap-3">
                            <GlassBadge variant="success" size="sm">
                              <Check className="h-3 w-3 mr-1" />
                              Συνδεδεμένο
                            </GlassBadge>
                            <GlassButton
                              variant="ghost"
                              size="sm"
                              disabled={(integration as any).disabled}
                              onClick={() => (integration as any).onConnect?.()}
                            >
                              Επανασύνδεση
                            </GlassButton>
                          </div>
                        ) : (
                          <GlassButton
                            variant="primary"
                            size="sm"
                            disabled={(integration as any).disabled}
                            onClick={() => (integration as any).onConnect?.()}
                          >
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
                  <GlassButton variant="default" size="sm" leftIcon={<Key className="h-3 w-3" />} disabled title="Not implemented yet">
                    Νέο Κλειδί
                  </GlassButton>
                </div>
                <p className="text-sm text-white/50">
                  Η διαχείριση API keys δεν έχει υλοποιηθεί ακόμα.
                </p>
              </GlassCard>
            </div>
          )}

          {/* Notifications */}
          {!loading && activeSection === 'notifications' && (
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

              <div className="flex justify-end mt-6">
                <GlassButton
                  variant="primary"
                  onClick={handleSaveNotifications}
                  disabled={savingSection === 'notifications'}
                >
                  {savingSection === 'notifications' ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {/* Appearance */}
          {!loading && activeSection === 'appearance' && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-6">Εμφάνιση</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-white/70 block mb-3">Θέμα</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme('dark');
                        setPrefsTheme('dark');
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl bg-zinc-900 p-4 border',
                        theme === 'dark' ? 'border-2 border-cyan-500' : 'border-white/[0.1]'
                      )}
                    >
                      <div className="h-8 w-16 rounded bg-zinc-800" />
                      <span className="text-xs text-white">Σκούρο</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTheme('light');
                        setPrefsTheme('light');
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl bg-zinc-900 p-4 border',
                        theme === 'light' ? 'border-2 border-cyan-500' : 'border-white/[0.1]'
                      )}
                    >
                      <div className="h-8 w-16 rounded bg-white" />
                      <span className={cn('text-xs', theme === 'light' ? 'text-white' : 'text-white/70')}>Φωτεινό</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <GlassButton
                  variant="primary"
                  onClick={handleSaveAppearance}
                  disabled={savingSection === 'appearance'}
                >
                  {savingSection === 'appearance' ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {/* Data */}
          {!loading && activeSection === 'data' && (
            <div className="space-y-4">
              <GlassCard>
                <h2 className="text-lg font-semibold text-white mb-4">Εξαγωγή Δεδομένων</h2>
                <p className="text-sm text-white/50 mb-4">
                  Κατεβάστε όλα τα δεδομένα σας σε μορφή CSV ή Excel
                </p>
                <GlassButton variant="default" disabled title="Not implemented yet">
                  Εξαγωγή Όλων
                </GlassButton>
                <p className="text-xs text-white/40 mt-2">Δεν έχει υλοποιηθεί ακόμα.</p>
              </GlassCard>
              <GlassCard className="border-red-500/20">
                <h2 className="text-lg font-semibold text-red-400 mb-4">Διαγραφή Λογαριασμού</h2>
                <p className="text-sm text-white/50 mb-4">
                  Η διαγραφή του λογαριασμού είναι μόνιμη και δεν μπορεί να αναιρεθεί
                </p>
                <GlassButton variant="danger" disabled title="Not implemented yet">
                  Διαγραφή Λογαριασμού
                </GlassButton>
                <p className="text-xs text-white/40 mt-2">Δεν έχει υλοποιηθεί ακόμα.</p>
              </GlassCard>
            </div>
          )}

          {/* Security (Not implemented MVP) */}
          {!loading && activeSection === 'security' && (
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-2">Ασφάλεια</h2>
              <p className="text-sm text-white/60">
                Οι ρυθμίσεις ασφαλείας (π.χ. API keys, 2FA, audit log) δεν έχουν υλοποιηθεί ακόμα.
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

