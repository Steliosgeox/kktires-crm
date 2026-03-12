import { useMemo, useState } from 'react';

import { EMPTY_RECIPIENT_FILTERS } from '@/lib/email/recipient-filters';

import type {
  EmailComposerDraft,
  EmailComposerDraftActions,
  InlineImageConfig,
} from './types';

export function normalizeInlineImages(
  images: InlineImageConfig[] | null | undefined
): InlineImageConfig[] {
  return (images ?? []).map((image, index) => ({
    ...image,
    sortOrder: Number.isFinite(image.sortOrder) ? image.sortOrder : index,
  }));
}

export function createEmailComposerDraft(
  input: Partial<EmailComposerDraft> = {},
  defaultSignatureId: string | null = null
): EmailComposerDraft {
  return {
    campaignName: input.campaignName ?? '',
    subject: input.subject ?? '',
    content: input.content ?? '',
    recipientFilters: input.recipientFilters ?? { ...EMPTY_RECIPIENT_FILTERS },
    attachments: input.attachments ?? [],
    inlineImages: normalizeInlineImages(input.inlineImages),
    selectedSignature: input.selectedSignature ?? defaultSignatureId,
  };
}

export function mergeEmailComposerDraft(
  current: EmailComposerDraft,
  patch: Partial<EmailComposerDraft>
): EmailComposerDraft {
  return {
    campaignName:
      patch.campaignName !== undefined ? patch.campaignName : current.campaignName,
    subject: patch.subject !== undefined ? patch.subject : current.subject,
    content: patch.content !== undefined ? patch.content : current.content,
    recipientFilters:
      patch.recipientFilters !== undefined
        ? patch.recipientFilters
        : current.recipientFilters,
    attachments: patch.attachments !== undefined ? patch.attachments : current.attachments,
    inlineImages:
      patch.inlineImages !== undefined
        ? normalizeInlineImages(patch.inlineImages)
        : current.inlineImages,
    selectedSignature:
      patch.selectedSignature !== undefined
        ? patch.selectedSignature
        : current.selectedSignature,
  };
}

export function useEmailComposerDraft(defaultSignatureId: string | null = null): {
  draft: EmailComposerDraft;
  actions: EmailComposerDraftActions;
} {
  const [draft, setDraft] = useState<EmailComposerDraft>(() =>
    createEmailComposerDraft({}, defaultSignatureId)
  );

  const actions = useMemo<EmailComposerDraftActions>(
    () => ({
      setCampaignName: (value) =>
        setDraft((current) => ({
          ...current,
          campaignName: typeof value === 'function' ? value(current.campaignName) : value,
        })),
      setSubject: (value) =>
        setDraft((current) => ({
          ...current,
          subject: typeof value === 'function' ? value(current.subject) : value,
        })),
      setContent: (value) =>
        setDraft((current) => ({
          ...current,
          content: typeof value === 'function' ? value(current.content) : value,
        })),
      setRecipientFilters: (value) =>
        setDraft((current) => ({
          ...current,
          recipientFilters:
            typeof value === 'function' ? value(current.recipientFilters) : value,
        })),
      setAttachments: (value) =>
        setDraft((current) => ({
          ...current,
          attachments: typeof value === 'function' ? value(current.attachments) : value,
        })),
      setInlineImages: (value) =>
        setDraft((current) => ({
          ...current,
          inlineImages: normalizeInlineImages(
            typeof value === 'function' ? value(current.inlineImages) : value
          ),
        })),
      setSelectedSignature: (value) =>
        setDraft((current) => ({
          ...current,
          selectedSignature:
            typeof value === 'function' ? value(current.selectedSignature) : value,
        })),
      updateDraft: (patch) =>
        setDraft((current) => mergeEmailComposerDraft(current, patch)),
      replaceDraft: (nextDraft) => setDraft(createEmailComposerDraft(nextDraft, defaultSignatureId)),
      resetDraft: (nextDefaultSignatureId) =>
        setDraft(
          createEmailComposerDraft({}, nextDefaultSignatureId === undefined ? defaultSignatureId : nextDefaultSignatureId)
        ),
    }),
    [defaultSignatureId]
  );

  return { draft, actions };
}
