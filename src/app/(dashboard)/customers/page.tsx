'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Tag,
  RefreshCw,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassAvatar } from '@/components/ui/glass-avatar';
import { GlassDropdown } from '@/components/ui/glass-dropdown';
import { GlassEmptyState } from '@/components/ui/glass-empty-state';
import { GlassSkeleton } from '@/components/ui/glass-skeleton';
import { GlassSelect } from '@/components/ui/glass-select';
import { CustomerModal } from '@/components/customers/customer-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { cn, formatCurrency } from '@/lib/utils';
import {
  CUSTOMER_CATEGORIES,
  CUSTOMER_CATEGORY_LABELS,
  type CustomerCategory,
  getCustomerCategoryColor,
  getCustomerCategoryLabel,
  normalizeCustomerCategory,
} from '@/lib/customers/category';

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

interface Customer {
  id: string;
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
  tags: CustomerTag[];
}

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 ανά σελίδα' },
  { value: '20', label: '20 ανά σελίδα' },
  { value: '50', label: '50 ανά σελίδα' },
  { value: '100', label: '100 ανά σελίδα' },
];

const CATEGORY_OPTIONS = CUSTOMER_CATEGORIES.map((category) => ({
  value: category,
  label: CUSTOMER_CATEGORY_LABELS[category],
}));

const CATEGORY_BADGE_CLASSES: Record<CustomerCategory, string> = {
  retail: 'bg-teal-500/10 border border-teal-500/30 text-teal-300',
  wholesale: 'bg-blue-500/10 border border-blue-500/30 text-blue-300',
  fleet: 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300',
  garage: 'bg-orange-500/10 border border-orange-500/30 text-orange-300',
  vip: 'bg-amber-500/10 border border-amber-500/30 text-amber-300',
  premium: 'bg-purple-500/10 border border-purple-500/30 text-purple-300',
  standard: 'bg-slate-500/10 border border-slate-500/30 text-slate-300',
  basic: 'bg-zinc-500/10 border border-zinc-500/30 text-zinc-300',
};

const VIP_OPTIONS = [
  { value: 'true', label: 'Μόνο VIP' },
  { value: 'false', label: 'Μη VIP' },
];

// Global selection sentinel — means "all customers matching current filters"
const ALL_SELECTED = '__ALL__' as const;
type SelectionState = string[] | typeof ALL_SELECTED;

