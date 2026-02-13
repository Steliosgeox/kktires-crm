import crypto from 'node:crypto';

import { put } from '@vercel/blob';
import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/lib/db';
import {
  campaignAssets,
  emailAssets,
  emailCampaigns,
  type EmailAsset,
  type NewCampaignAsset,
} from '@/lib/db/schema';
import { ApiError } from '@/server/api/http';

export type AssetKind = 'image' | 'file';
export type CampaignAssetRole = 'inline_image' | 'attachment';
export type ImageAlign = 'left' | 'center' | 'right';

export type InlineImageConfigInput = {
  assetId: string;
  embedInline?: boolean;
  widthPx?: number | null;
  align?: ImageAlign | null;
  alt?: string | null;
  sortOrder?: number;
};

export type CampaignAssetsInput = {
  attachments?: string[];
  inlineImages?: InlineImageConfigInput[];
};

export type EmailSendAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
  cid?: string;
  disposition?: 'inline' | 'attachment';
};

export type CampaignAssetsResponse = {
  attachments: Array<{
    assetId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    blobUrl: string;
  }>;
  inlineImages: Array<{
    assetId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    blobUrl: string;
    embedInline: boolean;
    widthPx: number | null;
    align: ImageAlign | null;
    alt: string | null;
    sortOrder: number;
  }>;
};

type PreparedInlineAsset = {
  assetId: string;
  blobUrl: string;
  cid: string | null;
  embedInline: boolean;
  widthPx: number | null;
  align: ImageAlign | null;
  alt: string | null;
  inlineAttachment: EmailSendAttachment | null;
};

export type PreparedAssetBundle = {
  inlineAssets: PreparedInlineAsset[];
  attachments: EmailSendAttachment[];
};

const IMAGE_MIME_ALLOWLIST = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ATTACHMENT_MIME_ALLOWLIST = new Set([
  ...Array.from(IMAGE_MIME_ALLOWLIST),
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function isMissingSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /no such table/i.test(message) ||
    /no such column/i.test(message) ||
    /does not exist/i.test(message)
  );
}

function normalizeMime(mimeType: string): string {
  return mimeType.trim().toLowerCase();
}

function normalizeFileName(name: string): string {
  const clean = name
    .trim()
    .replace(/[/\\]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
  return clean || 'file';
}

function toAssetKind(kind: string): AssetKind {
  return kind === 'image' ? 'image' : 'file';
}

function assertBlobConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new ApiError(
      'BLOB_READ_WRITE_TOKEN is not configured for email asset uploads',
      503,
      'INTERNAL_ERROR'
    );
  }
}

function ensureAllowedMime(kind: AssetKind, mimeType: string, sizeBytes: number) {
  const normalized = normalizeMime(mimeType);
  if (kind === 'image') {
    if (!IMAGE_MIME_ALLOWLIST.has(normalized)) {
      throw new ApiError('Unsupported image type', 400, 'BAD_REQUEST');
    }
    if (sizeBytes > MAX_IMAGE_BYTES) {
      throw new ApiError('Image exceeds max size (8MB)', 400, 'BAD_REQUEST');
    }
    return;
  }

  if (!ATTACHMENT_MIME_ALLOWLIST.has(normalized)) {
    throw new ApiError('Unsupported attachment type', 400, 'BAD_REQUEST');
  }
  if (sizeBytes > MAX_ATTACHMENT_BYTES) {
    throw new ApiError('Attachment exceeds max size (10MB)', 400, 'BAD_REQUEST');
  }
}

function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };
  return map[normalizeMime(mimeType)] || 'bin';
}

