'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, TrendingUp, Calendar, CheckSquare, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassSkeleton } from '@/components/ui/glass-skeleton';
import { formatCurrency } from '@/lib/utils';

interface DashboardStats {
  overview: {
    totalCustomers: number;
    totalRevenue: number;
    totalLeads: number;
    vipCustomers: number;
    newThisMonth: number;
  };
  topCustomers: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    company: string | null;
    revenue: number | null;
  }>;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  customerName: string | null;
}

// KPI Card Component
function KpiCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <GlassCard className="relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <GlassSkeleton className="h-4 w-24 mb-2" />
            <GlassSkeleton className="h-8 w-32" />
          </div>
          <GlassSkeleton className="h-12 w-12 rounded-xl" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="relative overflow-hidden" glow="primary">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {change && (
            <div className="mt-2 flex items-center gap-2">
              <GlassBadge
                variant={
                  changeType === 'positive'
                    ? 'success'
                    : changeType === 'negative'
                    ? 'error'
                    : 'default'
                }
                size="sm"
              >
                {change}
              </GlassBadge>
              <span className="text-xs text-white/40">vs προηγούμενο μήνα</span>
            </div>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
          <Icon className="h-6 w-6 text-cyan-400" />
        </div>
      </div>
    </GlassCard>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // Fetch statistics and tasks in parallel
      const [statsRes, tasksRes] = await Promise.all([
        fetch('/api/statistics'),
        fetch('/api/tasks?limit=5'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Καλώς ήρθατε! 👋</h1>
          <p className="mt-1 text-white/60">
            Εδώ είναι μια επισκόπηση της επιχείρησής σας
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="ghost" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Ανανέωση
          </GlassButton>
          <GlassButton variant="primary" leftIcon={<UserPlus className="h-4 w-4" />}>
            Νέος Πελάτης
          </GlassButton>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Συνολικοί Πελάτες"
          value={stats?.overview.totalCustomers?.toLocaleString('el-GR') || '0'}
          change={stats?.overview.newThisMonth ? `+${stats.overview.newThisMonth} αυτόν τον μήνα` : undefined}
          changeType="positive"
          icon={Users}
          loading={loading}
        />
        <KpiCard
          title="Νέοι Πελάτες (Μήνας)"
          value={stats?.overview.newThisMonth || 0}
          changeType="positive"
          icon={UserPlus}
          loading={loading}
        />
        <KpiCard
          title="Δυνητικοί Πελάτες"
          value={stats?.overview.totalLeads || 0}
          icon={Mail}
          loading={loading}
        />
        <KpiCard
          title="Συνολικός Τζίρος"
          value={formatCurrency(stats?.overview.totalRevenue || 0)}
          changeType="positive"
          icon={TrendingUp}
          loading={loading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Customers */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Top Πελάτες (κατά Τζίρο)</h2>
            <GlassButton variant="ghost" size="sm" onClick={() => window.location.href = '/customers'}>
              Όλοι
            </GlassButton>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <GlassSkeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats?.topCustomers && stats.topCustomers.length > 0 ? (
            <div className="divide-y divide-white/[0.05]">
              {stats.topCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-sm w-6">{index + 1}.</span>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {customer.firstName} {customer.lastName}
                      </p>
                      {customer.company && (
                        <p className="text-xs text-white/50">{customer.company}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-emerald-400">
                    {formatCurrency(customer.revenue || 0)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/50 text-center py-8">Δεν υπάρχουν πελάτες ακόμα</p>
          )}
        </GlassCard>

        {/* Upcoming Tasks */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Εκκρεμείς Εργασίες</h2>
            <Calendar className="h-5 w-5 text-white/40" />
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <GlassSkeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : pendingTasks.length > 0 ? (
            <div className="space-y-4">
              {pendingTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <GlassBadge 
                      variant={task.priority === 'high' ? 'warning' : task.priority === 'low' ? 'default' : 'primary'} 
                      size="sm"
                    >
                      {task.priority === 'high' ? 'Υψηλή' : task.priority === 'low' ? 'Χαμηλή' : 'Μεσαία'}
                    </GlassBadge>
                    {task.dueDate && (
                      <span className="text-xs text-white/40">
                        {new Date(task.dueDate).toLocaleDateString('el-GR')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white">{task.title}</p>
                  {task.customerName && (
                    <p className="text-xs text-white/50 mt-1">Πελάτης: {task.customerName}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckSquare className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/50 text-sm">Καμία εκκρεμής εργασία</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* VIP Stats */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Σύνοψη Πελατολογίου</h2>
            <p className="text-sm text-white/50">Επισκόπηση δεδομένων</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-white/60">VIP Πελάτες</p>
            <p className="text-2xl font-bold text-white mt-1">
              {loading ? '...' : stats?.overview.vipCustomers || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/60">Μέσος Τζίρος/Πελάτη</p>
            <div className="mt-1">
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : formatCurrency(
                  stats?.overview.totalCustomers 
                    ? (stats.overview.totalRevenue || 0) / stats.overview.totalCustomers 
                    : 0
                )}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-white/60">Δυνητικοί → Πελάτες</p>
            <div className="mt-1">
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : `${stats?.overview.totalLeads || 0} leads`}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-white/60">Νέοι αυτόν τον μήνα</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? '...' : `+${stats?.overview.newThisMonth || 0}`}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
