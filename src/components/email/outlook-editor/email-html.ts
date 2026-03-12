import type { InlineImageConfig } from './types';

type ReplaceInlineImageAssetInput = {
  currentAssetId: string;
  nextAssetId: string;
  nextBlobUrl: string;
};

export function extractInlineImageAssetIds(html: string): string[] {
  const ids = new Set<string>();
  const regex = /<img\b[^>]*data-email-asset-id=(['"])([^'"]+)\1[^>]*>/gi;

  for (const match of html.matchAll(regex)) {
    const id = (match[2] || '').trim();
    if (id) ids.add(id);
  }

  return [...ids];
}

export function hasInlineImageAssetId(html: string, assetId: string | null): boolean {
  if (!assetId) return false;
  return extractInlineImageAssetIds(html).includes(assetId);
}

export function reconcileInlineImages(
  html: string,
  inlineImages: InlineImageConfig[]
): InlineImageConfig[] {
  const ids = extractInlineImageAssetIds(html);
  const idSet = new Set(ids);

  return inlineImages
    .filter((image) => idSet.has(image.assetId))
    .sort((left, right) => {
      const leftIndex = ids.indexOf(left.assetId);
      const rightIndex = ids.indexOf(right.assetId);
      return leftIndex - rightIndex;
    })
    .map((image, index) => ({ ...image, sortOrder: index }));
}

export function upsertInlineImageConfig(
  inlineImages: InlineImageConfig[],
  config: InlineImageConfig
): InlineImageConfig[] {
  const exists = inlineImages.some((item) => item.assetId === config.assetId);
  if (!exists) {
    return [...inlineImages, { ...config, sortOrder: inlineImages.length }];
  }

  return inlineImages.map((item, index) =>
    item.assetId === config.assetId
      ? { ...item, ...config, sortOrder: index }
      : { ...item, sortOrder: index }
  );
}

export function removeInlineImageConfig(
  inlineImages: InlineImageConfig[],
  assetId: string
): InlineImageConfig[] {
  return inlineImages
    .filter((item) => item.assetId !== assetId)
    .map((item, index) => ({ ...item, sortOrder: index }));
}

export function buildInlineImageHtml(assetId: string, blobUrl: string): string {
  return `<img src="${blobUrl}" data-email-asset-id="${assetId}" alt="" style="max-width:100%;height:auto;" />`;
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function serializeHtml(doc: Document): string {
  return doc.body.innerHTML;
}

function findInlineImage(doc: Document, assetId: string): HTMLImageElement | null {
  return (
    Array.from(doc.querySelectorAll<HTMLImageElement>('img')).find(
      (img) => img.dataset.emailAssetId === assetId
    ) ?? null
  );
}

export function replaceInlineImageAsset(
  html: string,
  input: ReplaceInlineImageAssetInput
): { html: string; replaced: boolean; alt: string | null } {
  const doc = parseHtml(html);
  const existing = findInlineImage(doc, input.currentAssetId);
  if (!existing) {
    return { html, replaced: false, alt: null };
  }

  existing.src = input.nextBlobUrl;
  existing.dataset.emailAssetId = input.nextAssetId;

  return {
    html: serializeHtml(doc),
    replaced: true,
    alt: existing.alt || null,
  };
}

export function removeInlineImageFromHtml(
  html: string,
  assetId: string
): { html: string; removed: boolean } {
  const doc = parseHtml(html);
  const element = findInlineImage(doc, assetId);
  if (!element) {
    return { html, removed: false };
  }

  const toRemove = element.closest('figure') ?? element;
  toRemove.remove();

  return {
    html: serializeHtml(doc),
    removed: true,
  };
}

export function applyInlineImageConfigToHtml(
  html: string,
  config: InlineImageConfig
): { html: string; updated: boolean } {
  const doc = parseHtml(html);
  const element = findInlineImage(doc, config.assetId);
  if (!element) {
    return { html, updated: false };
  }

  element.style.height = 'auto';
  element.style.maxWidth = '100%';
  element.style.display = config.align ? 'block' : '';

  if (config.widthPx) {
    element.style.width = `${config.widthPx}px`;
    element.width = config.widthPx;
  } else {
    element.style.removeProperty('width');
    element.removeAttribute('width');
  }

  if (config.align === 'left') {
    element.style.marginLeft = '0';
    element.style.marginRight = 'auto';
  } else if (config.align === 'center') {
    element.style.marginLeft = 'auto';
    element.style.marginRight = 'auto';
  } else if (config.align === 'right') {
    element.style.marginLeft = 'auto';
    element.style.marginRight = '0';
  } else {
    element.style.marginLeft = '';
    element.style.marginRight = '';
  }

  element.alt = config.alt || '';

  return {
    html: serializeHtml(doc),
    updated: true,
  };
}
