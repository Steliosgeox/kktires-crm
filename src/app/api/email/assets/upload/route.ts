import { NextResponse } from 'next/server';

import { getOrgIdFromSession, requireSession } from '@/server/authz';
import { createRequestId, handleApiError, jsonError } from '@/server/api/http';
import { createEmailAsset, type AssetKind } from '@/server/email/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseKind(raw: FormDataEntryValue | null, fallbackMime: string): AssetKind {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'image' || value === 'file') return value;
  return fallbackMime.startsWith('image/') ? 'image' : 'file';
}

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);

    const orgId = getOrgIdFromSession(session);
    const formData = await request.formData();
    const fileValue = formData.get('file');

    if (!(fileValue instanceof File)) {
      return jsonError('File is required', 400, 'BAD_REQUEST', requestId);
    }

    if (fileValue.size <= 0) {
      return jsonError('Empty file', 400, 'BAD_REQUEST', requestId);
    }

    const mimeType = fileValue.type?.trim().toLowerCase() || 'application/octet-stream';
    const kind = parseKind(formData.get('kind'), mimeType);
    const width = parseOptionalInt(formData.get('width'));
    const height = parseOptionalInt(formData.get('height'));

    const arrayBuffer = await fileValue.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const asset = await createEmailAsset({
      orgId,
      uploaderUserId: session.user.id,
      fileName: fileValue.name || 'upload.bin',
      mimeType,
      buffer,
      width,
      height,
      kind,
    });

    return NextResponse.json({ asset, requestId }, { status: 201 });
  } catch (error) {
    return handleApiError('email-assets:upload', error, requestId, {
      message: 'Failed to upload asset',
    });
  }
}
