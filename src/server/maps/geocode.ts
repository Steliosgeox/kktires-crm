import { nanoid } from 'nanoid';

import { db } from '@/lib/db';
import { geocodeCache } from '@/lib/db/schema';
import { normalizeAddressForCacheKey } from './geocode-utils';

export type { AddressParts } from './geocode-utils';
export { buildAddressString, normalizeAddressForCacheKey } from './geocode-utils';

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress?: string | null;
  source: 'cache' | 'api';
};

function getGeocodingApiKey(): string | null {
  const key =
    process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key?.length ? key : null;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const addressRaw = address.trim();
  if (!addressRaw) return null;

  const cacheKey = normalizeAddressForCacheKey(addressRaw);

  const cached = await db.query.geocodeCache.findFirst({
    where: (c, { eq }) => eq(c.address, cacheKey),
  });
  if (cached) {
    return {
      latitude: cached.latitude,
      longitude: cached.longitude,
      formattedAddress: cached.formattedAddress,
      source: 'cache',
    };
  }

  const apiKey = getGeocodingApiKey();
  if (!apiKey) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', addressRaw);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) return null;

  const json = (await res.json().catch(() => null)) as
    | {
        results?: Array<{
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      }
    | null;
  const first = json?.results?.[0];
  const location = first?.geometry?.location;
  const lat = location?.lat;
  const lng = location?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const formattedAddress = typeof first?.formatted_address === 'string' ? first.formatted_address : null;

  await db
    .insert(geocodeCache)
    .values({
      id: `geo_${nanoid()}`,
      address: cacheKey,
      latitude: lat,
      longitude: lng,
      formattedAddress,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  return {
    latitude: lat,
    longitude: lng,
    formattedAddress,
    source: 'api',
  };
}
