'use client';

import dynamic from 'next/dynamic';
import { Monitor, Moon, Paperclip, Smartphone, X } from 'lucide-react';
import type { ChangeEvent, MutableRefObject } from 'react';

import { messagesEl } from '@/lib/i18n/ui/messages-el';
import type { CKEditorInstance } from '@/components/email/ck-email-editor';

import { OutlookPreviewPane } from './outlook-preview-pane';
import type {
  CampaignAttachment,
  PreviewMode,
  Signature,
} from './types';

const CKEmailEditor = dynamic(
  () => import('@/components/email/ck-email-editor').then((module) => ({ default: module.CKEmailEditor })),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[300px] animate-pulse rounded-sm"
        style={{ background: 'var(--outlook-bg-hover)' }}
      />
    ),
  }
);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type OutlookComposeSurfaceProps = {
  content: string;
  attachments: CampaignAttachment[];
  signatures: Signature[];
  selectedSignature: string | null;
  showPreview: boolean;
  previewMode: PreviewMode;
  actionsLocked: boolean;
  editorInstanceRef: MutableRefObject<CKEditorInstance | null>;
  editableElementRef: MutableRefObject<HTMLElement | null>;
  imageInputRef: MutableRefObject<HTMLInputElement | null>;
  attachmentInputRef: MutableRefObject<HTMLInputElement | null>;
  onImageInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAttachmentInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAttachmentRemove: (assetId: string) => void;
  onPreviewModeChange: (mode: PreviewMode) => void;
  onEditorChange: (html: string) => void;
  onImageClick: (assetId: string | null) => void;
  onSelectedSignatureChange: (value: string | null) => void;
};

export function OutlookComposeSurface({
  content,
  attachments,
  signatures,
  selectedSignature,
  showPreview,
  previewMode,
  actionsLocked,
  editorInstanceRef,
  editableElementRef,
  imageInputRef,
  attachmentInputRef,
  onImageInputChange,
  onAttachmentInputChange,
  onAttachmentRemove,
  onPreviewModeChange,
  onEditorChange,
  onImageClick,
  onSelectedSignatureChange,
}: OutlookComposeSurfaceProps) {
  return (
    <>
      <input
        ref={imageInputRef}
        data-testid="image-upload-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={actionsLocked}
        onChange={onImageInputChange}
      />
      <input
        ref={attachmentInputRef}
        data-testid="attachment-upload-input"
        type="file"
        multiple
        className="hidden"
        disabled={actionsLocked}
        onChange={onAttachmentInputChange}
      />

      {attachments.length > 0 && (
        <div
          className="px-4 py-2 border-b flex flex-wrap gap-2"
          style={{ borderColor: 'var(--outlook-border)' }}
        >
          {attachments.map((attachment) => (
            <span
              key={attachment.assetId}
              className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs"
              style={{
                background: 'var(--outlook-bg-hover)',
                color: 'var(--outlook-text-primary)',
              }}
            >
              <Paperclip className="w-3 h-3" />
              {attachment.fileName}
              <span style={{ color: 'var(--outlook-text-tertiary)' }}>
                {formatFileSize(attachment.sizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => onAttachmentRemove(attachment.assetId)}
                disabled={actionsLocked}
                className="hover:opacity-70"
                aria-label={`Remove ${attachment.fileName}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {showPreview && (
        <div
          className="px-4 py-2 border-b flex items-center gap-2"
          style={{
            borderColor: 'var(--outlook-border)',
            background: 'var(--outlook-bg-surface)',
          }}
        >
          <span className="text-xs" style={{ color: 'var(--outlook-text-tertiary)' }}>
            Προβολή:
          </span>
          <button
            type="button"
            data-testid="preview-mode-desktop"
            onClick={() => onPreviewModeChange('desktop')}
            aria-label="Desktop preview"
            className={`p-1.5 rounded-md transition-all ${previewMode === 'desktop' ? 'bg-[var(--outlook-accent-light)]' : ''}`}
            style={{
              color:
                previewMode === 'desktop'
                  ? 'var(--outlook-accent)'
                  : 'var(--outlook-text-secondary)',
            }}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="preview-mode-mobile"
            onClick={() => onPreviewModeChange('mobile')}
            aria-label="Mobile preview"
            className={`p-1.5 rounded-md transition-all ${previewMode === 'mobile' ? 'bg-[var(--outlook-accent-light)]' : ''}`}
            style={{
              color:
                previewMode === 'mobile'
                  ? 'var(--outlook-accent)'
                  : 'var(--outlook-text-secondary)',
            }}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="preview-mode-dark"
            onClick={() => onPreviewModeChange('dark')}
            aria-label="Dark preview"
            className={`p-1.5 rounded-md transition-all ${previewMode === 'dark' ? 'bg-[var(--outlook-accent-light)]' : ''}`}
            style={{
              color:
                previewMode === 'dark'
                  ? 'var(--outlook-accent)'
                  : 'var(--outlook-text-secondary)',
            }}
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        className="min-h-[400px] p-4"
        style={{
          background:
            showPreview && previewMode === 'dark'
              ? '#1a1a1a'
              : 'var(--outlook-bg-panel)',
        }}
      >
        {showPreview ? (
          <OutlookPreviewPane content={content} previewMode={previewMode} />
        ) : (
          <CKEmailEditor
            value={content}
            onChange={onEditorChange}
            editorInstanceRef={editorInstanceRef}
            editableElementRef={editableElementRef}
            readOnly={actionsLocked}
            onImageClick={onImageClick}
          />
        )}
      </div>

      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: 'var(--outlook-border)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            style={{ color: 'var(--outlook-text-tertiary)' }}
          >
            {messagesEl.email.signature}:
          </span>
          <select
            data-testid="signature-select"
            value={selectedSignature || ''}
            onChange={(event) => onSelectedSignatureChange(event.target.value || null)}
            disabled={actionsLocked}
            className="text-sm px-2 py-1 rounded-md"
            style={{
              background: 'var(--outlook-bg-surface)',
              border: '1px solid var(--outlook-border)',
              color: 'var(--outlook-text-primary)',
            }}
          >
            <option value="">{messagesEl.email.noSignature}</option>
            {signatures.map((signature) => (
              <option key={signature.id} value={signature.id}>
                {signature.name} {signature.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
