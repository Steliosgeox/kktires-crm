import type { CampaignAttachment } from './types';

type UploadAssetKind = 'image' | 'file';

interface UploadedEmailAsset {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobUrl: string;
  width?: number | null;
  height?: number | null;
}

export async function uploadEmailAsset(
  file: File,
  kind: UploadAssetKind,
  extra?: { width?: number; height?: number }
): Promise<UploadedEmailAsset> {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  if (extra?.width) form.append('width', String(extra.width));
  if (extra?.height) form.append('height', String(extra.height));

  const response = await fetch('/api/email/assets/upload', {
    method: 'POST',
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : `Upload failed (${response.status} ${response.statusText})`;
    const code = typeof payload?.code === 'string' ? payload.code : null;
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : null;
    throw new Error(
      [message, code ? `[${code}]` : null, requestId ? `requestId: ${requestId}` : null]
        .filter(Boolean)
        .join(' | ')
    );
  }

  const asset = payload?.asset as UploadedEmailAsset | undefined;
  if (!asset?.id || !asset.blobUrl) {
    throw new Error('Upload response was invalid');
  }

  return asset;
}

export async function optimizeImageFile(
  file: File
): Promise<{ file: File; width: number | null; height: number | null }> {
  if (file.type === 'image/gif') {
    return { file, width: null, height: null };
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
  const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return { file, width: bitmap.width, height: bitmap.height };
  }

  context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const preferPng = file.type === 'image/png' && !/\.jpe?g$/i.test(file.name);
  const exportType = preferPng ? 'image/png' : 'image/webp';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, exportType, preferPng ? undefined : 0.82)
  );

  if (!blob) {
    return { file, width: targetWidth, height: targetHeight };
  }

  const ext = exportType === 'image/png' ? 'png' : 'webp';
  const base = file.name.replace(/\.[a-zA-Z0-9]+$/, '') || 'image';

  return {
    file: new File([blob], `${base}.${ext}`, { type: exportType }),
    width: targetWidth,
    height: targetHeight,
  };
}

export function createAttachmentFromAsset(asset: UploadedEmailAsset): CampaignAttachment {
  return {
    assetId: asset.id,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    sizeBytes: Number(asset.sizeBytes || 0),
    blobUrl: asset.blobUrl,
  };
}