function sha256Hex(input: Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function clampWidthPx(widthPx: number | null | undefined): number | null {
  if (widthPx == null) return null;
  if (!Number.isFinite(widthPx)) return null;
  const rounded = Math.round(widthPx);
  return Math.min(2400, Math.max(32, rounded));
}

function normalizeAlign(align: string | null | undefined): ImageAlign | null {
  if (align === 'left' || align === 'center' || align === 'right') return align;
  return null;
}

function normalizeAlt(alt: string | null | undefined): string | null {
  if (!alt) return null;
  const trimmed = alt.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
}

function makeCid(assetId: string): string {
  return `asset-${assetId}@kktires`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setTagAttribute(tag: string, name: string, value: string): string {
  const regex = new RegExp(`\\s${name}=(['"])(.*?)\\1`, 'i');
  if (regex.test(tag)) {
    return tag.replace(regex, ` ${name}="${value}"`);
  }
  return tag.replace(/^<img\b/i, `<img ${name}="${value}"`);
}

function readTagAttribute(tag: string, name: string): string | null {
  const regex = new RegExp(`\\s${name}=(['"])(.*?)\\1`, 'i');
  const match = tag.match(regex);
  return match?.[2] ?? null;
}

function applyImagePresentation(
  tag: string,
  config: { widthPx: number | null; align: ImageAlign | null; alt: string | null }
): string {
  let next = tag;
  next = setTagAttribute(next, 'alt', config.alt ?? '');
  next = setTagAttribute(next, 'width', config.widthPx ? String(config.widthPx) : '');

  const style = readTagAttribute(next, 'style') || '';
  const withoutManaged = style
    .replace(/(^|;)\s*width\s*:[^;]*/gi, '')
    .replace(/(^|;)\s*height\s*:[^;]*/gi, '')
    .replace(/(^|;)\s*display\s*:[^;]*/gi, '')
    .replace(/(^|;)\s*margin-left\s*:[^;]*/gi, '')
    .replace(/(^|;)\s*margin-right\s*:[^;]*/gi, '')
    .replace(/(^|;)\s*max-width\s*:[^;]*/gi, '')
    .trim();

  const managed: string[] = ['height:auto', 'max-width:100%'];
  if (config.widthPx) managed.push(`width:${config.widthPx}px`);
  if (config.align) {
    managed.push('display:block');
    if (config.align === 'left') managed.push('margin-left:0', 'margin-right:auto');
    if (config.align === 'center') managed.push('margin-left:auto', 'margin-right:auto');
    if (config.align === 'right') managed.push('margin-left:auto', 'margin-right:0');
  }
  const merged = [withoutManaged, managed.join(';')].filter(Boolean).join(';');
  return setTagAttribute(next, 'style', merged.endsWith(';') ? merged : `${merged};`);
}

function rewriteInlineImageTag(
  html: string,
  assetId: string,
  updater: (tag: string) => string
): string {
  const regex = new RegExp(
    `<img\\b[^>]*data-email-asset-id=(["'])${escapeRegExp(assetId)}\\1[^>]*>`,
    'gi'
  );
  return html.replace(regex, (tag) => updater(tag));
}

async function fetchAssetBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset (${response.status} ${response.statusText})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function getOrgAssetsByIds(orgId: string, assetIds: string[]): Promise<EmailAsset[]> {
  if (assetIds.length === 0) return [];
  const rows = await db
    .select()
    .from(emailAssets)
    .where(
      and(
        eq(emailAssets.orgId, orgId),
        inArray(emailAssets.id, assetIds),
        isNull(emailAssets.deletedAt)
      )
    );
  return rows;
}

export async function createEmailAsset(params: {
  orgId: string;
  uploaderUserId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  width?: number | null;
  height?: number | null;
  kind: AssetKind;
}): Promise<EmailAsset> {
  assertBlobConfigured();
  ensureAllowedMime(params.kind, params.mimeType, params.buffer.byteLength);

  const normalizedMime = normalizeMime(params.mimeType);
  const fileName = normalizeFileName(params.fileName);
  const ext = mimeToExtension(normalizedMime);
  const pathname = `email-assets/${params.orgId}/${Date.now()}-${nanoid()}.${ext}`;

  const blob = await put(pathname, params.buffer, {
    access: 'public',
    contentType: normalizedMime,
    addRandomSuffix: false,
  });

  const now = new Date();
  const id = `ast_${nanoid()}`;

  const [created] = await db
    .insert(emailAssets)
    .values({
      id,
      orgId: params.orgId,
      uploaderUserId: params.uploaderUserId,
      blobUrl: blob.url,
      blobPath: pathname,
      fileName,
      mimeType: normalizedMime,
      sizeBytes: params.buffer.byteLength,
      kind: params.kind,
      width: params.width ?? null,
      height: params.height ?? null,
      sha256: sha256Hex(params.buffer),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning();

  return created;
}

export async function listEmailAssetsForCampaign(
  orgId: string,
  campaignId: string
): Promise<CampaignAssetsResponse> {
  try {
    const rows = await db
      .select({
        assetId: emailAssets.id,
        fileName: emailAssets.fileName,
        mimeType: emailAssets.mimeType,
        sizeBytes: emailAssets.sizeBytes,
        blobUrl: emailAssets.blobUrl,
        role: campaignAssets.role,
        embedInline: campaignAssets.embedInline,
        widthPx: campaignAssets.displayWidthPx,
        align: campaignAssets.align,
        alt: campaignAssets.altText,
        sortOrder: campaignAssets.sortOrder,
      })
      .from(campaignAssets)
      .innerJoin(emailAssets, eq(emailAssets.id, campaignAssets.assetId))
      .innerJoin(emailCampaigns, eq(emailCampaigns.id, campaignAssets.campaignId))
      .where(
        and(
          eq(campaignAssets.campaignId, campaignId),
          eq(emailCampaigns.orgId, orgId),
          isNull(emailAssets.deletedAt)
        )
      )
      .orderBy(campaignAssets.sortOrder);

    const attachments = rows
      .filter((r) => r.role === 'attachment')
      .map((r) => ({
        assetId: r.assetId,
        fileName: r.fileName,
        mimeType: r.mimeType,
        sizeBytes: Number(r.sizeBytes || 0),
        blobUrl: r.blobUrl,
      }));

    const inlineImages = rows
      .filter((r) => r.role === 'inline_image')
      .map((r) => ({
        assetId: r.assetId,
        fileName: r.fileName,
        mimeType: r.mimeType,
        sizeBytes: Number(r.sizeBytes || 0),
        blobUrl: r.blobUrl,
        embedInline: Boolean(r.embedInline),
        widthPx: r.widthPx ? Number(r.widthPx) : null,
        align: normalizeAlign(r.align),
        alt: normalizeAlt(r.alt),
        sortOrder: Number(r.sortOrder || 0),
      }));

    return { attachments, inlineImages };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { attachments: [], inlineImages: [] };
    }
    throw error;
  }
}

export async function listRecentEmailAssets(orgId: string, limit = 50): Promise<EmailAsset[]> {
  try {
    return await db
      .select()
      .from(emailAssets)
      .where(and(eq(emailAssets.orgId, orgId), isNull(emailAssets.deletedAt)))
      .orderBy(desc(emailAssets.createdAt))
      .limit(Math.max(1, Math.min(limit, 200)));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

export function normalizeCampaignAssetsInput(input: CampaignAssetsInput | undefined): {
  attachments: string[];
  inlineImages: Array<{
    assetId: string;
    embedInline: boolean;
    widthPx: number | null;
    align: ImageAlign | null;
    alt: string | null;
    sortOrder: number;
  }>;
} {
  const attachments = Array.from(
    new Set((input?.attachments || []).map((id) => id.trim()).filter((id) => id.length > 0))
  );

  const inlineImages = (input?.inlineImages || [])
    .map((item, idx) => ({
      assetId: item.assetId.trim(),
      embedInline: Boolean(item.embedInline),
      widthPx: clampWidthPx(item.widthPx),
      align: normalizeAlign(item.align),
      alt: normalizeAlt(item.alt),
      sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : idx,
    }))
    .filter((item) => item.assetId.length > 0);

  return { attachments, inlineImages };
}

export async function syncCampaignAssets(params: {
  orgId: string;
  campaignId: string;
  assets: CampaignAssetsInput;
}): Promise<void> {
  const normalized = normalizeCampaignAssetsInput(params.assets);
  const allAssetIds = Array.from(
    new Set([
      ...normalized.attachments,
      ...normalized.inlineImages.map((item) => item.assetId),
    ])
  );

  try {
    if (allAssetIds.length > 0) {
      const assets = await getOrgAssetsByIds(params.orgId, allAssetIds);
      if (assets.length !== allAssetIds.length) {
        throw new ApiError('One or more assets are invalid for this organization', 400, 'BAD_REQUEST');
      }
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.delete(campaignAssets).where(eq(campaignAssets.campaignId, params.campaignId));

      const rows: NewCampaignAsset[] = [];
      let sortOrder = 0;

      for (const assetId of normalized.attachments) {
        rows.push({
          id: `cas_${nanoid()}`,
          campaignId: params.campaignId,
          assetId,
          role: 'attachment',
          embedInline: false,
          displayWidthPx: null,
          align: null,
          altText: null,
          sortOrder: sortOrder++,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const inline of normalized.inlineImages) {
        rows.push({
          id: `cas_${nanoid()}`,
          campaignId: params.campaignId,
          assetId: inline.assetId,
          role: 'inline_image',
          embedInline: inline.embedInline,
          displayWidthPx: inline.widthPx,
          align: inline.align,
          altText: inline.alt,
          sortOrder: inline.sortOrder,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (rows.length > 0) {
        await tx.insert(campaignAssets).values(rows);
      }
    });
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return;
    }
    throw error;
  }
}

export async function deleteEmailAsset(params: {
  orgId: string;
  assetId: string;
  campaignId?: string;
}): Promise<{ deleted: boolean; detached: boolean }> {
  try {
    const [asset] = await db
      .select({ id: emailAssets.id })
      .from(emailAssets)
      .where(and(eq(emailAssets.id, params.assetId), eq(emailAssets.orgId, params.orgId), isNull(emailAssets.deletedAt)))
      .limit(1);

    if (!asset) {
      throw new ApiError('Asset not found', 404, 'NOT_FOUND');
    }

    if (params.campaignId) {
      await db
        .delete(campaignAssets)
        .where(and(eq(campaignAssets.assetId, params.assetId), eq(campaignAssets.campaignId, params.campaignId)));
      return { deleted: false, detached: true };
    }

    const linked = await db
      .select({ id: campaignAssets.id })
      .from(campaignAssets)
      .where(eq(campaignAssets.assetId, params.assetId))
      .limit(1);
    if (linked.length > 0) {
      throw new ApiError('Asset is linked to a campaign', 409, 'BAD_REQUEST');
    }

    await db
      .update(emailAssets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(emailAssets.id, params.assetId));

    return { deleted: true, detached: false };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { deleted: false, detached: false };
    }
    throw error;
  }
}

export async function cleanupOrphanEmailAssets(params?: {
  olderThanHours?: number;
  limit?: number;
}): Promise<{ cleaned: number }> {
  const olderThanHours = Math.max(1, params?.olderThanHours ?? 24);
  const limit = Math.max(1, Math.min(500, params?.limit ?? 200));
  const threshold = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

  try {
    const rows = await db
      .select({ id: emailAssets.id })
      .from(emailAssets)
      .where(
        and(
          isNull(emailAssets.deletedAt),
          lt(emailAssets.createdAt, threshold),
          sql`not exists (
            select 1 from campaign_assets ca
            where ca.asset_id = ${emailAssets.id}
          )`
        )
      )
      .limit(limit);

    if (rows.length === 0) return { cleaned: 0 };

    await db
      .update(emailAssets)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(emailAssets.id, rows.map((row) => row.id)));

    return { cleaned: rows.length };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { cleaned: 0 };
    }
    throw error;
  }
}

async function buildBundleFromRows(
  rows: Array<{
    assetId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    blobUrl: string;
    role: string;
    embedInline: boolean;
    widthPx: number | null;
    align: string | null;
    alt: string | null;
  }>
): Promise<PreparedAssetBundle> {
  const attachments: EmailSendAttachment[] = [];
  const inlineAssets: PreparedInlineAsset[] = [];

  for (const row of rows) {
    if (row.role === 'attachment') {
      const buffer = await fetchAssetBuffer(row.blobUrl);
      attachments.push({
        filename: row.fileName,
        content: buffer,
        contentType: row.mimeType,
        disposition: 'attachment',
      });
      continue;
    }

    if (row.role !== 'inline_image') continue;

    let cid: string | null = null;
    let inlineAttachment: EmailSendAttachment | null = null;
    if (row.embedInline) {
      try {
        const buffer = await fetchAssetBuffer(row.blobUrl);
        cid = makeCid(row.assetId);
        inlineAttachment = {
          filename: row.fileName,
          content: buffer,
          contentType: row.mimeType,
          cid,
          disposition: 'inline',
        };
      } catch (error) {
        console.error('[email-assets] inline embed fetch failed, falling back to URL', error);
      }
    }

    inlineAssets.push({
      assetId: row.assetId,
      blobUrl: row.blobUrl,
      cid,
      embedInline: row.embedInline && !!cid,
      widthPx: clampWidthPx(row.widthPx),
      align: normalizeAlign(row.align),
      alt: normalizeAlt(row.alt),
      inlineAttachment,
    });
  }

  return { inlineAssets, attachments };
}

export async function prepareCampaignAssetBundle(params: {
  orgId: string;
  campaignId: string;
}): Promise<PreparedAssetBundle> {
  try {
    const rows = await db
      .select({
        assetId: emailAssets.id,
        fileName: emailAssets.fileName,
        mimeType: emailAssets.mimeType,
        sizeBytes: emailAssets.sizeBytes,
        blobUrl: emailAssets.blobUrl,
        role: campaignAssets.role,
        embedInline: campaignAssets.embedInline,
        widthPx: campaignAssets.displayWidthPx,
        align: campaignAssets.align,
        alt: campaignAssets.altText,
      })
      .from(campaignAssets)
      .innerJoin(emailAssets, eq(emailAssets.id, campaignAssets.assetId))
      .innerJoin(emailCampaigns, eq(emailCampaigns.id, campaignAssets.campaignId))
      .where(
        and(
          eq(campaignAssets.campaignId, params.campaignId),
          eq(emailCampaigns.orgId, params.orgId),
          isNull(emailAssets.deletedAt)
        )
      );

    return buildBundleFromRows(rows);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { inlineAssets: [], attachments: [] };
    }
    throw error;
  }
}

export async function prepareAdhocAssetBundle(params: {
  orgId: string;
  assets: CampaignAssetsInput;
}): Promise<PreparedAssetBundle> {
  const normalized = normalizeCampaignAssetsInput(params.assets);
  const assetIds = Array.from(
    new Set([
      ...normalized.attachments,
      ...normalized.inlineImages.map((item) => item.assetId),
    ])
  );

  if (assetIds.length === 0) return { inlineAssets: [], attachments: [] };
  const orgAssets = await getOrgAssetsByIds(params.orgId, assetIds);
  if (orgAssets.length !== assetIds.length) {
    throw new ApiError('One or more assets are invalid for this organization', 400, 'BAD_REQUEST');
  }

  const byId = new Map(orgAssets.map((asset) => [asset.id, asset]));
  const rows = [
    ...normalized.attachments.map((assetId) => {
      const asset = byId.get(assetId)!;
      return {
        assetId,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: Number(asset.sizeBytes || 0),
        blobUrl: asset.blobUrl,
        role: 'attachment',
        embedInline: false,
        widthPx: null,
        align: null,
        alt: null,
      };
    }),
    ...normalized.inlineImages.map((inline) => {
      const asset = byId.get(inline.assetId)!;
      return {
        assetId: inline.assetId,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: Number(asset.sizeBytes || 0),
        blobUrl: asset.blobUrl,
        role: 'inline_image',
        embedInline: inline.embedInline,
        widthPx: inline.widthPx,
        align: inline.align,
        alt: inline.alt,
      };
    }),
  ];

  return buildBundleFromRows(rows);
}

export function applyAssetBundleToHtml(
  html: string,
  bundle: PreparedAssetBundle
): { html: string; attachments: EmailSendAttachment[] } {
  let rewritten = html;

  for (const inline of bundle.inlineAssets) {
    rewritten = rewriteInlineImageTag(rewritten, inline.assetId, (tag) => {
      let next = setTagAttribute(tag, 'src', inline.embedInline && inline.cid ? `cid:${inline.cid}` : inline.blobUrl);
      next = applyImagePresentation(next, {
        widthPx: inline.widthPx,
        align: inline.align,
        alt: inline.alt,
      });
      return next;
    });
  }

  const inlineAttachments = bundle.inlineAssets
    .map((item) => item.inlineAttachment)
    .filter(Boolean) as EmailSendAttachment[];

  return {
    html: rewritten,
    attachments: [...inlineAttachments, ...bundle.attachments],
  };
}

type MigratedInlineImage = {
  assetId: string;
  embedInline: boolean;
  widthPx: number | null;
  align: ImageAlign | null;
  alt: string | null;
  sortOrder: number;
};

function extractWidthPxFromTag(tag: string): number | null {
  const widthAttr = readTagAttribute(tag, 'width');
  if (widthAttr && /^\d+$/.test(widthAttr.trim())) {
    return clampWidthPx(Number.parseInt(widthAttr.trim(), 10));
  }
  const style = readTagAttribute(tag, 'style') || '';
  const match = style.match(/width\s*:\s*(\d+)px/i);
  if (match?.[1]) {
    return clampWidthPx(Number.parseInt(match[1], 10));
  }
  return null;
}

function extractAlignFromTag(tag: string): ImageAlign | null {
  const alignAttr = normalizeAlign(readTagAttribute(tag, 'align'));
  if (alignAttr) return alignAttr;

  const style = readTagAttribute(tag, 'style') || '';
  if (/margin-left\s*:\s*auto/i.test(style) && /margin-right\s*:\s*auto/i.test(style)) {
    return 'center';
  }
  if (/margin-left\s*:\s*auto/i.test(style) && /margin-right\s*:\s*0/i.test(style)) {
    return 'right';
  }
  if (/margin-left\s*:\s*0/i.test(style) && /margin-right\s*:\s*auto/i.test(style)) {
    return 'left';
  }
  return null;
}

export async function migrateInlineDataImagesToAssets(params: {
  html: string;
  orgId: string;
  uploaderUserId: string;
}): Promise<{ html: string; inlineImages: MigratedInlineImage[] }> {
  const regex = /<img\b[^>]*src=(['"])data:(image\/[a-zA-Z0-9.+-]+);base64,([^"']+)\1[^>]*>/gi;
  const matches = Array.from(params.html.matchAll(regex));
  if (matches.length === 0) {
    return { html: params.html, inlineImages: [] };
  }

  let cursor = 0;
  let rebuiltHtml = '';
  const inlineImages: MigratedInlineImage[] = [];

  for (const [index, match] of matches.entries()) {
    const fullTag = match[0];
    const mimeType = normalizeMime(match[2] || '');
    const base64 = match[3] || '';
    const start = match.index ?? 0;
    const end = start + fullTag.length;

    rebuiltHtml += params.html.slice(cursor, start);
    cursor = end;

    const buffer = Buffer.from(base64, 'base64');
    const asset = await createEmailAsset({
      orgId: params.orgId,
      uploaderUserId: params.uploaderUserId,
      fileName: `inline-image-${index + 1}.${mimeToExtension(mimeType)}`,
      mimeType,
      buffer,
      kind: 'image',
    });

    let nextTag = fullTag;
    nextTag = setTagAttribute(nextTag, 'src', asset.blobUrl);
    nextTag = setTagAttribute(nextTag, 'data-email-asset-id', asset.id);
    rebuiltHtml += nextTag;

    inlineImages.push({
      assetId: asset.id,
      embedInline: false,
      widthPx: extractWidthPxFromTag(nextTag),
      align: extractAlignFromTag(nextTag),
      alt: normalizeAlt(readTagAttribute(nextTag, 'alt')),
      sortOrder: index,
    });
  }

  rebuiltHtml += params.html.slice(cursor);
  return { html: rebuiltHtml, inlineImages };
}
