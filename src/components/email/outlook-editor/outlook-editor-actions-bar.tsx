'use client';

import { Clock, Save, Send } from 'lucide-react';

import { messagesEl } from '@/lib/i18n/ui/messages-el';

type OutlookEditorActionsBarProps = {
  campaignId?: string | null;
  campaignStatus?: string | null;
  isNew: boolean;
  actionsLocked: boolean;
  totalRecipients: number;
  saveDisabled: boolean;
  sendDisabled: boolean;
  scheduleDisabled: boolean;
  saving: boolean;
  sending: boolean;
  onCancel: () => void;
  onSave: (sendNow: boolean) => void;
  onToggleSchedule: () => void;
};

export function OutlookEditorActionsBar({
  campaignId,
  campaignStatus,
  isNew,
  actionsLocked,
  totalRecipients,
  saveDisabled,
  sendDisabled,
  scheduleDisabled,
  saving,
  sending,
  onCancel,
  onSave,
  onToggleSchedule,
}: OutlookEditorActionsBarProps) {
  return (
    <>
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: 'var(--outlook-bg-panel)',
          borderColor: 'var(--outlook-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--outlook-text-primary)' }}
          >
            {isNew ? messagesEl.email.newCampaign : messagesEl.email.editCampaign}
          </h2>
          {!isNew && campaignId && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--outlook-bg-hover)',
                color: 'var(--outlook-text-tertiary)',
              }}
            >
              ID: {campaignId.slice(0, 8)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md transition-all"
            style={{
              color: 'var(--outlook-text-secondary)',
              background: 'var(--outlook-bg-hover)',
            }}
          >
            {messagesEl.common.cancel}
          </button>
          <button
            type="button"
            data-testid="save-draft-button"
            onClick={() => onSave(false)}
            disabled={saveDisabled}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all"
            style={{
              background: 'var(--outlook-bg-hover)',
              color: 'var(--outlook-text-primary)',
              opacity: saveDisabled ? 0.6 : 1,
            }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Αποθήκευση...' : messagesEl.common.save}
          </button>
          <button
            type="button"
            data-testid="toggle-schedule-button"
            onClick={onToggleSchedule}
            disabled={scheduleDisabled}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all"
            style={{
              background: 'var(--outlook-accent-light)',
              color: 'var(--outlook-accent)',
              opacity: scheduleDisabled ? 0.6 : 1,
            }}
          >
            <Clock className="w-4 h-4" />
            {messagesEl.email.schedule}
          </button>
          <button
            type="button"
            data-testid="send-now-button"
            onClick={() => onSave(true)}
            disabled={sendDisabled}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all"
            style={{
              background: totalRecipients > 0 ? 'var(--outlook-accent)' : 'var(--outlook-text-tertiary)',
              color: 'white',
              opacity: sendDisabled ? 0.6 : 1,
            }}
          >
            <Send className="w-4 h-4" />
            {sending ? messagesEl.email.sending : messagesEl.email.sendNow}
          </button>
        </div>
      </div>

      {actionsLocked && (
        <div
          className="px-4 py-3 border-b text-sm"
          style={{
            background: 'var(--outlook-bg-hover)',
            borderColor: 'var(--outlook-border)',
            color: 'var(--outlook-text-secondary)',
          }}
        >
          {campaignStatus === 'sent'
            ? 'Η καμπάνια έχει ήδη σταλεί. Για αλλαγές, δημιουργήστε αντίγραφο.'
            : 'Η καμπάνια αποστέλλεται αυτή τη στιγμή. Οι αλλαγές έχουν κλειδωθεί προσωρινά.'}
        </div>
      )}
    </>
  );
}
