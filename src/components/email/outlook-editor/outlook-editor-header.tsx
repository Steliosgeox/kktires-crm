'use client';

import { OutlookEditorActionsBar } from './outlook-editor-actions-bar';
import { OutlookRecipientsSummary } from './outlook-recipients-summary';
import type { EmailComposerDraftActions } from './types';

import type { RecipientFilters } from '@/lib/email/recipient-filters';
import { messagesEl } from '@/lib/i18n/ui/messages-el';

type OutlookEditorHeaderProps = {
  campaignId?: string | null;
  campaignName: string;
  subject: string;
  recipientFilters: RecipientFilters;
  campaignStatus?: string | null;
  isNew: boolean;
  actionsLocked: boolean;
  totalRecipients: number;
  saveDisabled: boolean;
  sendDisabled: boolean;
  scheduleDisabled: boolean;
  saving: boolean;
  sending: boolean;
  aiLoading: boolean;
  content: string;
  onCampaignNameChange: EmailComposerDraftActions['setCampaignName'];
  onSubjectChange: EmailComposerDraftActions['setSubject'];
  onRecipientFiltersChange: EmailComposerDraftActions['setRecipientFilters'];
  onCancel: () => void;
  onSave: (sendNow: boolean) => void;
  onToggleSchedule: () => void;
  onOpenRecipients: () => void;
  onOpenRecipientsDrawer?: () => void;
  onSuggestSubject: () => void;
};

export function OutlookEditorHeader({
  campaignId,
  campaignName,
  subject,
  recipientFilters,
  campaignStatus,
  isNew,
  actionsLocked,
  totalRecipients,
  saveDisabled,
  sendDisabled,
  scheduleDisabled,
  saving,
  sending,
  aiLoading,
  content,
  onCampaignNameChange,
  onSubjectChange,
  onRecipientFiltersChange,
  onCancel,
  onSave,
  onToggleSchedule,
  onOpenRecipients,
  onOpenRecipientsDrawer,
  onSuggestSubject,
}: OutlookEditorHeaderProps) {
  return (
    <>
      <OutlookEditorActionsBar
        campaignId={campaignId}
        campaignStatus={campaignStatus}
        isNew={isNew}
        actionsLocked={actionsLocked}
        totalRecipients={totalRecipients}
        saveDisabled={saveDisabled}
        sendDisabled={sendDisabled}
        scheduleDisabled={scheduleDisabled}
        saving={saving}
        sending={sending}
        onCancel={onCancel}
        onSave={onSave}
        onToggleSchedule={onToggleSchedule}
      />

      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--outlook-border)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium w-20"
            style={{ color: 'var(--outlook-text-secondary)' }}
          >
            {messagesEl.email.name}:
          </span>
          <input
            type="text"
            data-testid="campaign-name-input"
            value={campaignName}
            onChange={(event) => onCampaignNameChange(event.target.value)}
            readOnly={actionsLocked}
            placeholder="Όνομα καμπάνιας..."
            className="flex-1 text-sm bg-transparent border-none outline-none"
            style={{ color: 'var(--outlook-text-primary)' }}
          />
        </div>
      </div>

      <OutlookRecipientsSummary
        recipientFilters={recipientFilters}
        totalRecipients={totalRecipients}
        campaignStatus={campaignStatus}
        actionsLocked={actionsLocked}
        onRecipientFiltersChange={onRecipientFiltersChange}
        onOpenRecipients={onOpenRecipients}
        onOpenRecipientsDrawer={onOpenRecipientsDrawer}
      />

      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--outlook-border)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium w-20"
            style={{ color: 'var(--outlook-text-secondary)' }}
          >
            {messagesEl.email.subject}:
          </span>
          <input
            type="text"
            data-testid="subject-input"
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            readOnly={actionsLocked}
            placeholder="Θέμα email..."
            className="flex-1 text-sm bg-transparent border-none outline-none"
            style={{ color: 'var(--outlook-text-primary)' }}
          />
          <button
            type="button"
            data-testid="ai-subject-button"
            onClick={onSuggestSubject}
            disabled={actionsLocked || aiLoading || !content}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all"
            style={{
              background: 'var(--outlook-accent-light)',
              color: 'var(--outlook-accent)',
              opacity: actionsLocked || aiLoading || !content ? 0.5 : 1,
            }}
          >
            AI Subject
          </button>
        </div>
      </div>
    </>
  );
}
