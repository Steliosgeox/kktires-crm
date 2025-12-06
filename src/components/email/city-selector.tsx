'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Check, X, Search, Users } from 'lucide-react';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassBadge } from '@/components/ui/glass-badge';

interface CityData {
  city: string;
  count: number;
}

interface CitySelectorProps {
  selectedCities: string[];
  onChange: (cities: string[]) => void;
  className?: string;
}

export function CitySelector({ selectedCities, onChange, className }: CitySelectorProps) {
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch cities from the existing API
  const fetchCities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customers/locations');
      if (response.ok) {
        const data = await response.json();
        // Group by city and count
        const cityMap = new Map<string, number>();
        for (const loc of data.locations || []) {
          if (loc.city) {
            cityMap.set(loc.city, (cityMap.get(loc.city) || 0) + 1);
          }
        }
        // Convert to array and sort by count
        const cityArray = Array.from(cityMap.entries())
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count);
        setCities(cityArray);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  const filteredCities = cities.filter((c) =>
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCity = (city: string) => {
    if (selectedCities.includes(city)) {
      onChange(selectedCities.filter((c) => c !== city));
    } else {
      onChange([...selectedCities, city]);
    }
  };

  const selectAll = () => {
    onChange(filteredCities.map((c) => c.city));
  };

  const clearAll = () => {
    onChange([]);
  };

  const totalRecipients = selectedCities.reduce((sum, city) => {
    const cityData = cities.find((c) => c.city === city);
    return sum + (cityData?.count || 0);
  }, 0);

  return (
    <div className={className}>
      {/* Selected cities summary */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Επιλογή Πόλεων</span>
        </div>
        {selectedCities.length > 0 && (
          <div className="flex items-center gap-2">
            <GlassBadge variant="primary" size="sm">
              <Users className="h-3 w-3 mr-1" />
              {totalRecipients} παραλήπτες
            </GlassBadge>
            <button
              onClick={clearAll}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Καθαρισμός
            </button>
          </div>
        )}
      </div>

      {/* Selected cities pills */}
      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedCities.map((city) => {
            const cityData = cities.find((c) => c.city === city);
            return (
              <div
                key={city}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30"
              >
                <span className="text-sm text-cyan-300">{city}</span>
                <span className="text-xs text-cyan-400/60">({cityData?.count || 0})</span>
                <button
                  onClick={() => toggleCity(city)}
                  className="ml-1 text-cyan-400/60 hover:text-cyan-300 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <GlassInput
        placeholder="Αναζήτηση πόλης..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftIcon={<Search className="h-4 w-4" />}
        className="mb-3"
      />

      {/* Quick actions */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={selectAll}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Επιλογή όλων ({filteredCities.length})
        </button>
        <span className="text-white/20">|</span>
        <button
          onClick={() => onChange(cities.slice(0, 5).map((c) => c.city))}
          className="text-xs text-white/60 hover:text-white/80 transition-colors"
        >
          Top 5 πόλεις
        </button>
      </div>

      {/* City list */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.08] bg-white/[0.02]">
        {loading ? (
          <div className="p-4 text-center text-white/40">
            Φόρτωση πόλεων...
          </div>
        ) : filteredCities.length === 0 ? (
          <div className="p-4 text-center text-white/40">
            Δεν βρέθηκαν πόλεις
          </div>
        ) : (
          filteredCities.map((cityData) => {
            const isSelected = selectedCities.includes(cityData.city);
            return (
              <button
                key={cityData.city}
                onClick={() => toggleCity(cityData.city)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors border-b border-white/[0.05] last:border-0 ${
                  isSelected
                    ? 'bg-cyan-500/10 text-white'
                    : 'text-white/70 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      isSelected
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-white/20'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span>{cityData.city}</span>
                </div>
                <span className="text-xs text-white/40">{cityData.count} πελάτες</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

