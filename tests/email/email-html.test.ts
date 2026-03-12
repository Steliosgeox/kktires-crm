import {
  buildInlineImageHtml,
  extractInlineImageAssetIds,
  hasInlineImageAssetId,
  reconcileInlineImages,
  removeInlineImageConfig,
  upsertInlineImageConfig,
} from '@/components/email/outlook-editor/email-html';
import type { InlineImageConfig } from '@/components/email/outlook-editor/types';

function imageConfig(assetId: string, sortOrder = 0): InlineImageConfig {
  return {
    assetId,
    embedInline: false,
    widthPx: null,
    align: null,
    alt: null,
    sortOrder,
  };
}

describe('email-html helpers', () => {
  it('extracts inline image asset ids in document order without duplicates', () => {
    const html = `
      <p>before</p>
      <img data-email-asset-id="asset-1" src="/a.png" />
      <img data-email-asset-id="asset-2" src="/b.png" />
      <img data-email-asset-id="asset-1" src="/a.png" />
    `;

    expect(extractInlineImageAssetIds(html)).toEqual(['asset-1', 'asset-2']);
  });

  it('reconciles inline images against the current html', () => {
    const html = `
      <img data-email-asset-id="asset-2" src="/b.png" />
      <img data-email-asset-id="asset-1" src="/a.png" />
    `;

    const reconciled = reconcileInlineImages(html, [
      imageConfig('asset-1', 1),
      imageConfig('asset-2', 0),
      imageConfig('asset-3', 2),
    ]);

    expect(reconciled.map((item) => item.assetId)).toEqual(['asset-2', 'asset-1']);
    expect(reconciled.map((item) => item.sortOrder)).toEqual([0, 1]);
  });

  it('upserts and removes inline image configs predictably', () => {
    const initial = [imageConfig('asset-1', 0)];
    const upserted = upsertInlineImageConfig(initial, {
      ...imageConfig('asset-2', 1),
      widthPx: 320,
    });

    expect(upserted).toHaveLength(2);
    expect(upserted[1].widthPx).toBe(320);

    const removed = removeInlineImageConfig(upserted, 'asset-1');
    expect(removed).toEqual([
      {
        ...imageConfig('asset-2', 0),
        widthPx: 320,
      },
    ]);
  });

  it('builds image html and can detect whether an asset id is present', () => {
    const html = buildInlineImageHtml('asset-7', 'https://example.com/image.webp');

    expect(html).toContain('data-email-asset-id="asset-7"');
    expect(hasInlineImageAssetId(html, 'asset-7')).toBe(true);
    expect(hasInlineImageAssetId(html, 'asset-9')).toBe(false);
  });
});
