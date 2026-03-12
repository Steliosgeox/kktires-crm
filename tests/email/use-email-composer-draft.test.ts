import { EMPTY_RECIPIENT_FILTERS } from '@/lib/email/recipient-filters';
import {
  createEmailComposerDraft,
  mergeEmailComposerDraft,
  normalizeInlineImages,
} from '@/components/email/outlook-editor/use-email-composer-draft';

describe('email composer draft helpers', () => {
  it('creates an empty draft with the provided default signature', () => {
    const draft = createEmailComposerDraft({}, 'signature-default');

    expect(draft).toEqual({
      campaignName: '',
      subject: '',
      content: '',
      recipientFilters: { ...EMPTY_RECIPIENT_FILTERS },
      attachments: [],
      inlineImages: [],
      selectedSignature: 'signature-default',
    });
  });

  it('preserves explicit selected signatures and normalizes inline image sort order', () => {
    const draft = createEmailComposerDraft(
      {
        campaignName: 'Spring Offer',
        selectedSignature: 'signature-explicit',
        inlineImages: [
          {
            assetId: 'asset-1',
            embedInline: false,
            widthPx: 320,
            align: 'center',
            alt: 'Promo',
            sortOrder: Number.NaN,
          },
        ],
      },
      'signature-default'
    );

    expect(draft.selectedSignature).toBe('signature-explicit');
    expect(draft.inlineImages[0].sortOrder).toBe(0);
  });

  it('normalizes inline images even when the input is empty', () => {
    expect(normalizeInlineImages(undefined)).toEqual([]);
    expect(normalizeInlineImages(null)).toEqual([]);
  });

  it('preserves inline image references when a patch does not change them', () => {
    const currentDraft = createEmailComposerDraft({
      campaignName: 'Spring Offer',
      inlineImages: [
        {
          assetId: 'asset-1',
          embedInline: false,
          widthPx: 480,
          align: 'center' as const,
          alt: 'Promo',
          sortOrder: 0,
        },
      ],
    });

    const nextDraft = mergeEmailComposerDraft(
      currentDraft,
      { subject: 'Updated subject' }
    );

    expect(nextDraft.subject).toBe('Updated subject');
    expect(nextDraft.inlineImages).toBe(currentDraft.inlineImages);
  });

  it('normalizes inline images only when a patch explicitly changes them', () => {
    const nextDraft = mergeEmailComposerDraft(
      createEmailComposerDraft({
        inlineImages: [
          {
            assetId: 'asset-1',
            embedInline: false,
            widthPx: 480,
            align: 'center',
            alt: 'Promo',
            sortOrder: 0,
          },
        ],
      }),
      {
        inlineImages: [
          {
            assetId: 'asset-2',
            embedInline: true,
            widthPx: null,
            align: null,
            alt: null,
            sortOrder: Number.NaN,
          },
        ],
      }
    );

    expect(nextDraft.inlineImages).toHaveLength(1);
    expect(nextDraft.inlineImages[0].assetId).toBe('asset-2');
    expect(nextDraft.inlineImages[0].sortOrder).toBe(0);
  });
});
