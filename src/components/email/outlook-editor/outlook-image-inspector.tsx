'use client';

import type { ChangeEvent } from 'react';

import type { InlineImageConfig } from './types';

type OutlookImageInspectorProps = {
  selectedImageConfig: InlineImageConfig | null;
  customWidth: string;
  onCustomWidthChange: (value: string) => void;
  onCustomWidthBlur: () => void;
  onApplyPercent: (pct: number) => void;
  onSetAlign: (align: InlineImageConfig['align']) => void;
  onSetAlt: (value: string) => void;
  onSetEmbedInline: (checked: boolean) => void;
  onReplace: () => void;
  onRemove: () => void;
};

export function OutlookImageInspector({
  selectedImageConfig,
  customWidth,
  onCustomWidthChange,
  onCustomWidthBlur,
  onApplyPercent,
  onSetAlign,
  onSetAlt,
  onSetEmbedInline,
  onReplace,
  onRemove,
}: OutlookImageInspectorProps) {
  if (!selectedImageConfig) {
    return null;
  }

  return (
    <div
      className="px-4 py-2 border-b flex flex-wrap items-center gap-2"
      style={{ borderColor: 'var(--outlook-border)' }}
    >
      <span className="text-xs" style={{ color: 'var(--outlook-text-secondary)' }}>
        Εικόνα:
      </span>
      {[25, 50, 75, 100].map((pct) => (
        <button
          key={pct}
          type="button"
          onClick={() => onApplyPercent(pct)}
          className="px-2 py-1 text-xs rounded-md"
          style={{
            background: 'var(--outlook-bg-hover)',
            color: 'var(--outlook-text-primary)',
          }}
        >
          {pct}%
        </button>
      ))}
      <input
        type="number"
        min={32}
        max={2400}
        value={customWidth}
        onChange={(event) => onCustomWidthChange(event.target.value)}
        onBlur={onCustomWidthBlur}
        placeholder="px"
        className="w-20 px-2 py-1 text-xs rounded-md"
        style={{
          background: 'var(--outlook-bg-surface)',
          border: '1px solid var(--outlook-border)',
        }}
      />
      {(['left', 'center', 'right'] as const).map((align) => (
        <button
          key={align}
          type="button"
          onClick={() => onSetAlign(align)}
          className="px-2 py-1 text-xs rounded-md"
          style={{
            background:
              selectedImageConfig.align === align
                ? 'var(--outlook-accent-light)'
                : 'var(--outlook-bg-hover)',
            color:
              selectedImageConfig.align === align
                ? 'var(--outlook-accent)'
                : 'var(--outlook-text-primary)',
          }}
        >
          {align}
        </button>
      ))}
      <input
        type="text"
        value={selectedImageConfig.alt || ''}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onSetAlt(event.target.value)}
        placeholder="Εναλλακτικό κείμενο εικόνας"
        className="px-2 py-1 text-xs rounded-md"
        style={{
          background: 'var(--outlook-bg-surface)',
          border: '1px solid var(--outlook-border)',
        }}
      />
      <label
        className="flex items-center gap-1 text-xs"
        style={{ color: 'var(--outlook-text-secondary)' }}
      >
        <input
          type="checkbox"
          checked={selectedImageConfig.embedInline}
          onChange={(event) => onSetEmbedInline(event.target.checked)}
        />
        Αποστολή inline (CID)
      </label>
      <button
        type="button"
        onClick={onReplace}
        className="px-2 py-1 text-xs rounded-md"
        style={{
          background: 'var(--outlook-bg-hover)',
          color: 'var(--outlook-text-primary)',
        }}
      >
        Αντικατάσταση
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="px-2 py-1 text-xs rounded-md"
        style={{
          background: 'var(--outlook-error-bg)',
          color: 'var(--outlook-error)',
        }}
      >
        Αφαίρεση
      </button>
    </div>
  );
}
