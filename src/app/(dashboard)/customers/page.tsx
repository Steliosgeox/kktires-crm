'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { cn, formatCurrency, getCategoryLabel, categoryColors } from '@/lib/utils';

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

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/customers?page=${pagination.page}&limit=${pagination.limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      const data = await response.json();
      setCustomers(data.customers || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || data.total || 0,
        totalPages: data.pagination?.totalPages || Math.ceil((data.total || 0) / prev.limit),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα φόρτωσης πελατών');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedCustomers([]);
  }, [pagination.page, pagination.limit]);

  // Customer actions
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
      
      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }
      
      // Remove from list
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveCustomer = async (customerData: any) => {
    const isCreate = modalMode === 'create';
    const url = isCreate ? '/api/customers' : `/api/customers/${selectedCustomer?.id}`;
    const method = isCreate ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      throw new Error('Failed to save customer');
    }

    // Refresh list
    await fetchCustomers();
  };

  const handleSendEmail = (customer: Customer) => {
    if (customer.email) {
      window.location.href = `mailto:${customer.email}`;
    }
  };

  const handleExport = () => {
    router.push('/export');
  };

  const handleImport = () => {
    router.push('/import');
  };

  const handlePageSizeChange = (value: string) => {
    setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
  };

  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.firstName?.toLowerCase().includes(query) ||
      customer.lastName?.toLowerCase().includes(query) ||
      customer.company?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.city?.toLowerCase().includes(query)
    );
  });

  const selectAll = () => {
    setSelectedCustomers(filteredCustomers.map((c) => c.id));
  };

  const deselectAll = () => {
    setSelectedCustomers([]);
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getRowActions = (customer: Customer) => [
    { key: 'view', label: 'Προβολή', icon: <Eye className="h-4 w-4" />, onClick: () => handleViewCustomer(customer) },
    { key: 'edit', label: 'Επεξεργασία', icon: <Edit className="h-4 w-4" />, onClick: () => handleEditCustomer(customer) },
    { key: 'email', label: 'Αποστολή Email', icon: <Mail className="h-4 w-4" />, onClick: () => handleSendEmail(customer), disabled: !customer.email },
    { key: 'divider1', label: '', divider: true },
    { key: 'delete', label: 'Διαγραφή', icon: <Trash2 className="h-4 w-4" />, onClick: () => handleDeleteClick(customer), danger: true },
  ];

  // Calculate display range
  const startItem = ((pagination.page - 1) * pagination.limit) + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  // Loading skeleton
  if (loading && customers.length === 0) {
    return (
      <div className="space-y-6">
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
        <GlassCard>
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            onClick={fetchCustomers}
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
        <GlassCard className="border-red-500/30 bg-red-500/10">
          <div className="flex items-center justify-between">
            <p className="text-red-400">{error}</p>
            <GlassButton size="sm" onClick={fetchCustomers}>
              Δοκιμή Ξανά
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <GlassInput
            placeholder="Αναζήτηση πελατών..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-3">
          <GlassButton 
            variant="default" 
            leftIcon={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0 
              ? <CheckSquare className="h-4 w-4" /> 
              : <Square className="h-4 w-4" />
            }
            onClick={toggleSelectAll}
            disabled={filteredCustomers.length === 0}
          >
            {selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0 
              ? 'Αποεπιλογή Όλων' 
              : 'Επιλέξτε Όλους'
            }
          </GlassButton>
          <GlassButton variant="default" leftIcon={<Filter className="h-4 w-4" />}>
            Φίλτρα
          </GlassButton>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <GlassCard padding="sm" className="flex items-center justify-between">
          <span className="text-sm text-white/70">
            {selectedCustomers.length} επιλεγμένοι από {filteredCustomers.length}
          </span>
          <div className="flex items-center gap-2">
            <GlassButton size="sm" variant="default" leftIcon={<Tag className="h-3 w-3" />}>
              Προσθήκη Ετικέτας
            </GlassButton>
            <GlassButton size="sm" variant="default" leftIcon={<Mail className="h-3 w-3" />}>
              Αποστολή Email
            </GlassButton>
            <GlassButton size="sm" variant="danger" leftIcon={<Trash2 className="h-3 w-3" />}>
              Διαγραφή
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Customers Table */}
      <GlassCard padding="none">
        {filteredCustomers.length === 0 && !loading ? (
          <GlassEmptyState
            icon={customers.length === 0 ? <Plus className="h-8 w-8" /> : <Search className="h-8 w-8" />}
            title={customers.length === 0 ? "Δεν υπάρχουν πελάτες ακόμα" : "Δεν βρέθηκαν πελάτες"}
            description={customers.length === 0 
              ? "Ξεκινήστε προσθέτοντας τον πρώτο σας πελάτη"
              : "Δοκιμάστε διαφορετικούς όρους αναζήτησης"
            }
            action={{
              label: 'Νέος Πελάτης',
              onClick: handleCreateCustomer,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
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
              <tbody className="divide-y divide-white/[0.05]">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={cn(
                      'transition-colors hover:bg-white/[0.02] cursor-pointer',
                      { 'bg-cyan-500/5': selectedCustomers.includes(customer.id) }
                    )}
                    onClick={() => handleViewCustomer(customer)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <GlassAvatar
                          name={`${customer.firstName} ${customer.lastName || ''}`}
                          size="sm"
                          color={categoryColors[customer.category || 'retail']}
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
                          style={{ 
                            backgroundColor: `${categoryColors[customer.category]}20`, 
                            borderColor: `${categoryColors[customer.category]}40`, 
                            color: categoryColors[customer.category] 
                          }}
                        >
                          {getCategoryLabel(customer.category)}
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
                            style={{ 
                              backgroundColor: `${tag.color}20`, 
                              borderColor: `${tag.color}40`, 
                              color: tag.color 
                            }}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Pagination */}
      {filteredCustomers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-white/60">
              Εμφάνιση <span className="font-medium text-white">{startItem}-{endItem}</span> από <span className="font-medium text-white">{pagination.total}</span> πελάτες
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
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
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
                    onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                    className={cn(
                      'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                      pagination.page === pageNum
                        ? 'bg-cyan-500 text-white'
                        : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
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
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
}
