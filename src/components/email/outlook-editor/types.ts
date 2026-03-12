import type { Dispatch, SetStateAction } from 'react';

import type { RecipientFilters } from '@/lib/email/recipient-filters';

export type ImageAlign = 'left' | 'center' | 'right';
export type PreviewMode = 'desktop' | 'mobile' | 'dark';
export type OutlookEditorPopover = 'none' | 'templates' | 'variables' | 'schedule' | 'link';
export type EmailAiAction = 'improve' | 'expand' | 'subjects';

export interface Template {
  id: string;
  name: string;
  subject: string;
  content?: string;
  category: string;
  createdAt: string | Date;
}

export interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

export interface CampaignAttachment {
  assetId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobUrl: string;
}

export interface InlineImageConfig {
  assetId: string;
  embedInline: boolean;
  widthPx: number | null;
  align: ImageAlign | null;
  alt: string | null;
  sortOrder: number;
}

export interface EmailComposerDraft {
  campaignName: string;
  subject: string;
  content: string;
  recipientFilters: RecipientFilters;
  attachments: CampaignAttachment[];
  inlineImages: InlineImageConfig[];
  selectedSignature: string | null;
}

export type DraftSetter<T> = Dispatch<SetStateAction<T>>;

export interface EmailComposerDraftActions {
  setCampaignName: DraftSetter<string>;
  setSubject: DraftSetter<string>;
  setContent: DraftSetter<string>;
  setRecipientFilters: DraftSetter<RecipientFilters>;
  setAttachments: DraftSetter<CampaignAttachment[]>;
  setInlineImages: DraftSetter<InlineImageConfig[]>;
  setSelectedSignature: DraftSetter<string | null>;
  updateDraft: (patch: Partial<EmailComposerDraft>) => void;
  replaceDraft: (draft: EmailComposerDraft) => void;
  resetDraft: (defaultSignatureId?: string | null) => void;
}

export interface EmailComposerCatalog {
  templates: Template[];
  signatures: Signature[];
}

export interface OutlookEditorWorkflow {
  campaignId?: string | null;
  campaignStatus?: string | null;
  saving: boolean;
  sending: boolean;
  isNew: boolean;
  recipientCount?: number;
}

export interface OutlookEditorCallbacks {
  onSave: (sendNow: boolean) => void;
  onSchedule: (runAtIso: string) => void;
  onCancel: () => void;
  onOpenRecipients: () => void;
  onOpenRecipientsDrawer?: () => void;
}

export interface OutlookEditorUiState {
  activePopover: OutlookEditorPopover;
  showPreview: boolean;
  previewMode: PreviewMode;
  aiLoading: boolean;
  linkUrl: string;
  scheduleDate: string;
  scheduleTime: string;
  selectedImageAssetId: string | null;
  pendingReplaceAssetId: string | null;
  customWidth: string;
  uploadingImages: boolean;
  uploadingAttachments: boolean;
}
