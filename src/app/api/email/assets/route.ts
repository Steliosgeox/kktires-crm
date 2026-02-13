import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestId, handleApiError, jsonError } from '@/server/api/http';
import { getOrgIdFromSession, requireSession } from '@/server/authz';
import {
  createEmailAsset,
  listEmailAssetsForCampaign,
  listRecentEmailAssets,
  type AssetKind,
} from '@/server/email/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  campaignId: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

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

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const session = await requireSession();
    if (!session) return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);

    const orgId = getOrgIdFromSession(session);
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      campaignId: url.searchParams.get('campaignId') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    });

    if (!parsed.success) {
      return jsonError('Invalid query parameters', 400, 'BAD_REQUEST', requestId);
    }

    if (parsed.data.campaignId) {
      const assets = await listEmailAssetsForCampaign(orgId, parsed.data.campaignId);
      return NextResponse.json({ assets, requestId });
    }

    const assets = await listRecentEmailAssets(orgId, parsed.data.limit ?? 50);
    return NextResponse.json({ assets, requestId });
  } catch (error) {
    return handleApiError('email-assets:get', error, requestId, {
      message: 'Failed to list email assets',
    });
  }
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

    return NextResponse.json({
      asset,
      requestId,
    }, { status: 201 });
  } catch (error) {
    return handleApiError('email-assets:post', error, requestId, {
      message: 'Failed to upload asset',
    });
  }
}