const SHELL_CUSTOMERS_REFACTOR_ENABLED =
  process.env.NEXT_PUBLIC_UI_REFACTOR_SHELL_CUSTOMERS === 'true';

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Search & filter state (initialized from URL) ---
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') ?? '');
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') ?? '');
  const [vipFilter, setVipFilter] = useState(searchParams.get('vip') ?? '');
  const [filterOpen, setFilterOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 350);
  const debouncedCity = useDebounce(cityFilter, 350);

  // --- Data state ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') ?? '1', 10) || 1,
    limit: parseInt(searchParams.get('limit') ?? '20', 10) || 20,
    total: 0,
    totalPages: 0,
  });

  // --- Selection state ---
  const [selectedCustomers, setSelectedCustomers] = useState<SelectionState>([]);
  const isGlobalSelect = selectedCustomers === ALL_SELECTED;
  const selectedIds = isGlobalSelect ? [] : (selectedCustomers as string[]);
  const selectedCount = isGlobalSelect ? pagination.total : selectedIds.length;
  const allPageSelected =
    customers.length > 0 && !isGlobalSelect && customers.every((c) => selectedIds.includes(c.id));

  // --- Modal states ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk delete dialog
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Search input ref for keyboard shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Active filter count ---
  const activeFilterCount = [categoryFilter, debouncedCity, vipFilter].filter(Boolean).length;

  // -----------------------------------------------------------------------
  // Core fetch — always server-side with all active filters
  // -----------------------------------------------------------------------
  const fetchCustomers = useCallback(
    async (opts?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      city?: string;
      vip?: string;
    }) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set('page', String(opts?.page ?? 1));
        params.set('limit', String(opts?.limit ?? 20));
        if (opts?.search) params.set('search', opts.search);
        if (opts?.category) params.set('category', opts.category);
        if (opts?.city) params.set('city', opts.city);
        if (opts?.vip) params.set('vip', opts.vip);

        const response = await fetch(`/api/customers?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch customers');
        }

        const data = await response.json();
        setCustomers(data.customers || []);

        const total = data.pagination?.total ?? data.total ?? 0;
        const currentPage = opts?.page ?? 1;
        const currentLimit = opts?.limit ?? 20;
        const totalPages = data.pagination?.totalPages ?? Math.ceil(total / currentLimit);

        setPagination((prev) => ({
          ...prev,
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Σφάλμα φόρτωσης πελατών');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // -----------------------------------------------------------------------
  // Pagination ref for stable callbacks
  // -----------------------------------------------------------------------
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;

  // -----------------------------------------------------------------------
  // Refetch whenever search/filters change — always reset to page 1
  // -----------------------------------------------------------------------
  const filtersKey = `${debouncedSearch}|${categoryFilter}|${debouncedCity}|${vipFilter}`;
  const prevFiltersKey = useRef(filtersKey);

  useEffect(() => {
    if (prevFiltersKey.current !== filtersKey) {
      // Filters changed — reset to page 1
      prevFiltersKey.current = filtersKey;
      setSelectedCustomers([]);
      fetchCustomers({
        page: 1,
        limit: paginationRef.current.limit,
        search: debouncedSearch,
        category: categoryFilter,
        city: debouncedCity,
        vip: vipFilter,
      });
    }
  }, [filtersKey, debouncedSearch, categoryFilter, debouncedCity, vipFilter, fetchCustomers]);

  // Initial load
  useEffect(() => {
    fetchCustomers({
      page: paginationRef.current.page,
      limit: paginationRef.current.limit,
      search: debouncedSearch,
      category: categoryFilter,
      city: debouncedCity,
      vip: vipFilter,
    });
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle ?new=true param
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      handleCreateCustomer();
      router.replace('/customers');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // -----------------------------------------------------------------------
  // URL sync — keep URL in sync with current filters/page
  // -----------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoryFilter) params.set('category', categoryFilter);
    if (debouncedCity) params.set('city', debouncedCity);
    if (vipFilter) params.set('vip', vipFilter);
    if (pagination.page > 1) params.set('page', String(pagination.page));
    if (pagination.limit !== 20) params.set('limit', String(pagination.limit));
    const qs = params.toString();
    router.replace(`/customers${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [debouncedSearch, categoryFilter, debouncedCity, vipFilter, pagination.page, pagination.limit, router]);

  // -----------------------------------------------------------------------
  // Keyboard shortcut: "/" focuses search bar
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // -----------------------------------------------------------------------
  // Pagination handlers
  // -----------------------------------------------------------------------
  const handlePageChange = useCallback(
    (newPage: number) => {
      setSelectedCustomers([]);
      fetchCustomers({
        page: newPage,
        limit: paginationRef.current.limit,
        search: debouncedSearch,
        category: categoryFilter,
        city: debouncedCity,
        vip: vipFilter,
      });
    },
    [fetchCustomers, debouncedSearch, categoryFilter, debouncedCity, vipFilter]
  );

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLimit = parseInt(e.target.value, 10);
      setSelectedCustomers([]);
      fetchCustomers({
        page: 1,
        limit: newLimit,
        search: debouncedSearch,
        category: categoryFilter,
        city: debouncedCity,
        vip: vipFilter,
      });
    },
    [fetchCustomers, debouncedSearch, categoryFilter, debouncedCity, vipFilter]
  );

  // -----------------------------------------------------------------------
  // Selection handlers
  // -----------------------------------------------------------------------
  const toggleSelect = (id: string) => {
    if (isGlobalSelect) {
      // Coming out of global select — select all current page except this one
      setSelectedCustomers(customers.map((c) => c.id).filter((cid) => cid !== id));
    } else {
      setSelectedCustomers((prev) =>
        (prev as string[]).includes(id)
          ? (prev as string[]).filter((i) => i !== id)
          : [...(prev as string[]), id]
      );
    }
  };

  const toggleSelectAll = () => {
    if (isGlobalSelect || allPageSelected) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map((c) => c.id));
    }
  };

  const activateGlobalSelect = () => {
    setSelectedCustomers(ALL_SELECTED);
  };

  // -----------------------------------------------------------------------
  // Customer CRUD actions
  // -----------------------------------------------------------------------
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete customer');
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      await fetchCustomers({
        page: paginationRef.current.page,
        limit: paginationRef.current.limit,
        search: debouncedSearch,
        category: categoryFilter,
        city: debouncedCity,
        vip: vipFilter,
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setDeleting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Bulk delete
  // -----------------------------------------------------------------------
  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    try {
      if (isGlobalSelect) {
        // Delete all matching current filters — fetch all IDs in batches
        let page = 1;
        const idsToDelete: string[] = [];
        while (true) {
          const params = new URLSearchParams({ page: String(page), limit: '100' });
          if (debouncedSearch) params.set('search', debouncedSearch);
          if (categoryFilter) params.set('category', categoryFilter);
          if (debouncedCity) params.set('city', debouncedCity);
          if (vipFilter) params.set('vip', vipFilter);
          const res = await fetch(`/api/customers?${params.toString()}`);
          const data = await res.json();
          const batch: Customer[] = data.customers || [];
          idsToDelete.push(...batch.map((c) => c.id));
          if (batch.length < 100) break;
          page++;
        }
        for (const id of idsToDelete) {
          await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        }
      } else {
        for (const id of selectedIds) {
          await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        }
      }
      setSelectedCustomers([]);
      setBulkDeleteOpen(false);
      await fetchCustomers({
        page: 1,
        limit: paginationRef.current.limit,
        search: debouncedSearch,
        category: categoryFilter,
        city: debouncedCity,
        vip: vipFilter,
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
    } finally {
      setBulkDeleting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Bulk email — navigate to email page with context
  // -----------------------------------------------------------------------
  const handleBulkEmail = () => {
    if (isGlobalSelect) {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryFilter) params.set('category', categoryFilter);
      if (debouncedCity) params.set('city', debouncedCity);
      if (vipFilter) params.set('vip', vipFilter);
      router.push(`/email?${params.toString()}`);
    } else {
      router.push(`/email?customerIds=${selectedIds.join(',')}`);
    }
  };

  // -----------------------------------------------------------------------
  // Save customer
  // -----------------------------------------------------------------------
  const handleSaveCustomer = async (customerData: unknown) => {
    const isCreate = modalMode === 'create';
    const url = isCreate ? '/api/customers' : `/api/customers/${selectedCustomer?.id}`;
    const method = isCreate ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) throw new Error('Failed to save customer');

    await fetchCustomers({
      page: paginationRef.current.page,
      limit: paginationRef.current.limit,
      search: debouncedSearch,
      category: categoryFilter,
      city: debouncedCity,
      vip: vipFilter,
    });
  };

  const handleSendEmail = (customer: Customer) => {
    if (customer.email) {
      window.location.href = `mailto:${customer.email}`;
    }
  };

  const handleExport = () => router.push('/export');
  const handleImport = () => router.push('/import');

  // -----------------------------------------------------------------------
  // Filter helpers
  // -----------------------------------------------------------------------
  const clearAllFilters = () => {
    setCategoryFilter('');
    setCityFilter('');
    setVipFilter('');
    setSearchQuery('');
  };

  // -----------------------------------------------------------------------
  // Row actions
  // -----------------------------------------------------------------------
  const getRowActions = (customer: Customer) => [
    { key: 'view', label: 'Προβολή', icon: <Eye className="h-4 w-4" />, onClick: () => handleViewCustomer(customer) },
    { key: 'edit', label: 'Επεξεργασία', icon: <Edit className="h-4 w-4" />, onClick: () => handleEditCustomer(customer) },
    { key: 'email', label: 'Αποστολή Email', icon: <Mail className="h-4 w-4" />, onClick: () => handleSendEmail(customer), disabled: !customer.email },
    { key: 'divider1', label: '', divider: true },
    { key: 'delete', label: 'Διαγραφή', icon: <Trash2 className="h-4 w-4" />, onClick: () => handleDeleteClick(customer), danger: true },
  ];

  // Display range
  const startItem = ((pagination.page - 1) * pagination.limit) + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);
  const hasActiveSearch = !!debouncedSearch;

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------
  if (loading && customers.length === 0) {
    return (
      <div
        className={cn(
          'space-y-6',
          SHELL_CUSTOMERS_REFACTOR_ENABLED &&
            'customers-industrial customers-industrial-card text-zinc-100'
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <GlassSkeleton className="h-8 w-32 mb-2" />
            <GlassSkeleton className="h-5 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <GlassSkeleton className="h-10 w-24" />
            <GlassSkeleton className="h-10 w-24" />
            <GlassSkeleton className="h-10 w-32" />
          </div>
        </div>
        <GlassCard
          className={cn(
            SHELL_CUSTOMERS_REFACTOR_ENABLED &&
              '!bg-[var(--surface-2)] !border-[var(--border-soft)] !backdrop-blur-none'
          )}
        >
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-white/[0.05]">
              <GlassSkeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <GlassSkeleton className="h-4 w-32 mb-2" />
                <GlassSkeleton className="h-3 w-24" />
              </div>
              <GlassSkeleton className="h-4 w-20" />
            </div>
          ))}
        </GlassCard>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  return (
    <div
      className={cn(
        'space-y-6',
        SHELL_CUSTOMERS_REFACTOR_ENABLED &&
          'customers-industrial customers-industrial-card text-zinc-100'
      )}
    >
      {/* Page Header */}
      <div
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
          SHELL_CUSTOMERS_REFACTOR_ENABLED && 'rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4'
        )}
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Πελάτες</h1>
          <p className="text-white/60">
            Διαχείριση όλων των πελατών σας ({pagination.total} σύνολο)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton
            variant="default"
            leftIcon={<RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />}
            onClick={() => fetchCustomers({
              page: pagination.page,
              limit: pagination.limit,
              search: debouncedSearch,
              category: categoryFilter,
              city: debouncedCity,
              vip: vipFilter,
            })}
            disabled={loading}
          >
            Ανανέωση
          </GlassButton>
          <GlassButton variant="default" leftIcon={<Upload className="h-4 w-4" />} onClick={handleImport}>
            Εισαγωγή
          </GlassButton>
          <GlassButton variant="default" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
            Εξαγωγή
          </GlassButton>
          <GlassButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={handleCreateCustomer}>
            Νέος Πελάτης
          </GlassButton>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <GlassCard
          className={cn(
            'border-red-500/30 bg-red-500/10',
            SHELL_CUSTOMERS_REFACTOR_ENABLED &&
              '!bg-red-500/10 !border-red-500/30 !backdrop-blur-none'
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-red-400">{error}</p>
            <GlassButton size="sm" onClick={() => fetchCustomers({ page: pagination.page, limit: pagination.limit })}>
              Δοκιμή Ξανά
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <GlassInput
              ref={searchInputRef}
              placeholder="Αναζήτηση πελατών... (πατήστε / για εστίαση)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                SHELL_CUSTOMERS_REFACTOR_ENABLED &&
                  '!bg-[var(--surface-1)] !border-[var(--border-soft)] !backdrop-blur-none !shadow-none'
              )}
              leftIcon={
                loading && hasActiveSearch
                  ? <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                  : <Search className="h-4 w-4" />
              }
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                aria-label="Καθαρισμός αναζήτησης"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <GlassButton
              variant="default"
              leftIcon={
                isGlobalSelect || allPageSelected
                  ? <CheckSquare className="h-4 w-4" />
                  : <Square className="h-4 w-4" />
              }
              onClick={toggleSelectAll}
              disabled={customers.length === 0}
            >
              {isGlobalSelect || allPageSelected ? 'Αποεπιλογή Όλων' : 'Επιλέξτε Όλους'}
            </GlassButton>
            <GlassButton
              variant={filterOpen || activeFilterCount > 0 ? 'primary' : 'default'}
              leftIcon={<Filter className="h-4 w-4" />}
              onClick={() => setFilterOpen((o) => !o)}
            >
              Φίλτρα{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </GlassButton>
          </div>
        </div>

        {/* Filter Panel */}
        {filterOpen && (
          <GlassCard
            padding="sm"
            className={cn(
              'border border-white/10',
              SHELL_CUSTOMERS_REFACTOR_ENABLED &&
                '!bg-[var(--surface-2)] !border-[var(--border-soft)] !backdrop-blur-none'
            )}
          >
            <div className="flex flex-wrap items-end gap-4">
              {/* Category */}
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-white/50 mb-1.5">Κατηγορία</label>
                <GlassSelect
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={CATEGORY_OPTIONS}
                  placeholder="Όλες οι κατηγορίες"
                />
              </div>

              {/* City */}
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-white/50 mb-1.5">Πόλη</label>
                <GlassInput
                  placeholder="π.χ. Αθήνα"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>

              {/* VIP */}
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs text-white/50 mb-1.5">VIP</label>
                <GlassSelect
                  value={vipFilter}
                  onChange={(e) => setVipFilter(e.target.value)}
                  options={VIP_OPTIONS}
                  placeholder="Όλοι"
                />
              </div>

              {/* Clear */}
              {activeFilterCount > 0 && (
                <GlassButton
                  variant="default"
                  size="sm"
                  leftIcon={<X className="h-3 w-3" />}
                  onClick={clearAllFilters}
                >
                  Καθαρισμός
                </GlassButton>
              )}
            </div>
          </GlassCard>
        )}
      </div>

      {/* Bulk Actions */}
      {(selectedCount > 0) && (
        <GlassCard
          padding="sm"
          className={cn(
            'border border-cyan-500/20 bg-cyan-500/5',
            SHELL_CUSTOMERS_REFACTOR_ENABLED &&
              '!bg-[var(--surface-2)] !border-[var(--border-soft)] !backdrop-blur-none'
          )}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-white/70">
                {selectedCount} επιλεγμένοι από {pagination.total}
              </span>
              {/* Global select banner */}
              {allPageSelected && !isGlobalSelect && pagination.total > customers.length && (
                <button
                  onClick={activateGlobalSelect}
                  className={cn(
                    'text-left text-xs text-cyan-400 transition-colors hover:text-cyan-300',
                    SHELL_CUSTOMERS_REFACTOR_ENABLED &&
                      'text-[var(--accent-primary)] hover:text-[var(--accent-primary-strong)]'
                  )}
                >
                  Επιλογή και των {pagination.total} πελατών που ταιριάζουν με τα φίλτρα →
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <GlassButton
                size="sm"
                variant="default"
                leftIcon={<Tag className="h-3 w-3" />}
                onClick={() => {/* Phase 4c — tag modal, TODO */}}
              >
                Προσθήκη Ετικέτας
              </GlassButton>
              <GlassButton
                size="sm"
                variant="default"
                leftIcon={<Mail className="h-3 w-3" />}
                onClick={handleBulkEmail}
              >
                Αποστολή Email
              </GlassButton>
              <GlassButton
                size="sm"
                variant="danger"
                leftIcon={<Trash2 className="h-3 w-3" />}
                onClick={() => setBulkDeleteOpen(true)}
              >
                Διαγραφή
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Search result count hint */}
      {hasActiveSearch && !loading && (
        <p className="text-sm text-white/50">
          Βρέθηκαν <span className="text-white font-medium">{pagination.total}</span> πελάτες για «{debouncedSearch}»
        </p>
      )}

      {/* Customers Table */}
      <GlassCard
        padding="none"
        className={cn(
          SHELL_CUSTOMERS_REFACTOR_ENABLED &&
            '!bg-[var(--surface-2)] !border-[var(--border-soft)] !backdrop-blur-none'
        )}
      >
        {customers.length === 0 && !loading ? (
          <GlassEmptyState
            icon={hasActiveSearch || activeFilterCount > 0 ? <Search className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
            title={hasActiveSearch || activeFilterCount > 0 ? "Δεν βρέθηκαν πελάτες" : "Δεν υπάρχουν πελάτες ακόμα"}
            description={
              hasActiveSearch
                ? `Κανένας πελάτης για «${debouncedSearch}». Δοκιμάστε άλλους όρους αναζήτησης.`
                : activeFilterCount > 0
                ? "Κανένας πελάτης δεν ταιριάζει με τα ενεργά φίλτρα."
                : "Ξεκινήστε προσθέτοντας τον πρώτο σας πελάτη"
            }
            action={
              hasActiveSearch || activeFilterCount > 0
                ? { label: 'Καθαρισμός Φίλτρων', onClick: clearAllFilters }
                : { label: 'Νέος Πελάτης', onClick: handleCreateCustomer }
            }
          />
        ) : (
          <div
            className={cn(
              'overflow-x-auto',
              loading && 'opacity-60 pointer-events-none',
              SHELL_CUSTOMERS_REFACTOR_ENABLED && 'rounded-xl border border-[var(--border-soft)]'
            )}
          >
            <table className="w-full" role="table" aria-label="Λίστα πελατών">
              <thead>
                <tr
                  className={cn(
                    'border-b border-white/[0.08]',
                    SHELL_CUSTOMERS_REFACTOR_ENABLED && 'border-[var(--border-soft)] bg-[var(--surface-3)]'
                  )}
                >
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={isGlobalSelect || allPageSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-500"
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                    Πελάτης
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                    Επικοινωνία
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                    Πόλη
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                    Κατηγορία
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                    Ετικέτες
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white/50">
                    Τζίρος
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white/50">
                    Ενέργειες
                  </th>
                </tr>
              </thead>
              <tbody
                className={cn(
                  'divide-y divide-white/[0.05]',
                  SHELL_CUSTOMERS_REFACTOR_ENABLED && 'divide-[var(--border-soft)]'
                )}
              >
                {customers.map((customer) => {
                  const isSelected = isGlobalSelect || selectedIds.includes(customer.id);
                  return (
                    <tr
                      key={customer.id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-white/[0.02]',
                        {
                          'bg-cyan-500/5': isSelected && !SHELL_CUSTOMERS_REFACTOR_ENABLED,
                          'bg-blue-500/10': isSelected && SHELL_CUSTOMERS_REFACTOR_ENABLED,
                        },
                        SHELL_CUSTOMERS_REFACTOR_ENABLED &&
                          'hover:bg-[var(--surface-3)]'
                      )}
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(customer.id)}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <GlassAvatar
                            name={`${customer.firstName} ${customer.lastName || ''}`}
                            size="sm"
                            color={getCustomerCategoryColor(customer.category)}
                            glow={customer.isVip || false}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {customer.firstName} {customer.lastName}
                              </span>
                              {customer.isVip && <span className="text-amber-400">⭐</span>}
                            </div>
                            {customer.company && (
                              <span className="text-sm text-white/50">{customer.company}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[180px]">{customer.email}</span>
                            </div>
                          )}
                          {(customer.phone || customer.mobile) && (
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <Phone className="h-3 w-3" />
                              {customer.phone || customer.mobile}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {customer.city && (
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <MapPin className="h-3 w-3" />
                            {customer.city}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {customer.category && (
                          <GlassBadge
                            className={cn(
                              'border',
                              CATEGORY_BADGE_CLASSES[
                                normalizeCustomerCategory(customer.category) ?? 'wholesale'
                              ]
                            )}
                          >
                            {getCustomerCategoryLabel(customer.category)}
                          </GlassBadge>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {customer.tags?.slice(0, 2).map((tag) => (
                            <GlassBadge
                              key={tag.id}
                              size="sm"
                              variant="default"
                              className="border border-white/[0.12] bg-white/[0.02] text-white/70"
                            >
                              {tag.name}
                            </GlassBadge>
                          ))}
                          {customer.tags && customer.tags.length > 2 && (
                            <GlassBadge size="sm" variant="default">
                              +{customer.tags.length - 2}
                            </GlassBadge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-medium text-white">
                          {formatCurrency(customer.revenue || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <GlassDropdown
                          trigger={
                            <GlassButton variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </GlassButton>
                          }
                          items={getRowActions(customer)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Pagination */}
      {customers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-white/60">
              Εμφάνιση{' '}
              <span className="font-medium text-white">{startItem}–{endItem}</span>{' '}
              από{' '}
              <span className="font-medium text-white">{pagination.total}</span>{' '}
              πελάτες
            </p>
            <div className="w-40">
              <GlassSelect
                value={pagination.limit.toString()}
                onChange={handlePageSizeChange}
                options={PAGE_SIZE_OPTIONS}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlassButton
              variant="default"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => handlePageChange(pagination.page - 1)}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Προηγούμενο
            </GlassButton>
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                    className={cn(
                      'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                      pagination.page === pageNum
                        ? 'bg-cyan-500 text-white'
                        : 'text-white/60 hover:bg-white/[0.05] hover:text-white',
                      loading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <GlassButton
              variant="default"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => handlePageChange(pagination.page + 1)}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Επόμενο
            </GlassButton>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={selectedCustomer}
        mode={modalMode}
        onSave={handleSaveCustomer}
      />

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Διαγραφή Πελάτη"
        description={`Είστε σίγουροι ότι θέλετε να διαγράψετε τον πελάτη "${customerToDelete?.firstName} ${customerToDelete?.lastName}"? Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`}
        confirmText="Διαγραφή"
        variant="danger"
        loading={deleting}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Μαζική Διαγραφή Πελατών"
        description={
          isGlobalSelect
            ? `Είστε σίγουροι ότι θέλετε να διαγράψετε ΟΛΟΥΣ τους ${pagination.total} πελάτες που ταιριάζουν με τα τρέχοντα φίλτρα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
            : `Είστε σίγουροι ότι θέλετε να διαγράψετε ${selectedCount} πελάτες; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
        }
        confirmText={`Διαγραφή ${selectedCount} πελατών`}
        variant="danger"
        loading={bulkDeleting}
      />
    </div>
  );
}
