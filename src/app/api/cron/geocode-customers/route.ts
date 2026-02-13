import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { buildAddressString, geocodeAddress } from '@/server/maps/geocode';
import { clampInt, createRequestId, jsonError } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === 'production';
  if (!secret) return !isProduction;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function hasGeocodeKey(): boolean {
  const key =
    process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return !!key;
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  if (!isAuthorized(request)) {
    return jsonError('Unauthorized', 401, 'UNAUTHORIZED', requestId);
  }
  if (!hasGeocodeKey()) {
    return jsonError(
      'GOOGLE_GEOCODING_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is required',
      400,
      'BAD_REQUEST',
      requestId
    );
  }

  const url = new URL(request.url);
  const limit = clampInt(url.searchParams.get('limit'), 1, 100, 25);

  try {
    const rows = await db
      .select({
        id: customers.id,
        street: customers.street,
        postalCode: customers.postalCode,
        city: customers.city,
        state: customers.state,
        country: customers.country,
      })
      .from(customers)
      .where(
        and(
          eq(customers.isActive, true),
          sql`${customers.latitude} is null OR ${customers.longitude} is null`
        )
      )
      .orderBy(desc(customers.createdAt))
      .limit(limit);

    let updated = 0;
    let skippedNoAddress = 0;
    let failed = 0;

    for (const c of rows) {
      const hasMeaningfulAddress = !!(c.street || c.city || c.postalCode);
      if (!hasMeaningfulAddress) {
        skippedNoAddress++;
        continue;
      }

      const address = buildAddressString({
        street: c.street,
        postalCode: c.postalCode,
        city: c.city,
        state: c.state,
        country: c.country,
      });

      const geo = await geocodeAddress(address);
      if (!geo) {
        failed++;
        continue;
      }

      await db
        .update(customers)
        .set({
          latitude: geo.latitude,
          longitude: geo.longitude,
          geocodedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, c.id));

      updated++;
    }

    return NextResponse.json({
      processed: rows.length,
      updated,
      skippedNoAddress,
      failed,
      limit,
      requestId,
    });
  } catch (error) {
    console.error(`[cron/geocode-customers] requestId=${requestId}`, error);
    return jsonError('Cron job failed', 500, 'INTERNAL_ERROR', requestId);
  }
}
