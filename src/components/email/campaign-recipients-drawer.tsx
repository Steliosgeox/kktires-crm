'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, Search, Users, X } from 'lucide-react';

import { toast } from '@/lib/stores/ui-store';

type RecipientStatus = 'sent' | 'failed' | 'pending' | 'bounced';
type FilterStatus = 'all' | RecipientStatus;

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  status: RecipientStatus;
  errorMessage: string | null;
  sentAt: string | null;
  customerId: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
}

interface RecipientsApiResponse {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  summary: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    bounced: number;
  };
  recipients: Recipient[];
}

interface CampaignRecipientsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
}

const statusLabel: Record<FilterStatus, string> = {
  all: 'Όλοι',
  sent: 'Εστάλησαν',
  failed: 'Αποτυχία',
  pending: 'Αναμονή',
  bounced: 'Bounce',
};

const statusBadgeClass: Record<RecipientStatus, string> = {
  sent: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
  pending: 'bg-amber-500/20 text-amber-400',
  bounced: 'bg-orange-500/20 text-orange-400',
};

function formatSentAt(sentAt: string | null): string {
  if (!sentAt) return '';
  try {
    return new Intl.DateTimeFormat('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(sentAt));
  } catch {
    return '';
  }
}

function getDisplayName(recipient: Recipient): string | null {
  if (recipient.displayName) return recipient.displayName;
  const parts = [recipient.firstName, recipient.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (recipient.name) return recipient.name;
  return null;
}

export function CampaignRecipientsDrawer({
  isOpen,
  onClose,
  campaignId,
  campaignName,
}: CampaignRecipientsDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [summary, setSummary] = useState<RecipientsApiResponse['summary'] | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Reset and fetch whenever drawer opens
  useEffect(() => {
    if (!isOpen) return;

    setRecipients([]);
    setSummary(null);
    setActiveFilter('all');
    setSearch('');
    setCopied(false);
    setCopiedEmail(null);
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/recipients?limit=10000`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as RecipientsApiResponse;
        setRecipients(data.recipients ?? []);
        setSummary(data.summary ?? null);
      } catch {
        toast.error('Αποτυχία φόρτωσης', 'Δεν φορτώθηκαν οι παραλήπτες.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, campaignId]);

  // Filtered list (by status pill + search)
  const filteredRecipients = recipients.filter((r) => {
    if (activeFilter !== 'all' && r.status !== activeFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const name = getDisplayName(r)?.toLowerCase() ?? '';
      if (!r.email.toLowerCase().includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  const handleCopy = () => {
    const emails = filteredRecipients.map((r) => r.email).join(', ');
    void navigator.clipboard.writeText(emails).then(() => {
      setCopied(true);
      toast.success('Αντιγράφηκαν', `${filteredRecipients.length} email αντιγράφηκαν.`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyOne = (email: string) => {
    void navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(email);
      toast.success('Αντιγράφηκε', email);
      setTimeout(() => {
        setCopiedEmail((current) => (current === email ? null : current));
      }, 2000);
    });
  };

  // Which status pills to show (always show "all", plus statuses with count > 0)
  const pillStatuses: FilterStatus[] = ['all'];
  if (summary) {
    if (summary.sent > 0) pillStatuses.push('sent');
    if (summary.failed > 0) pillStatuses.push('failed');
    if (summary.pending > 0) pillStatuses.push('pending');
    if (summary.bounced > 0) pillStatuses.push('bounced');
  }

  const pillCount = (status: FilterStatus): number => {
    if (status === 'all') return summary?.total ?? recipients.length;
    return summary?.[status] ?? 0;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Κλείσιμο παραληπτών καμπάνιας"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className="fixed top-0 right-0 h-full max-w-lg w-full z-50 flex flex-col"
        style={{
          background: 'var(--outlook-bg-panel)',
          boxShadow: 'var(--outlook-shadow-lg)',
        }}
      >
        {/* Header */}
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
                Παραλήπτες
              </h3>
              <p
                className="text-xs leading-tight truncate max-w-[200px]"
                style={{ color: 'var(--outlook-text-tertiary)' }}
              >
                {campaignName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              disabled={filteredRecipients.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--outlook-border)',
                color: 'var(--outlook-text-secondary)',
              }}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              Αντιγραφή {filteredRecipients.length}
            </button>

            {/* Close button */}
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

        {/* Filter pills */}
        <div
          className="flex items-center gap-2 px-4 py-2 border-b shrink-0 overflow-x-auto"
          style={{ borderColor: 'var(--outlook-border)' }}
        >
          {pillStatuses.map((status) => {
            const isActive = activeFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setActiveFilter(status)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  background: isActive ? 'var(--outlook-accent)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? 'white' : 'var(--outlook-text-secondary)',
                  border: isActive ? 'none' : '1px solid var(--outlook-border)',
                }}
              >
                {statusLabel[status]}
                <span
                  className="ml-0.5 px-1 rounded-full text-[10px]"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {pillCount(status)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
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
              onChange={(e) => setSearch(e.target.value)}
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

        {/* Recipient list */}
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
                const sentAtFormatted = formatSentAt(recipient.sentAt);

                return (
                  <li
                    key={recipient.id}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    {/* Left: name + email + error */}
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
                      {recipient.status === 'failed' && recipient.errorMessage && (
                        <p className="text-xs text-red-400 mt-1 break-words">
                          {recipient.errorMessage}
                        </p>
                      )}
                    </div>

                    {/* Right: badge + sent time */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass[recipient.status]}`}
                      >
                        {statusLabel[recipient.status]}
                      </span>
                      {sentAtFormatted && (
                        <span
                          className="text-[10px]"
                          style={{ color: 'var(--outlook-text-tertiary)' }}
                        >
                          {sentAtFormatted}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyOne(recipient.email)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px]"
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
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {!loading && filteredRecipients.length > 0 && (
          <div
            className="px-4 py-2 border-t shrink-0 text-xs"
            style={{
              borderColor: 'var(--outlook-border)',
              color: 'var(--outlook-text-tertiary)',
            }}
          >
            {filteredRecipients.length !== (summary?.total ?? recipients.length)
              ? `${filteredRecipients.length} από ${summary?.total ?? recipients.length} παραλήπτες`
              : `${filteredRecipients.length} παραλήπτες`}
          </div>
        )}
      </div>
    </>
  );
}
