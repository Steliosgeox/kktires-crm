'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Loader2, Mail, Search, User, Users, X } from 'lucide-react';
import useSWR from 'swr';

import { type RecipientFilters } from '@/lib/email/recipient-filters';
import { toast } from '@/lib/stores/ui-store';

type PreviewSource = 'all' | 'customer' | 'manual_email';

interface PreviewRecipient {
  id: string;
  customerId: string | null;
  recipientSource: 'customer' | 'manual_email';
  email: string;
  displayName: string | null;
  firstName: string;
  lastName: string | null;
  company: string | null;
  city: string | null;
  phone: string | null;
  mobile: string | null;
}

interface PreviewSummary {
  total: number;
  customerRecipients: number;
  manualEmailRecipients: number;
  selectedCustomerCount: number;
  selectedCustomersWithEmail: number;
  selectedCustomersWithoutEmail: number;
  duplicateSelectedCustomerEmails: number;
  rawManualEmailCount: number;
  manualEmailsMergedIntoCustomers: number;
  cityFilterCount: number;
  tagFilterCount: number;
  segmentFilterCount: number;
  categoryFilterCount: number;
}

interface PreviewApiResponse {
  requestId: string;
  summary: PreviewSummary;
  recipients: PreviewRecipient[];
}

interface RecipientPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  filters: RecipientFilters;
}

const sourceLabel: Record<PreviewSource, string> = {
  all: 'Όλοι',
  customer: 'Πελάτες',
  manual_email: 'Χειροκίνητα',
};

