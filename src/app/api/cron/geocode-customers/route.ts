import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { buildAddressString, geocodeAddress } from '@/server/maps/geocode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron === '1' || vercelCron === 'true') return true;

  const url = new URL(request.url);
  if (url.searchParams.get('secret') === secret) return true;

  return false;
}

function hasGeocodeKey(): boolean {
  const key =
    process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return !!key;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasGeocodeKey()) {
    return NextResponse.json(
      { error: 'GOOGLE_GEOCODING_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is required' },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get('limit') || '25';
  const limit = Math.min(Math.max(Number.parseInt(limitRaw, 10) || 25, 1), 100);

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
    });
  } catch (error) {
    console.error('[cron/geocode-customers] error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

