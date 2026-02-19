'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Mail,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassTabs, GlassTabsList, GlassTabsTrigger } from '@/components/ui/glass-tabs';
import { GlassProgressCircle } from '@/components/ui/glass-progress';
import { GlassSkeleton } from '@/components/ui/glass-skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import {
  getCustomerCategoryLabel,
  getCustomerCategoryColor,
} from '@/lib/customers/category';

interface StatsData {
  overview: {
    totalCustomers: number;
    totalRevenue: number;
    totalLeads: number;
    vipCustomers: number;
    newThisMonth: number;
  };
  customersByCategory: Record<string, number>;
  customersByCity: Array<{ city: string; count: number }>;
  topCustomers: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    company: string | null;
    revenue: number | null;
  }>;
  leadsByStatus: Record<string, number>;
}

function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  prefix = '',
  suffix = '',
  loading,
}: {
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}) {
  const isPositive = (change || 0) >= 0;

  if (loading) {
    return (
      <GlassCard>
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
    <GlassCard>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {prefix}
            {typeof value === 'number' && value > 1000
              ? value.toLocaleString('el-GR')
              : value}
            {suffix}
          </p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              )}
              <span
                className={cn('text-sm font-medium', {
                  'text-emerald-400': isPositive,
                  'text-red-400': !isPositive,
                })}
              >
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-white/40">vs προηγ. μήνα</span>
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

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/statistics');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate category distribution
  const categoryDistribution = stats?.customersByCategory 
    ? Object.entries(stats.customersByCategory).map(([category, count]) => {
        const total = Object.values(stats.customersByCategory).reduce((a, b) => a + b, 0);
        return {
          category,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      }).sort((a, b) => b.count - a.count)
    : [];

  // Calculate city distribution
  const cityDistribution = stats?.customersByCity || [];
  const totalByCity = cityDistribution.reduce((sum, c) => sum + c.count, 0);
  const cityWithPercentage = cityDistribution.map(c => ({
    ...c,
    percentage: totalByCity > 0 ? Math.round((c.count / totalByCity) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Στατιστικά</h1>
          <p className="text-white/60">Αναλυτικά στατιστικά και αναφορές (πραγματικά δεδομένα)</p>
        </div>
        <div className="flex items-center gap-3">
          <GlassTabs defaultValue="month" onChange={(v) => setPeriod(v)}>
            <GlassTabsList>
              <GlassTabsTrigger value="week">Εβδομάδα</GlassTabsTrigger>
              <GlassTabsTrigger value="month">Μήνας</GlassTabsTrigger>
              <GlassTabsTrigger value="year">Έτος</GlassTabsTrigger>
            </GlassTabsList>
          </GlassTabs>
          <GlassButton variant="default" leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />} onClick={fetchStats}>
            Ανανέωση
          </GlassButton>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Συνολικοί Πελάτες"
          value={stats?.overview.totalCustomers || 0}
          icon={Users}
          loading={loading}
        />
        <KpiCard
          title="Συνολικός Τζίρος"
          value={stats?.overview.totalRevenue || 0}
          icon={DollarSign}
          prefix="€"
          loading={loading}
        />
        <KpiCard
          title="Δυνητικοί Πελάτες"
          value={stats?.overview.totalLeads || 0}
          icon={Mail}
          loading={loading}
        />
        <KpiCard
          title="VIP Πελάτες"
          value={stats?.overview.vipCustomers || 0}
          icon={TrendingUp}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Distribution */}
        <GlassCard>
          <h3 className="font-semibold text-white mb-6">Κατανομή Κατηγοριών</h3>
          {loading ? (
            <div className="space-y-4">
              {['category-1', 'category-2', 'category-3', 'category-4', 'category-5'].map((skeletonId) => (
                <GlassSkeleton key={skeletonId} className="h-8 w-full" />
              ))}
            </div>
          ) : categoryDistribution.length > 0 ? (
            <div className="space-y-4">
              {categoryDistribution.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70">
                      {getCustomerCategoryLabel(item.category)}
                    </span>
                    <span className="text-sm text-white/50">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: getCustomerCategoryColor(item.category),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/50 text-center py-8">Δεν υπάρχουν δεδομένα</p>
          )}
        </GlassCard>

        {/* City Distribution */}
        <GlassCard>
          <h3 className="font-semibold text-white mb-6">Κατανομή Πόλεων</h3>
          {loading ? (
            <div className="space-y-4">
              <GlassSkeleton className="h-32 w-32 rounded-full mx-auto" />
              {['city-1', 'city-2', 'city-3'].map((skeletonId) => (
                <GlassSkeleton key={skeletonId} className="h-6 w-full" />
              ))}
            </div>
          ) : cityWithPercentage.length > 0 ? (
            <>
              <div className="flex justify-center mb-6">
                <GlassProgressCircle 
                  value={cityWithPercentage[0]?.percentage || 0} 
                  size={120} 
                  strokeWidth={8} 
                />
              </div>
              <div className="space-y-3">
                {cityWithPercentage.slice(0, 5).map((item, i) => (
                  <div key={item.city} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            i === 0 ? '#0ea5e9' : i === 1 ? '#8b5cf6' : i === 2 ? '#ec4899' : i === 3 ? '#10b981' : '#f59e0b',
                        }}
                      />
                      <span className="text-sm text-white/70">{item.city}</span>
                    </div>
                    <span className="text-sm font-medium text-white">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-white/50 text-center py-8">Δεν υπάρχουν δεδομένα</p>
          )}
        </GlassCard>
      </div>

      {/* Top Customers */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Top Πελάτες (κατά Τζίρο)</h3>
          <GlassButton variant="ghost" size="sm" onClick={() => window.location.href = '/customers'}>
            Όλοι
          </GlassButton>
        </div>
        {loading ? (
          <div className="space-y-3">
            {['top-customer-1', 'top-customer-2', 'top-customer-3', 'top-customer-4', 'top-customer-5'].map((skeletonId) => (
              <GlassSkeleton key={skeletonId} className="h-12 w-full" />
            ))}
          </div>
        ) : stats?.topCustomers && stats.topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                    #
                  </th>
                  <th className="py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                    Πελάτης
                  </th>
                  <th className="py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                    Εταιρεία
                  </th>
                  <th className="py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider">
                    Τζίρος
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {stats.topCustomers.map((customer, i) => (
                  <tr key={customer.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-white/40">{i + 1}</td>
                    <td className="py-3 font-medium text-white">
                      {customer.firstName} {customer.lastName}
                    </td>
                    <td className="py-3 text-white/60">{customer.company || '-'}</td>
                    <td className="py-3 text-right font-medium text-emerald-400">
                      {formatCurrency(customer.revenue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-white/50 text-center py-8">Δεν υπάρχουν πελάτες ακόμα</p>
        )}
      </GlassCard>

      {/* Leads by Status */}
      {stats?.leadsByStatus && Object.keys(stats.leadsByStatus).length > 0 && (
        <GlassCard>
          <h3 className="font-semibold text-white mb-6">Δυνητικοί Πελάτες ανά Κατάσταση</h3>
          <div className="grid gap-4 md:grid-cols-6">
            {Object.entries(stats.leadsByStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-white/50 capitalize">{status}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
