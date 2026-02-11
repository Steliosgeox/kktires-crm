'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Map as MapIcon,
  Search,
  Layers,
  Navigation,
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  User,
  Building,
  Phone,
  Mail,
  X,
  Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassSkeleton } from '@/components/ui/glass-skeleton';
import { toast } from '@/lib/stores/ui-store';

interface CustomerLocation {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  street: string | null;
  category: string | null;
  isVip: boolean | null;
  latitude: number;
  longitude: number;
  displayName: string;
}

interface CityStats {
  name: string;
  count: number;
}

interface Stats {
  total: number;
  geocoded: number;
  withoutCoords: number;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const categoryColors: Record<string, string> = {
  vip: '#f59e0b',
  premium: '#8b5cf6',
  wholesale: '#10b981',
  fleet: '#3b82f6',
  garage: '#ef4444',
  retail: '#06b6d4',
};

export default function MapPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerLocation[]>([]);
  const [cities, setCities] = useState<CityStats[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, geocoded: 0, withoutCoords: 0 });
  const [loading, setLoading] = useState(true);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLocation | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Fetch customer locations
  const fetchLocations = useCallback(async (city?: string | null) => {
    try {
      setLoading(true);
      const url = city ? `/api/customers/locations?city=${encodeURIComponent(city)}` : '/api/customers/locations';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        setCities(data.cities || []);
        setStats(data.stats || { total: 0, geocoded: 0, withoutCoords: 0 });
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured');
      setLoading(false);
      return;
    }

    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Maps');
      setMapLoaded(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize map when loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || googleMapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 39.0742, lng: 21.8243 }, // Center of Greece
      zoom: 7,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
        { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#374151' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
        { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
        { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
        { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
      ],
      disableDefaultUI: true,
      zoomControl: false,
    });

    googleMapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();

    fetchLocations();
  }, [mapLoaded, fetchLocations]);

  // Update markers when customers change
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    customers.forEach(customer => {
      const color = customer.isVip 
        ? categoryColors.vip 
        : categoryColors[customer.category || 'retail'] || categoryColors.retail;

      const marker = new google.maps.Marker({
        position: { lat: customer.latitude, lng: customer.longitude },
        map: googleMapRef.current,
        title: customer.displayName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: customer.isVip ? 10 : 8,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        setSelectedCustomer(customer);
        if (infoWindowRef.current && googleMapRef.current) {
          infoWindowRef.current.setContent(`
            <div style="color: #1a1a2e; padding: 8px; min-width: 200px;">
              <h3 style="font-weight: 600; margin-bottom: 4px;">${customer.displayName}</h3>
              ${customer.city ? `<p style="font-size: 12px; color: #6b7280;">${customer.city}</p>` : ''}
              ${customer.phone ? `<p style="font-size: 12px; margin-top: 4px;">📞 ${customer.phone}</p>` : ''}
            </div>
          `);
          infoWindowRef.current.open(googleMapRef.current, marker);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (customers.length > 0 && googleMapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      customers.forEach(c => bounds.extend({ lat: c.latitude, lng: c.longitude }));
      googleMapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [customers, mapLoaded]);

  const handleCityFilter = (cityName: string | null) => {
    setSelectedCity(cityName);
    fetchLocations(cityName);
  };

  const handleZoomIn = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setZoom((googleMapRef.current.getZoom() || 7) + 1);
    }
  };

  const handleZoomOut = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setZoom((googleMapRef.current.getZoom() || 7) - 1);
    }
  };

  const handleCenterGreece = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setCenter({ lat: 39.0742, lng: 21.8243 });
      googleMapRef.current.setZoom(7);
    }
  };

  const handleMyLocation = () => {
    if (navigator.geolocation && googleMapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          googleMapRef.current?.setCenter(pos);
          googleMapRef.current?.setZoom(12);
        },
        () => {
          toast.error('Σφάλμα', 'Δεν ήταν δυνατή η ανίχνευση της τοποθεσίας σας');
        }
      );
    }
  };

  const role = (session?.user as any)?.currentOrgRole as string | undefined;
  const canAdmin = role === 'owner' || role === 'admin';

  const handleGeocodeBackfill = async () => {
    try {
      setBackfillLoading(true);
      const res = await fetch('/api/maps/geocode/backfill?limit=25', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Backfill failed');

      toast.success(
        'Γεωκωδικοποίηση',
        `Ενημερώθηκαν ${data?.updated ?? 0} πελάτες (processed: ${data?.processed ?? 0}).`
      );
      await fetchLocations(selectedCity);
    } catch (e) {
      toast.error('Γεωκωδικοποίηση', e instanceof Error ? e.message : 'Backfill failed');
    } finally {
      setBackfillLoading(false);
    }
  };

  const filteredCustomers = searchQuery
    ? customers.filter(c => 
        c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : customers;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Χάρτης Πελατών</h1>
          <p className="text-white/60">
            Προβολή και διαχείριση πελατών στο χάρτη
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton 
            variant="default" 
            leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => fetchLocations(selectedCity)}
          >
            Ανανέωση
          </GlassButton>
          <GlassButton variant="default" leftIcon={<Layers className="h-4 w-4" />} disabled title="Not implemented yet">
            Επίπεδα
          </GlassButton>
        </div>
      </div>

      {/* Map Container */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Map */}
        <GlassCard padding="none" className="relative overflow-hidden min-h-[600px]">
          {/* Map Element */}
          {GOOGLE_MAPS_API_KEY ? (
            <div ref={mapRef} className="absolute inset-0" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-800 flex flex-col items-center justify-center">
              <MapIcon className="h-16 w-16 text-white/10 mb-4" />
              <p className="text-white/40 text-lg">Google Maps</p>
              <p className="text-white/30 text-sm mt-2">API Key not configured</p>
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
            </div>
          )}

          {/* Map Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center gap-3 z-20">
            <div className="flex-1 max-w-md">
              <GlassInput
                placeholder="Αναζήτηση τοποθεσίας ή πελάτη..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="bg-zinc-900/90"
              />
            </div>
            {selectedCity && (
              <GlassButton 
                variant="primary" 
                size="sm"
                onClick={() => handleCityFilter(null)}
                rightIcon={<X className="h-3 w-3" />}
              >
                {selectedCity}
              </GlassButton>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
            <GlassButton variant="default" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </GlassButton>
            <GlassButton variant="default" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </GlassButton>
            <GlassButton variant="default" size="icon" onClick={() => {
              if (googleMapRef.current) {
                const bounds = new google.maps.LatLngBounds();
                customers.forEach(c => bounds.extend({ lat: c.latitude, lng: c.longitude }));
                googleMapRef.current.fitBounds(bounds);
              }
            }}>
              <Maximize2 className="h-4 w-4" />
            </GlassButton>
          </div>

          {/* Quick Actions */}
          <div className="absolute left-4 bottom-4 flex items-center gap-2 z-20">
            <GlassButton variant="default" size="sm" leftIcon={<Navigation className="h-3 w-3" />} onClick={handleMyLocation}>
              Η τοποθεσία μου
            </GlassButton>
            <GlassButton variant="default" size="sm" onClick={handleCenterGreece}>
              Κέντρο Ελλάδας
            </GlassButton>
          </div>

          {/* Legend */}
          <div className="absolute right-4 bottom-4 z-20">
            <GlassCard padding="sm" className="text-xs">
              <p className="font-medium text-white/70 mb-2">Υπόμνημα</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors.vip }} />
                  <span className="text-white/50">VIP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors.premium }} />
                  <span className="text-white/50">Premium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors.wholesale }} />
                  <span className="text-white/50">Χονδρική</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors.retail }} />
                  <span className="text-white/50">Λιανική</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </GlassCard>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <GlassCard>
            <h3 className="font-medium text-white mb-4">Στατιστικά Χάρτη</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Συνολικοί Πελάτες</span>
                <span className="font-medium text-white">{loading ? <GlassSkeleton className="h-5 w-12" /> : stats.total.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Με Γεωκωδικοποίηση</span>
                <span className="font-medium text-emerald-400">{loading ? <GlassSkeleton className="h-5 w-12" /> : stats.geocoded.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Χωρίς Συντεταγμένες</span>
                <span className="font-medium text-amber-400">{loading ? <GlassSkeleton className="h-5 w-12" /> : stats.withoutCoords.toLocaleString()}</span>
              </div>
            </div>

            {!loading && stats.withoutCoords > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.08]">
                <p className="text-xs text-white/50 mb-3">
                  {canAdmin
                    ? 'Μπορείτε να τρέξετε γεωκωδικοποίηση για πελάτες χωρίς αποθηκευμένες συντεταγμένες.'
                    : 'Ζητήστε από admin να τρέξει γεωκωδικοποίηση για πελάτες χωρίς συντεταγμένες.'}
                </p>
                {canAdmin && (
                  <GlassButton
                    variant="primary"
                    size="sm"
                    leftIcon={<MapPin className={`h-4 w-4 ${backfillLoading ? 'animate-pulse' : ''}`} />}
                    onClick={handleGeocodeBackfill}
                    disabled={backfillLoading}
                  >
                    {backfillLoading ? 'Γεωκωδικοποίηση...' : 'Γεωκωδικοποίηση Πελατών'}
                  </GlassButton>
                )}
              </div>
            )}
          </GlassCard>

          {/* Filter by City */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white">Φίλτρο Πόλης</h3>
              {selectedCity && (
                <GlassButton 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCityFilter(null)}
                >
                  Καθαρισμός
                </GlassButton>
              )}
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <GlassSkeleton key={i} className="h-10 w-full mb-1" />
                ))
              ) : cities.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-4">Δεν βρέθηκαν πόλεις</p>
              ) : (
                cities.map((city) => (
                  <button
                    key={city.name}
                    onClick={() => handleCityFilter(city.name === selectedCity ? null : city.name)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                      city.name === selectedCity
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <span>{city.name}</span>
                    <GlassBadge size="sm" variant={city.name === selectedCity ? 'primary' : 'default'}>
                      {city.count}
                    </GlassBadge>
                  </button>
                ))
              )}
            </div>
          </GlassCard>

          {/* Selected Customer Details */}
          {selectedCustomer && (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white">Επιλεγμένος Πελάτης</h3>
                <GlassButton 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setSelectedCustomer(null)}
                >
                  <X className="h-3 w-3" />
                </GlassButton>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {selectedCustomer.company ? (
                    <Building className="h-4 w-4 text-white/40" />
                  ) : (
                    <User className="h-4 w-4 text-white/40" />
                  )}
                  <div>
                    <p className="font-medium text-white">{selectedCustomer.displayName}</p>
                    {selectedCustomer.company && selectedCustomer.firstName && (
                      <p className="text-xs text-white/50">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    )}
                  </div>
                </div>
                {selectedCustomer.city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-white/40" />
                    <span className="text-sm text-white/70">{selectedCustomer.city}</span>
                  </div>
                )}
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-white/40" />
                    <a href={`tel:${selectedCustomer.phone}`} className="text-sm text-cyan-400 hover:underline">
                      {selectedCustomer.phone}
                    </a>
                  </div>
                )}
                {selectedCustomer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-white/40" />
                    <a href={`mailto:${selectedCustomer.email}`} className="text-sm text-cyan-400 hover:underline truncate">
                      {selectedCustomer.email}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  {selectedCustomer.isVip && (
                    <GlassBadge variant="warning" size="sm">⭐ VIP</GlassBadge>
                  )}
                  {selectedCustomer.category && (
                    <GlassBadge size="sm">{selectedCustomer.category}</GlassBadge>
                  )}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Nearby Customers - Based on search */}
          {searchQuery && filteredCustomers.length > 0 && (
            <GlassCard>
              <h3 className="font-medium text-white mb-4">Αποτελέσματα Αναζήτησης</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {filteredCustomers.slice(0, 10).map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      if (googleMapRef.current) {
                        googleMapRef.current.setCenter({ lat: customer.latitude, lng: customer.longitude });
                        googleMapRef.current.setZoom(14);
                      }
                    }}
                    className="flex w-full items-center justify-between py-2 px-2 rounded-md text-left hover:bg-white/[0.05] transition-colors"
                  >
                    <div>
                      <p className="text-sm text-white/80">{customer.displayName}</p>
                      {customer.city && (
                        <p className="text-xs text-white/40">{customer.city}</p>
                      )}
                    </div>
                    {customer.isVip && <span className="text-amber-400">⭐</span>}
                  </button>
                ))}
                {filteredCustomers.length > 10 && (
                  <p className="text-xs text-white/40 text-center pt-2">
                    +{filteredCustomers.length - 10} ακόμα αποτελέσματα
                  </p>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
