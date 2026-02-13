import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const DEFAULT_MAX_BODY_BYTES = 1_000_000;

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(message: string, status: number, code: ApiErrorCode) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function jsonError(
  error: string,
  status: number,
  code: ApiErrorCode,
  requestId: string
) {
  return NextResponse.json({ error, code, requestId }, { status });
}

export function clampInt(input: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function parsePagination(
  searchParams: URLSearchParams,
  options?: { defaultPage?: number; defaultLimit?: number; maxLimit?: number }
) {
  const defaultPage = options?.defaultPage ?? 1;
  const defaultLimit = options?.defaultLimit ?? 50;
  const maxLimit = options?.maxLimit ?? 100;

  const page = clampInt(searchParams.get('page'), 1, 10_000, defaultPage);
  const limit = clampInt(searchParams.get('limit'), 1, maxLimit, defaultLimit);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function getRequestBodySize(request: Request): number | null {
  const header = request.headers.get('content-length');
  if (!header) return null;
  const parsed = Number.parseInt(header, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function withValidatedBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
  options?: { maxBytes?: number }
): Promise<z.infer<T>> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  const headerSize = getRequestBodySize(request);
  if (headerSize !== null && headerSize > maxBytes) {
    throw new ApiError('Payload too large', 413, 'PAYLOAD_TOO_LARGE');
  }

  const raw = await request.text();
  const byteLength = Buffer.byteLength(raw, 'utf8');
  if (byteLength > maxBytes) {
    throw new ApiError('Payload too large', 413, 'PAYLOAD_TOO_LARGE');
  }

  let parsedJson: unknown;
  try {
    parsedJson = raw.length ? JSON.parse(raw) : {};
  } catch {
    throw new ApiError('Invalid JSON body', 400, 'BAD_REQUEST');
  }

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ApiError('Invalid input', 400, 'BAD_REQUEST');
  }

  return parsed.data;
}

export function handleApiError(
  scope: string,
  error: unknown,
  requestId: string,
  fallback: { message: string; status?: number; code?: ApiErrorCode } = {
    message: 'Internal server error',
    status: 500,
    code: 'INTERNAL_ERROR',
  }
) {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status, error.code, requestId);
  }

  if (error instanceof z.ZodError) {
    return jsonError('Invalid input', 400, 'BAD_REQUEST', requestId);
  }

  console.error(`[${scope}] requestId=${requestId}`, error);
  return jsonError(
    fallback.message,
    fallback.status ?? 500,
    fallback.code ?? 'INTERNAL_ERROR',
    requestId
  );
}

export function withApiErrorBoundary<
  TArgs extends unknown[],
  TResult extends Promise<Response> | Response
>(scope: string, handler: (requestId: string, ...args: TArgs) => TResult) {
  return async (...args: TArgs): Promise<Response> => {
    const requestId = createRequestId();
    try {
      return await handler(requestId, ...args);
    } catch (error) {
      return handleApiError(scope, error, requestId);
    }
  };
}
