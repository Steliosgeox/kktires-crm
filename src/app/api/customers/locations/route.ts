import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { eq, sql, isNotNull, and } from 'drizzle-orm';

const DEFAULT_ORG_ID = 'org_kktires';

// Greek city coordinates for geocoding fallback
const GREEK_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'αθήνα': { lat: 37.9838, lng: 23.7275 },
  'θεσσαλονίκη': { lat: 40.6401, lng: 22.9444 },
  'πάτρα': { lat: 38.2466, lng: 21.7346 },
  'ηράκλειο': { lat: 35.3387, lng: 25.1442 },
  'λάρισα': { lat: 39.6390, lng: 22.4191 },
  'βόλος': { lat: 39.3666, lng: 22.9507 },
  'ιωάννινα': { lat: 39.6650, lng: 20.8537 },
  'τρίκαλα': { lat: 39.5550, lng: 21.7687 },
  'χαλκίδα': { lat: 38.4633, lng: 23.5987 },
  'σέρρες': { lat: 41.0857, lng: 23.5484 },
  'αλεξανδρούπολη': { lat: 40.8476, lng: 25.8745 },
  'ξάνθη': { lat: 41.1350, lng: 24.8880 },
  'κατερίνη': { lat: 40.2715, lng: 22.5019 },
  'καβάλα': { lat: 40.9396, lng: 24.4128 },
  'χανιά': { lat: 35.5138, lng: 24.0180 },
  'ρόδος': { lat: 36.4348, lng: 28.2174 },
  'κέρκυρα': { lat: 39.6243, lng: 19.9217 },
  'κοζάνη': { lat: 40.3000, lng: 21.7833 },
  'καλαμάτα': { lat: 37.0389, lng: 22.1128 },
  'πειραιάς': { lat: 37.9428, lng: 23.6465 },
};

function normalizeCity(city: string): string {
  return city.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getCoordsForCity(city: string): { lat: number; lng: number } | null {
  const normalized = normalizeCity(city);
  
  for (const [key, coords] of Object.entries(GREEK_CITY_COORDS)) {
    const normalizedKey = normalizeCity(key);
    if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
      return coords;
    }
  }
  
  // Default to Athens area with random offset for unknown cities
  return {
    lat: 37.9838 + (Math.random() - 0.5) * 0.5,
    lng: 23.7275 + (Math.random() - 0.5) * 0.5,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    // Get all customers with their location data
    let query = db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        company: customers.company,
        email: customers.email,
        phone: customers.phone,
        city: customers.city,
        street: customers.street,
        category: customers.category,
        isVip: customers.isVip,
        latitude: customers.latitude,
        longitude: customers.longitude,
      })
      .from(customers)
      .where(eq(customers.orgId, DEFAULT_ORG_ID));

    const allCustomers = await query;

    // Process customers and add coordinates
    const customersWithCoords = allCustomers.map(customer => {
      let lat = customer.latitude;
      let lng = customer.longitude;
      
      // If no coordinates, try to geocode from city
      if ((!lat || !lng) && customer.city) {
        const coords = getCoordsForCity(customer.city);
        if (coords) {
          lat = coords.lat + (Math.random() - 0.5) * 0.02; // Add small random offset
          lng = coords.lng + (Math.random() - 0.5) * 0.02;
        }
      }

      return {
        ...customer,
        latitude: lat,
        longitude: lng,
        displayName: customer.company || `${customer.firstName} ${customer.lastName || ''}`.trim(),
      };
    }).filter(c => c.latitude && c.longitude);

    // Filter by city if specified
    const filteredCustomers = city
      ? customersWithCoords.filter(c => c.city?.toLowerCase().includes(city.toLowerCase()))
      : customersWithCoords;

    // Calculate city stats
    const cityStats: Record<string, number> = {};
    allCustomers.forEach(customer => {
      if (customer.city) {
        const cityName = customer.city.trim();
        cityStats[cityName] = (cityStats[cityName] || 0) + 1;
      }
    });

    // Sort cities by count and get top 10
    const topCities = Object.entries(cityStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Calculate stats
    const totalCustomers = allCustomers.length;
    const geocoded = customersWithCoords.length;
    const withoutCoords = totalCustomers - geocoded;

    return NextResponse.json({
      customers: filteredCustomers,
      stats: {
        total: totalCustomers,
        geocoded,
        withoutCoords,
      },
      cities: topCities,
    });
  } catch (error) {
    console.error('Error fetching customer locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

