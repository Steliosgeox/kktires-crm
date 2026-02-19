'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  Mail,
  MapPin,
  Search,
  Tag,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import useSWR from 'swr';

import {
  hasRecipientSelection,
  normalizeRecipientFiltersClient,
  parseManualEmailsInput,
  type RecipientFilters,
} from '@/lib/email/recipient-filters';
import { messagesEl } from '@/lib/i18n/ui/messages-el';
import { toast } from '@/lib/stores/ui-store';

interface CityData {
  city: string;
  count: number;
}

interface TagData {
  id: string;
  name: string;
  color: string;
}

interface SegmentData {
  id: string;
  name: string;
  customerCount: number;
}

interface CustomerData {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  city: string | null;
}

interface OutlookRecipientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: RecipientFilters;
  onFiltersChange: (filters: RecipientFilters) => void;
}

type TabType = 'cities' | 'tags' | 'segments' | 'customers' | 'manualEmails';

const EMPTY_CUSTOMER_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  city: '',
  company: '',
};

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export function OutlookRecipientDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
}: OutlookRecipientDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('cities');
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ ...EMPTY_CUSTOMER_FORM });

  const normalizedFilters = useMemo(() => normalizeRecipientFiltersClient(filters), [filters]);

  const tabs = [
    { id: 'cities' as TabType, label: messagesEl.common.cities, icon: MapPin },
    { id: 'tags' as TabType, label: messagesEl.common.tags, icon: Tag },
    { id: 'segments' as TabType, label: messagesEl.common.segments, icon: Users },
    { id: 'customers' as TabType, label: messagesEl.common.customers, icon: User },
    { id: 'manualEmails' as TabType, label: messagesEl.email.manualEmails, icon: Mail },
  ];

  const selectedCounts = {
    cities: normalizedFilters.cities.length,
    tags: normalizedFilters.tags.length,
    segments: normalizedFilters.segments.length,
    customers: normalizedFilters.customerIds.length,
    manualEmails: normalizedFilters.rawEmails.length,
  };

  const { data: optionsData, isLoading: optionsLoading } = useSWR<{
    cities: CityData[];
    tags: TagData[];
    segments: SegmentData[];
  }>(
    isOpen ? 'recipient-drawer/options' : null,
    async () => {
      const [locations, tagList, segmentList] = await Promise.all([
        fetchJson<{ cities?: Array<{ name: string; count: number }> }>('/api/customers/locations'),
        fetchJson<{ tags?: TagData[] }>('/api/tags'),
        fetchJson<{ segments?: SegmentData[] }>('/api/segments'),
      ]);

      return {
        cities: (locations.cities || []).map((entry) => ({ city: entry.name, count: entry.count })),
        tags: tagList.tags || [],
        segments: segmentList.segments || [],
      };
    },
    {
      revalidateOnFocus: false,
      onError: () => {
        toast.error('Αποτυχία φόρτωσης', 'Δεν φορτώθηκαν τα φίλτρα παραληπτών.');
      },
    }
  );

  const customerQueryKey = useMemo(() => {
    if (!isOpen) return null;
    const params = new URLSearchParams({ limit: '50', page: '1' });
    if (customerSearch.trim()) {
      params.set('search', customerSearch.trim());
    }
    return `/api/customers?${params.toString()}`;
  }, [isOpen, customerSearch]);

  const {
    data: customersData,
    isLoading: customersLoading,
    mutate: mutateCustomers,
  } = useSWR<{ customers?: CustomerData[] }>(
    customerQueryKey,
    fetchJson,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      onError: () => {
        toast.error('Αποτυχία φόρτωσης', 'Δεν φορτώθηκαν οι πελάτες.');
      },
    }
  );

  const recipientCountKey = useMemo(() => {
    if (!isOpen || !hasRecipientSelection(normalizedFilters)) return null;
    const params = new URLSearchParams();
    if (normalizedFilters.cities.length) params.set('cities', normalizedFilters.cities.join(','));
    if (normalizedFilters.tags.length) params.set('tags', normalizedFilters.tags.join(','));
    if (normalizedFilters.segments.length) params.set('segments', normalizedFilters.segments.join(','));
    if (normalizedFilters.categories.length) params.set('categories', normalizedFilters.categories.join(','));
    if (normalizedFilters.customerIds.length) params.set('customerIds', normalizedFilters.customerIds.join(','));
    if (normalizedFilters.rawEmails.length) params.set('rawEmails', normalizedFilters.rawEmails.join(','));
    return `/api/recipients/count?${params.toString()}`;
  }, [isOpen, normalizedFilters]);

  const { data: recipientCountData, isLoading: recipientCountLoading } = useSWR<{ count?: number }>(
    recipientCountKey,
    fetchJson,
    {
      revalidateOnFocus: false,
      onError: () => {
        toast.error('Αποτυχία μέτρησης', 'Δεν ήταν δυνατός ο υπολογισμός παραληπτών.');
      },
    }
  );

  const cities = optionsData?.cities || [];
  const tags = optionsData?.tags || [];
  const segments = optionsData?.segments || [];
  const customers = customersData?.customers || [];
  const recipientCount = typeof recipientCountData?.count === 'number' ? recipientCountData.count : null;

  const updateFilters = (next: RecipientFilters) => onFiltersChange(normalizeRecipientFiltersClient(next));

  const toggle = (key: keyof RecipientFilters, value: string) => {
    const values = normalizedFilters[key];
    updateFilters({
      ...normalizedFilters,
      [key]: values.includes(value)
        ? values.filter((entry) => entry !== value)
        : [...values, value],
    });
  };

  const filteredCities = cities.filter((entry) => entry.city.toLowerCase().includes(search.toLowerCase()));
  const filteredTags = tags.filter((entry) => entry.name.toLowerCase().includes(search.toLowerCase()));
  const filteredSegments = segments.filter((entry) => entry.name.toLowerCase().includes(search.toLowerCase()));

  const addManualEmails = () => {
    const { valid, invalid } = parseManualEmailsInput(manualInput);
    setInvalidEmails(invalid);
    if (valid.length === 0) return;

    updateFilters({
      ...normalizedFilters,
      rawEmails: Array.from(new Set([...normalizedFilters.rawEmails, ...valid])),
    });
    setManualInput('');
    toast.success('Προστέθηκαν email', `${valid.length} email προστέθηκαν.`);
  };

  const createCustomer = async () => {
    const firstName = customerForm.firstName.trim();
    const email = customerForm.email.trim();

    if (!firstName || !email) {
      toast.warning('Ελλιπή στοιχεία', 'Το όνομα και το email είναι υποχρεωτικά.');
      return;
    }

    setCreatingCustomer(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName: customerForm.lastName.trim() || undefined,
          email,
          city: customerForm.city.trim() || undefined,
          company: customerForm.company.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'Αποτυχία δημιουργίας πελάτη'
        );
      }

      const createdId = String(data.id || '');
      if (createdId) {
        updateFilters({
          ...normalizedFilters,
          customerIds: Array.from(new Set([...normalizedFilters.customerIds, createdId])),
        });
      }

      mutateCustomers((current) => {
        const existing = current?.customers || [];
        const createdCustomer = data as CustomerData;
        if (!createdCustomer?.id || existing.some((customer) => customer.id === createdCustomer.id)) {
          return current;
        }
        return { customers: [createdCustomer, ...existing] };
      }, { revalidate: false });

      setCustomerForm({ ...EMPTY_CUSTOMER_FORM });
      toast.success('Ο πελάτης δημιουργήθηκε', messagesEl.email.customerCreated);
    } catch (error) {
      toast.error(
        'Αποτυχία',
        error instanceof Error ? error.message : 'Αποτυχία δημιουργίας πελάτη'
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Κλείσιμο επιλογής παραληπτών"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm outlook-animate-fade"
        onClick={onClose}
      />

      <div
        className="fixed top-0 right-0 h-full w-96 z-50 flex flex-col"
        style={{
          background: 'var(--outlook-bg-panel)',
          boxShadow: 'var(--outlook-shadow-lg)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--outlook-border)' }}
        >
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--outlook-text-primary)' }}
          >
            {messagesEl.email.recipients}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
            style={{ color: 'var(--outlook-text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-5 border-b" style={{ borderColor: 'var(--outlook-border)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const selected = selectedCounts[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="relative flex flex-col items-center justify-center gap-1 py-2 text-[11px]"
                style={{
                  color: isActive ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)',
                  background: isActive ? 'var(--outlook-bg-hover)' : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[70px]">{tab.label}</span>
                {selected > 0 && (
                  <span
                    className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{
                      background: 'var(--outlook-accent)',
                      color: 'white',
                    }}
                  >
                    {selected}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {(activeTab === 'cities' || activeTab === 'tags' || activeTab === 'segments') && (
          <div className="p-3 border-b" style={{ borderColor: 'var(--outlook-border-subtle)' }}>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--outlook-text-tertiary)' }}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`${messagesEl.common.search}...`}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-md"
                style={{
                  background: 'var(--outlook-bg-surface)',
                  border: '1px solid var(--outlook-border)',
                  color: 'var(--outlook-text-primary)',
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="p-3 border-b space-y-2" style={{ borderColor: 'var(--outlook-border-subtle)' }}>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--outlook-text-tertiary)' }}
              />
              <input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Αναζήτηση πελατών..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-md"
                style={{
                  background: 'var(--outlook-bg-surface)',
                  border: '1px solid var(--outlook-border)',
                  color: 'var(--outlook-text-primary)',
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={customerForm.firstName}
                onChange={(event) =>
                  setCustomerForm((current) => ({ ...current, firstName: event.target.value }))
                }
                placeholder="Όνομα*"
                className="px-2 py-1.5 text-xs rounded-md"
                style={{
                  background: 'var(--outlook-bg-surface)',
                  border: '1px solid var(--outlook-border)',
                }}
              />
              <input
                value={customerForm.email}
                onChange={(event) =>
                  setCustomerForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="Email*"
                className="px-2 py-1.5 text-xs rounded-md"
                style={{
                  background: 'var(--outlook-bg-surface)',
                  border: '1px solid var(--outlook-border)',
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => void createCustomer()}
              disabled={creatingCustomer}
              className="w-full py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5"
              style={{
                background: 'var(--outlook-accent-light)',
                color: 'var(--outlook-accent)',
              }}
            >
              {creatingCustomer ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              {messagesEl.email.addCustomer}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {optionsLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {!optionsLoading && activeTab === 'cities' && (
            <>
              <div className="flex justify-between text-xs">
                <button
                  type="button"
                  onClick={() =>
                    updateFilters({
                      ...normalizedFilters,
                      cities: cities.map((entry) => entry.city),
                    })
                  }
                  style={{ color: 'var(--outlook-accent)' }}
                >
                  Επιλογή όλων
                </button>
                <button
                  type="button"
                  onClick={() => updateFilters({ ...normalizedFilters, cities: [] })}
                  style={{ color: 'var(--outlook-text-tertiary)' }}
                >
                  {messagesEl.common.clear}
                </button>
              </div>

              {filteredCities.map((entry) => (
                <button
                  key={entry.city}
                  type="button"
                  onClick={() => toggle('cities', entry.city)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-md"
                  style={{
                    background: normalizedFilters.cities.includes(entry.city)
                      ? 'var(--outlook-accent-light)'
                      : 'transparent',
                  }}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Check
                      className={`w-3.5 h-3.5 ${
                        normalizedFilters.cities.includes(entry.city) ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    {entry.city}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--outlook-text-tertiary)' }}>
                    {entry.count}
                  </span>
                </button>
              ))}
            </>
          )}

          {!optionsLoading && activeTab === 'tags' && filteredTags.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => toggle('tags', entry.id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm"
              style={{
                background: normalizedFilters.tags.includes(entry.id)
                  ? 'var(--outlook-accent-light)'
                  : 'transparent',
              }}
            >
              <Check
                className={`w-3.5 h-3.5 ${
                  normalizedFilters.tags.includes(entry.id) ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <span className="w-3 h-3 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </button>
          ))}

          {!optionsLoading && activeTab === 'segments' && filteredSegments.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => toggle('segments', entry.id)}
              className="w-full flex items-center justify-between px-2 py-2 rounded-md text-sm"
              style={{
                background: normalizedFilters.segments.includes(entry.id)
                  ? 'var(--outlook-accent-light)'
                  : 'transparent',
              }}
            >
              <span className="flex items-center gap-2">
                <Check
                  className={`w-3.5 h-3.5 ${
                    normalizedFilters.segments.includes(entry.id) ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                {entry.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--outlook-text-tertiary)' }}>
                {entry.customerCount}
              </span>
            </button>
          ))}

          {activeTab === 'customers' && (
            customersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              customers.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => toggle('customerIds', entry.id)}
                  className="w-full text-left px-2 py-2 rounded-md text-sm"
                  style={{
                    background: normalizedFilters.customerIds.includes(entry.id)
                      ? 'var(--outlook-accent-light)'
                      : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={`w-3.5 h-3.5 ${
                        normalizedFilters.customerIds.includes(entry.id) ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    {`${entry.firstName || ''} ${entry.lastName || ''}`.trim() || entry.company || 'Χωρίς όνομα'}
                  </div>
                  <div className="text-xs pl-6" style={{ color: 'var(--outlook-text-tertiary)' }}>
                    {entry.email || '—'}
                  </div>
                </button>
              ))
            )
          )}

          {!optionsLoading && activeTab === 'manualEmails' && (
            <div className="space-y-2">
              <div className="text-xs" style={{ color: 'var(--outlook-text-secondary)' }}>
                {messagesEl.email.manualEmailsHint}
              </div>
              <textarea
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                rows={4}
                className="w-full px-2 py-2 rounded-md text-sm"
                style={{
                  background: 'var(--outlook-bg-surface)',
                  border: '1px solid var(--outlook-border)',
                }}
              />
              <button
                type="button"
                onClick={addManualEmails}
                className="w-full py-2 rounded-md text-sm font-medium"
                style={{ background: 'var(--outlook-accent)', color: 'white' }}
              >
                {messagesEl.email.addManualEmails}
              </button>
              {invalidEmails.length > 0 && (
                <div
                  className="p-2 rounded-md text-xs flex items-start gap-2"
                  style={{
                    background: 'var(--outlook-error-bg)',
                    color: 'var(--outlook-error)',
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                  {invalidEmails.join(', ')}
                </div>
              )}
              {normalizedFilters.rawEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs"
                  style={{ background: 'var(--outlook-bg-surface)' }}
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateFilters({
                        ...normalizedFilters,
                        rawEmails: normalizedFilters.rawEmails.filter((entry) => entry !== email),
                      })
                    }
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t" style={{ borderColor: 'var(--outlook-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'var(--outlook-text-secondary)' }}>
              {messagesEl.email.recipientsSelected}:
            </span>
            <span className="text-lg font-semibold" style={{ color: 'var(--outlook-accent)' }}>
              {recipientCountLoading && recipientCountKey ? '...' : recipientCount ?? '—'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium rounded-md"
            style={{ background: 'var(--outlook-accent)', color: 'white' }}
          >
            {messagesEl.common.apply}
          </button>
        </div>
      </div>
    </>
  );
}
