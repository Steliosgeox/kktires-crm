'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  MailOpen,
  MousePointerClick,
  Send,
  Users,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassProgress } from '@/components/ui/glass-progress';
import { GlassSkeleton } from '@/components/ui/glass-skeleton';

interface CampaignStats {
  id: string;
  name: string;
  subject: string;
  sentAt: string | null;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
}

interface TrackingEvent {
  id: string;
  type: 'open' | 'click' | 'bounce' | 'unsubscribe';
  recipientEmail?: string;
  linkUrl?: string;
  userAgent?: string;
  createdAt: string;
}

interface CampaignAnalyticsProps {
  campaignId: string;
}

export function CampaignAnalytics({ campaignId }: CampaignAnalyticsProps) {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, eventsRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch(`/api/campaigns/${campaignId}/events?period=${selectedPeriod}`),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.campaign);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedPeriod]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <GlassCard key={i}>
              <GlassSkeleton className="h-20 w-full" />
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  const openRate = stats.sentCount > 0 ? ((stats.openCount / stats.sentCount) * 100).toFixed(1) : '0';
  const clickRate = stats.openCount > 0 ? ((stats.clickCount / stats.openCount) * 100).toFixed(1) : '0';
  const bounceRate = stats.sentCount > 0 ? ((stats.bounceCount / stats.sentCount) * 100).toFixed(1) : '0';
  const deliveryRate = stats.totalRecipients > 0 
    ? (((stats.sentCount - stats.bounceCount) / stats.totalRecipients) * 100).toFixed(1) 
    : '0';

  // Device breakdown simulation (would come from real data)
  const deviceBreakdown = {
    desktop: 45,
    mobile: 48,
    tablet: 7,
  };

  // Time breakdown for opens
  const opensByHour = events
    .filter((e) => e.type === 'open')
    .reduce((acc, event) => {
      const hour = new Date(event.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

  const bestHour = Object.entries(opensByHour).sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{stats.name}</h2>
          <p className="text-white/50">{stats.subject}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
            {(['24h', '7d', '30d', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  selectedPeriod === period
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-white/60 hover:bg-white/[0.05]'
                }`}
              >
                {period === '24h' ? '24ω' : period === '7d' ? '7η' : period === '30d' ? '30η' : 'Όλα'}
              </button>
            ))}
          </div>
          <GlassButton
            variant="default"
            size="sm"
            onClick={fetchAnalytics}
            leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Ανανέωση
          </GlassButton>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/50">Ποσοστό Ανοίγματος</p>
              <p className="text-3xl font-bold text-white mt-1">{openRate}%</p>
              <p className="text-xs text-white/40 mt-1">
                {stats.openCount.toLocaleString()} / {stats.sentCount.toLocaleString()}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <MailOpen className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4">
            <GlassProgress value={parseFloat(openRate)} size="sm" />
          </div>
        </GlassCard>

        <GlassCard hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/50">Ποσοστό Κλικ</p>
              <p className="text-3xl font-bold text-white mt-1">{clickRate}%</p>
              <p className="text-xs text-white/40 mt-1">
                {stats.clickCount.toLocaleString()} κλικ
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
              <MousePointerClick className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div className="mt-4">
            <GlassProgress value={parseFloat(clickRate)} size="sm" />
          </div>
        </GlassCard>

        <GlassCard hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/50">Ποσοστό Αποστολής</p>
              <p className="text-3xl font-bold text-white mt-1">{deliveryRate}%</p>
              <p className="text-xs text-white/40 mt-1">
                {(stats.sentCount - stats.bounceCount).toLocaleString()} delivered
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
              <Send className="h-5 w-5 text-violet-400" />
            </div>
          </div>
          <div className="mt-4">
            <GlassProgress value={parseFloat(deliveryRate)} size="sm" />
          </div>
        </GlassCard>

        <GlassCard hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/50">Bounces</p>
              <p className="text-3xl font-bold text-white mt-1">{bounceRate}%</p>
              <p className="text-xs text-white/40 mt-1">
                {stats.bounceCount.toLocaleString()} bounced
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          </div>
          <div className="mt-4">
            <GlassProgress value={parseFloat(bounceRate)} size="sm" />
          </div>
        </GlassCard>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Device Breakdown */}
        <GlassCard>
          <h3 className="font-medium text-white mb-4 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-cyan-400" />
            Κατανομή Συσκευών
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-white/50" />
                <span className="text-white/70">Desktop</span>
              </div>
              <div className="flex items-center gap-2 w-1/2">
                <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${deviceBreakdown.desktop}%` }}
                  />
                </div>
                <span className="text-sm text-white">{deviceBreakdown.desktop}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-white/50" />
                <span className="text-white/70">Mobile</span>
              </div>
              <div className="flex items-center gap-2 w-1/2">
                <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${deviceBreakdown.mobile}%` }}
                  />
                </div>
                <span className="text-sm text-white">{deviceBreakdown.mobile}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-white/50" />
                <span className="text-white/70">Tablet</span>
              </div>
              <div className="flex items-center gap-2 w-1/2">
                <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${deviceBreakdown.tablet}%` }}
                  />
                </div>
                <span className="text-sm text-white">{deviceBreakdown.tablet}%</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Best Time to Send */}
        <GlassCard>
          <h3 className="font-medium text-white mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            Καλύτερη Ώρα Αποστολής
          </h3>
          {bestHour ? (
            <div className="text-center py-8">
              <p className="text-5xl font-bold text-white">{bestHour[0]}:00</p>
              <p className="text-white/50 mt-2">
                {bestHour[1]} ανοίγματα αυτή την ώρα
              </p>
              <GlassBadge className="mt-4" variant="primary">
                <Clock className="h-3 w-3 mr-1" />
                Προτεινόμενη ώρα αποστολής
              </GlassBadge>
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <Clock className="h-12 w-12 mx-auto mb-2" />
              <p>Μη επαρκή δεδομένα</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent Activity */}
      <GlassCard>
        <h3 className="font-medium text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          Πρόσφατη Δραστηριότητα
        </h3>
        {events.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <BarChart3 className="h-12 w-12 mx-auto mb-2" />
            <p>Δεν υπάρχει δραστηριότητα ακόμα</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {events.slice(0, 20).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      event.type === 'open'
                        ? 'bg-emerald-500/20'
                        : event.type === 'click'
                        ? 'bg-cyan-500/20'
                        : event.type === 'bounce'
                        ? 'bg-red-500/20'
                        : 'bg-amber-500/20'
                    }`}
                  >
                    {event.type === 'open' && <MailOpen className="h-4 w-4 text-emerald-400" />}
                    {event.type === 'click' && <MousePointerClick className="h-4 w-4 text-cyan-400" />}
                    {event.type === 'bounce' && <AlertTriangle className="h-4 w-4 text-red-400" />}
                    {event.type === 'unsubscribe' && <Users className="h-4 w-4 text-amber-400" />}
                  </div>
                  <div>
                    <p className="text-sm text-white">
                      {event.type === 'open' && 'Άνοιγμα email'}
                      {event.type === 'click' && 'Κλικ σε σύνδεσμο'}
                      {event.type === 'bounce' && 'Email bounce'}
                      {event.type === 'unsubscribe' && 'Απεγγραφή'}
                    </p>
                    {event.linkUrl && (
                      <p className="text-xs text-white/40 truncate max-w-xs">{event.linkUrl}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-white/40">
                  {new Date(event.createdAt).toLocaleString('el-GR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