function getDisplayName(recipient: PreviewRecipient): string | null {
  if (recipient.displayName) return recipient.displayName;
  const name = `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim();
  if (name) return name;
  if (recipient.company) return recipient.company;
  return null;
}

async function copyText(value: string, successTitle: string, successBody: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successTitle, successBody);
    return true;
  } catch {
    toast.error('Αποτυχία αντιγραφής', 'Το clipboard δεν είναι διαθέσιμο.');
    return false;
  }
}

export function RecipientPreviewDrawer({
  isOpen,
  onClose,
  campaignName,
  filters,
}: RecipientPreviewDrawerProps) {
  const [activeFilter, setActiveFilter] = useState<PreviewSource>('all');
  const [search, setSearch] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const requestBody = useMemo(() => JSON.stringify({ filters }), [filters]);
  const requestKey = isOpen ? ['recipient-preview', requestBody] : null;
  const { data, isLoading } = useSWR<PreviewApiResponse>(
    requestKey,
    async ([, body]: [string, string]) => {
      const res = await fetch('/api/recipients/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      return res.json() as Promise<PreviewApiResponse>;
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      onError: () => {
        toast.error('Αποτυχία φόρτωσης', 'Δεν φορτώθηκε η προεπισκόπηση παραληπτών.');
      },
    }
  );

  const recipients = data?.recipients ?? [];
  const summary = data?.summary ?? null;
  const loading = Boolean(requestKey) && isLoading && !data;

  const filteredRecipients = recipients.filter((recipient) => {
    if (activeFilter !== 'all' && recipient.recipientSource !== activeFilter) return false;
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const name = getDisplayName(recipient)?.toLowerCase() ?? '';
      const company = recipient.company?.toLowerCase() ?? '';
      if (
        !recipient.email.toLowerCase().includes(query) &&
        !name.includes(query) &&
        !company.includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleCopyAll = async () => {
    const emails = filteredRecipients.map((recipient) => recipient.email).join(', ');
    const copied = await copyText(
      emails,
      'Αντιγράφηκαν email',
      `${filteredRecipients.length} παραλήπτες αντιγράφηκαν.`
    );
    if (!copied) return;
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyOne = async (email: string) => {
    const copied = await copyText(email, 'Αντιγράφηκε email', email);
    if (!copied) return;
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail((current) => (current === email ? null : current)), 2000);
  };

  const pills: PreviewSource[] = ['all'];
  if ((summary?.customerRecipients ?? 0) > 0) pills.push('customer');
  if ((summary?.manualEmailRecipients ?? 0) > 0) pills.push('manual_email');

  const pillCount = (filter: PreviewSource) => {
    if (filter === 'all') return summary?.total ?? recipients.length;
    if (filter === 'customer') return summary?.customerRecipients ?? 0;
    return summary?.manualEmailRecipients ?? 0;
  };

  const diagnostics = [
    summary?.selectedCustomerCount
      ? `Επιλεγμένοι πελάτες: ${summary.selectedCustomerCount}`
      : null,
    summary?.rawManualEmailCount
      ? `Χειροκίνητα email: ${summary.rawManualEmailCount}`
      : null,
    summary?.selectedCustomersWithoutEmail
      ? `Χωρίς email: ${summary.selectedCustomersWithoutEmail}`
      : null,
    summary?.duplicateSelectedCustomerEmails
      ? `Διπλότυπα email πελατών: ${summary.duplicateSelectedCustomerEmails}`
      : null,
    summary?.manualEmailsMergedIntoCustomers
      ? `Χειροκίνητα email που συγχωνεύθηκαν με πελάτες: ${summary.manualEmailsMergedIntoCustomers}`
      : null,
  ].filter(Boolean) as string[];

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Κλείσιμο προεπισκόπησης παραληπτών"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="fixed top-0 right-0 h-full max-w-lg w-full z-50 flex flex-col"
        style={{
          background: 'var(--outlook-bg-panel)',
          boxShadow: 'var(--outlook-shadow-lg)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--outlook-border)' }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'var(--outlook-accent)' }} />
            <div>
              <h3
                className="text-base font-semibold leading-tight"
                style={{ color: 'var(--outlook-text-primary)' }}
              >
                Προεπισκόπηση παραληπτών
              </h3>
              <p
                className="text-xs leading-tight truncate max-w-[240px]"
                style={{ color: 'var(--outlook-text-tertiary)' }}
              >
                {campaignName || 'Νέα καμπάνια'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyAll()}
              disabled={filteredRecipients.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--outlook-border)',
                color: 'var(--outlook-text-secondary)',
              }}
            >
              {copiedAll ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              Αντιγραφή όλων
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
              style={{ color: 'var(--outlook-text-secondary)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {summary && diagnostics.length > 0 && (
          <div
            className="px-4 py-3 border-b space-y-1 text-xs"
            style={{ borderColor: 'var(--outlook-border)' }}
          >
            <div style={{ color: 'var(--outlook-text-secondary)' }}>
              Μοναδικά email για αποστολή: <strong>{summary.total}</strong>
            </div>
            {diagnostics.map((line) => (
              <div key={line} style={{ color: 'var(--outlook-text-tertiary)' }}>
                {line}
              </div>
            ))}
          </div>
        )}

        <div
          className="flex items-center gap-2 px-4 py-2 border-b shrink-0 overflow-x-auto"
          style={{ borderColor: 'var(--outlook-border)' }}
        >
          {pills.map((filter) => {
            const isActive = activeFilter === filter;
            const Icon = filter === 'manual_email' ? Mail : User;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  background: isActive ? 'var(--outlook-accent)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? 'white' : 'var(--outlook-text-secondary)',
                  border: isActive ? 'none' : '1px solid var(--outlook-border)',
                }}
              >
                {filter !== 'all' && <Icon className="w-3.5 h-3.5" />}
                {sourceLabel[filter]}
                <span
                  className="ml-0.5 px-1 rounded-full text-[10px]"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {pillCount(filter)}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="px-4 py-2 border-b shrink-0"
          style={{ borderColor: 'var(--outlook-border)' }}
        >
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--outlook-text-tertiary)' }}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Αναζήτηση email ή ονόματος..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-md"
              style={{
                background: 'var(--outlook-bg-surface)',
                border: '1px solid var(--outlook-border)',
                color: 'var(--outlook-text-primary)',
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: 'var(--outlook-text-tertiary)' }}
              />
            </div>
          )}

          {!loading && filteredRecipients.length === 0 && (
            <div
              className="flex items-center justify-center py-16 text-sm"
              style={{ color: 'var(--outlook-text-tertiary)' }}
            >
              Δεν βρέθηκαν παραλήπτες
            </div>
          )}

          {!loading && filteredRecipients.length > 0 && (
            <ul className="divide-y" style={{ borderColor: 'var(--outlook-border)' }}>
              {filteredRecipients.map((recipient) => {
                const displayName = getDisplayName(recipient);
                const isManual = recipient.recipientSource === 'manual_email';

                return (
                  <li
                    key={`${recipient.id}:${recipient.email}`}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <div className="min-w-0 flex-1">
                      {displayName ? (
                        <>
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--outlook-text-primary)' }}
                          >
                            {displayName}
                          </p>
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: 'var(--outlook-text-tertiary)' }}
                          >
                            {recipient.email}
                          </p>
                        </>
                      ) : (
                        <p
                          className="text-sm truncate"
                          style={{ color: 'var(--outlook-text-primary)' }}
                        >
                          {recipient.email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            background: isManual ? 'rgba(251, 191, 36, 0.16)' : 'rgba(34, 197, 94, 0.16)',
                            color: isManual ? '#f59e0b' : '#22c55e',
                          }}
                        >
                          {isManual ? 'Χειροκίνητο' : 'Πελάτης'}
                        </span>
                        {recipient.company && (
                          <span
                            className="text-[10px] truncate"
                            style={{ color: 'var(--outlook-text-tertiary)' }}
                          >
                            {recipient.company}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCopyOne(recipient.email)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] shrink-0"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--outlook-border)',
                        color: 'var(--outlook-text-secondary)',
                      }}
                    >
                      {copiedEmail === recipient.email ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Αντιγραφή
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!loading && filteredRecipients.length > 0 && (
          <div
            className="px-4 py-2 border-t shrink-0 text-xs"
            style={{
              borderColor: 'var(--outlook-border)',
              color: 'var(--outlook-text-tertiary)',
            }}
          >
            {filteredRecipients.length !== (summary?.total ?? recipients.length)
              ? `${filteredRecipients.length} από ${summary?.total ?? recipients.length} μοναδικά email`
              : `${filteredRecipients.length} μοναδικά email`}
          </div>
        )}
      </div>
    </>
  );
}
