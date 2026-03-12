'use client';

import { Plus } from 'lucide-react';

import { messagesEl } from '@/lib/i18n/ui/messages-el';
import type { RecipientFilters } from '@/lib/email/recipient-filters';

import type { EmailComposerDraftActions } from './types';

type OutlookRecipientsSummaryProps = {
  recipientFilters: RecipientFilters;
  totalRecipients: number;
  campaignStatus?: string | null;
  actionsLocked: boolean;
  onRecipientFiltersChange: EmailComposerDraftActions['setRecipientFilters'];
  onOpenRecipients: () => void;
  onOpenRecipientsDrawer?: () => void;
};

export function OutlookRecipientsSummary({
  recipientFilters,
  totalRecipients,
  campaignStatus,
  actionsLocked,
  onRecipientFiltersChange,
  onOpenRecipients,
  onOpenRecipientsDrawer,
}: OutlookRecipientsSummaryProps) {
  return (
    <div
      className="px-4 py-3 border-b"
      style={{ borderColor: 'var(--outlook-border)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-medium w-20"
          style={{ color: 'var(--outlook-text-secondary)' }}
        >
          {messagesEl.email.to}:
        </span>
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          {recipientFilters.cities.map((city) => (
            <span
              key={city}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
              style={{
                background: 'var(--outlook-accent-light)',
                color: 'var(--outlook-accent)',
              }}
            >
              {messagesEl.common.cities}: {city}
              <button
                type="button"
                onClick={() =>
                  onRecipientFiltersChange((current) => ({
                    ...current,
                    cities: current.cities.filter((value) => value !== city),
                  }))
                }
                disabled={actionsLocked}
                className="hover:opacity-70"
                aria-label={`Remove city filter ${city}`}
              >
                ×
              </button>
            </span>
          ))}
          {recipientFilters.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
              style={{
                background: 'var(--outlook-success-bg)',
                color: 'var(--outlook-success)',
              }}
            >
              {messagesEl.common.tags}: {tag}
              <button
                type="button"
                onClick={() =>
                  onRecipientFiltersChange((current) => ({
                    ...current,
                    tags: current.tags.filter((value) => value !== tag),
                  }))
                }
                disabled={actionsLocked}
                className="hover:opacity-70"
                aria-label={`Remove tag filter ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          {recipientFilters.segments.map((segment) => (
            <span
              key={segment}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
              style={{
                background: 'var(--outlook-warning-bg)',
                color: 'var(--outlook-warning)',
              }}
            >
              {messagesEl.common.segments}: {segment}
              <button
                type="button"
                onClick={() =>
                  onRecipientFiltersChange((current) => ({
                    ...current,
                    segments: current.segments.filter((value) => value !== segment),
                  }))
                }
                disabled={actionsLocked}
                className="hover:opacity-70"
                aria-label={`Remove segment filter ${segment}`}
              >
                ×
              </button>
            </span>
          ))}
          {recipientFilters.customerIds.length > 0 && (
            <span
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
              style={{
                background: 'var(--outlook-info-bg)',
                color: 'var(--outlook-info)',
              }}
            >
              {messagesEl.common.customers}: {recipientFilters.customerIds.length}
              <button
                type="button"
                onClick={() =>
                  onRecipientFiltersChange((current) => ({
                    ...current,
                    customerIds: [],
                  }))
                }
                disabled={actionsLocked}
                className="hover:opacity-70"
                aria-label="Remove selected customer filters"
              >
                ×
              </button>
            </span>
          )}
          {recipientFilters.rawEmails.map((email) => (
            <span
              key={email}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
              style={{
                background: 'var(--outlook-bg-hover)',
                color: 'var(--outlook-text-secondary)',
              }}
            >
              {email}
              <button
                type="button"
                onClick={() =>
                  onRecipientFiltersChange((current) => ({
                    ...current,
                    rawEmails: current.rawEmails.filter((value) => value !== email),
                  }))
                }
                disabled={actionsLocked}
                className="hover:opacity-70"
                aria-label={`Remove recipient ${email}`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            data-testid="open-recipients-button"
            onClick={onOpenRecipients}
            disabled={actionsLocked}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
            style={{
              background: 'var(--outlook-bg-hover)',
              color: 'var(--outlook-text-secondary)',
              opacity: actionsLocked ? 0.6 : 1,
            }}
          >
            <Plus className="w-3 h-3" />
            {messagesEl.email.addRecipients}
          </button>
        </div>
        {totalRecipients > 0 && (
          onOpenRecipientsDrawer ? (
            <button
              type="button"
              data-testid="recipient-count-button"
              onClick={onOpenRecipientsDrawer}
              className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'var(--outlook-accent)', color: 'white' }}
              title={
                ['sent', 'sending', 'failed'].includes(campaignStatus ?? '')
                  ? 'Άνοιγμα των stored παραληπτών'
                  : 'Άνοιγμα της προεπισκόπησης παραληπτών'
              }
            >
              {totalRecipients} παραλήπτες
            </button>
          ) : (
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{ background: 'var(--outlook-accent)', color: 'white' }}
            >
              {totalRecipients} παραλήπτες
            </span>
          )
        )}
      </div>
    </div>
  );
}
