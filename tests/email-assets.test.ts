import { describe, expect, it } from 'vitest';

import { applyAssetBundleToHtml, type PreparedAssetBundle } from '../src/server/email/assets';

describe('email asset bundle HTML rewrite', () => {
  it('rewrites inline image src and merges inline+attachment payloads', () => {
    const html = '<p>Hello</p><img data-email-asset-id="ast_img" src="https://old" alt="x" />';
    const bundle: PreparedAssetBundle = {
      inlineAssets: [
        {
          assetId: 'ast_img',
          blobUrl: 'https://blob/image.webp',
          cid: 'asset-ast_img@kktires',
          embedInline: true,
          widthPx: 480,
          align: 'center',
          alt: 'Promo image',
          inlineAttachment: {
            filename: 'image.webp',
            content: Buffer.from('inline-bytes'),
            contentType: 'image/webp',
            cid: 'asset-ast_img@kktires',
            disposition: 'inline',
          },
        },
      ],
      attachments: [
        {
          filename: 'offer.pdf',
          content: Buffer.from('pdf-bytes'),
          contentType: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    const result = applyAssetBundleToHtml(html, bundle);

    expect(result.html).toContain('src="cid:asset-ast_img@kktires"');
    expect(result.html).toContain('width="480"');
    expect(result.html).toContain('alt="Promo image"');
    expect(result.attachments).toHaveLength(2);
    expect(result.attachments[0]?.disposition).toBe('inline');
    expect(result.attachments[1]?.filename).toBe('offer.pdf');
  });

  it('keeps hosted URL when CID embed is disabled', () => {
    const html = '<img data-email-asset-id="ast_img" src="https://old" />';
    const bundle: PreparedAssetBundle = {
      inlineAssets: [
        {
          assetId: 'ast_img',
          blobUrl: 'https://blob/image.webp',
          cid: null,
          embedInline: false,
          widthPx: null,
          align: null,
          alt: null,
          inlineAttachment: null,
        },
      ],
      attachments: [],
    };

    const result = applyAssetBundleToHtml(html, bundle);

    expect(result.html).toContain('src="https://blob/image.webp"');
    expect(result.attachments).toHaveLength(0);
  });
});
