'use client';

type OutlookSchedulePanelProps = {
  isOpen: boolean;
  scheduleDate: string;
  scheduleTime: string;
  disabled: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onSubmit: () => void;
};

export function OutlookSchedulePanel({
  isOpen,
  scheduleDate,
  scheduleTime,
  disabled,
  onDateChange,
  onTimeChange,
  onSubmit,
}: OutlookSchedulePanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="p-4 border-b outlook-animate-fade"
      style={{
        background: 'var(--outlook-bg-panel)',
        borderColor: 'var(--outlook-border)',
      }}
    >
      <div className="flex items-end gap-4">
        <div>
          <label
            htmlFor="outlook-schedule-date"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--outlook-text-secondary)' }}
          >
            Ημερομηνία
          </label>
          <input
            id="outlook-schedule-date"
            data-testid="schedule-date-input"
            type="date"
            value={scheduleDate}
            onChange={(event) => onDateChange(event.target.value)}
            className="px-3 py-2 text-sm rounded-md"
            style={{
              background: 'var(--outlook-bg-surface)',
              border: '1px solid var(--outlook-border)',
              color: 'var(--outlook-text-primary)',
            }}
          />
        </div>
        <div>
          <label
            htmlFor="outlook-schedule-time"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--outlook-text-secondary)' }}
          >
            Ώρα
          </label>
          <input
            id="outlook-schedule-time"
            data-testid="schedule-time-input"
            type="time"
            value={scheduleTime}
            onChange={(event) => onTimeChange(event.target.value)}
            className="px-3 py-2 text-sm rounded-md"
            style={{
              background: 'var(--outlook-bg-surface)',
              border: '1px solid var(--outlook-border)',
              color: 'var(--outlook-text-primary)',
            }}
          />
        </div>
        <button
          type="button"
          data-testid="schedule-submit-button"
          onClick={onSubmit}
          disabled={disabled}
          className="px-4 py-2 text-sm rounded-md"
          style={{
            background: 'var(--outlook-accent)',
            color: 'white',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          Επιβεβαίωση Προγραμματισμού
        </button>
      </div>
    </div>
  );
}
