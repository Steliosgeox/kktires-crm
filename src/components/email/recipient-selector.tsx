'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Tag, FolderKanban, MapPin, Filter, Check, X, ChevronDown, Search } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/glass-tabs';

interface RecipientFilters {
  cities: string[];
  tags: string[];
  segments: string[];
  categories: string[];
}

interface RecipientSelectorProps {
  filters: RecipientFilters;
  onChange: (filters: RecipientFilters) => void;
  onPreview?: () => void;
}

interface TagData {
  id: string;
  name: string;
  color: string;
  count?: number;
}

interface SegmentData {
  id: string;
  name: string;
  customerCount: number;
}

interface CityData {
  city: string;
  count: number;
}

export function RecipientSelector({ filters, onChange, onPreview }: RecipientSelectorProps) {
  const [cities, setCities] = useState<CityData[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [searchQueries, setSearchQueries] = useState({
    cities: '',
    tags: '',
    segments: '',
  });

  // Fetch all filter options - with abort controller to prevent memory leaks
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2e146d35-fb58-447a-b3a0-2eabdca19cf2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recipient-selector.tsx:useEffect',message:'useEffect triggered',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    const fetchData = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2e146d35-fb58-447a-b3a0-2eabdca19cf2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recipient-selector.tsx:fetchData',message:'fetchData started',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      setLoading(true);
      try {
        const [locationsRes, tagsRes, segmentsRes] = await Promise.all([
          fetch('/api/customers/locations', { signal: abortController.signal }),
          fetch('/api/tags', { signal: abortController.signal }),
          fetch('/api/segments', { signal: abortController.signal }),
        ]);

        // Don't update state if component unmounted
        if (!isMounted) return;

        if (locationsRes.ok) {
          const data = await locationsRes.json();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2e146d35-fb58-447a-b3a0-2eabdca19cf2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recipient-selector.tsx:locationsRes',message:'Locations API response',data:{hasLocations:!!data.locations,hasCities:!!data.cities,dataKeys:Object.keys(data),citiesLength:data.cities?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3',runId:'post-fix'})}).catch(()=>{});
          // #endregion
          // FIX: API returns 'cities' array directly, not 'locations' with city property
          const cityArray = (data.cities || []).map((c: { name: string; count: number }) => ({
            city: c.name,
            count: c.count,
          }));
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2e146d35-fb58-447a-b3a0-2eabdca19cf2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recipient-selector.tsx:setCities',message:'Setting cities',data:{cityArrayLength:cityArray.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
          // #endregion
          if (isMounted) setCities(cityArray);
        }

        if (tagsRes.ok) {
          const data = await tagsRes.json();
          if (isMounted) setTags(data.tags || []);
        }

        if (segmentsRes.ok) {
          const data = await segmentsRes.json();
          if (isMounted) setSegments(data.segments || []);
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') return;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2e146d35-fb58-447a-b3a0-2eabdca19cf2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recipient-selector.tsx:catch',message:'Fetch error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        console.error('Error fetching filter options:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    
    // Cleanup on unmount - cancel pending requests
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Calculate recipient count when filters change - with cleanup
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2e146d35-fb58-447a-b3a0-2eabdca19cf2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recipient-selector.tsx:recipientCount-useEffect',message:'Recipient count effect triggered',data:{filtersCities:filters.cities.length,filtersTags:filters.tags.length,filtersSegments:filters.segments.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    
    const calculateRecipients = async () => {
      // If no filters, show total with email
      if (!filters.cities.length && !filters.tags.length && !filters.segments.length) {
        if (isMounted) setRecipientCount(null);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (filters.cities.length) params.set('cities', filters.cities.join(','));
        if (filters.tags.length) params.set('tags', filters.tags.join(','));
        if (filters.segments.length) params.set('segments', filters.segments.join(','));

        const response = await fetch(`/api/recipients/count?${params}`, { signal: abortController.signal });
        if (response.ok && isMounted) {
          const data = await response.json();
          setRecipientCount(data.count);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error calculating recipients:', error);
      }
    };

    calculateRecipients();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [filters]);

  const toggleCity = (city: string) => {
    const newCities = filters.cities.includes(city)
      ? filters.cities.filter((c) => c !== city)
      : [...filters.cities, city];
    onChange({ ...filters, cities: newCities });
  };

  const toggleTag = (tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter((t) => t !== tagId)
      : [...filters.tags, tagId];
    onChange({ ...filters, tags: newTags });
  };

  const toggleSegment = (segmentId: string) => {
    const newSegments = filters.segments.includes(segmentId)
      ? filters.segments.filter((s) => s !== segmentId)
      : [...filters.segments, segmentId];
    onChange({ ...filters, segments: newSegments });
  };

  const clearAllFilters = () => {
    onChange({ cities: [], tags: [], segments: [], categories: [] });
  };

  const totalFilters = filters.cities.length + filters.tags.length + filters.segments.length;

  const filteredCities = cities.filter((c) =>
    c.city.toLowerCase().includes(searchQueries.cities.toLowerCase())
  );

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(searchQueries.tags.toLowerCase())
  );

  const filteredSegments = segments.filter((s) =>
    s.name.toLowerCase().includes(searchQueries.segments.toLowerCase())
  );

  return (
    <GlassCard className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          <h3 className="font-medium text-white">Επιλογή Παραληπτών</h3>
        </div>
        <div className="flex items-center gap-3">
          {totalFilters > 0 && (
            <>
              <GlassBadge variant="primary">
                {recipientCount !== null ? `${recipientCount} παραλήπτες` : 'Υπολογισμός...'}
              </GlassBadge>
              <button
                onClick={clearAllFilters}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Καθαρισμός όλων
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active filters summary */}
      {totalFilters > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/[0.08]">
          {filters.cities.map((city) => (
            <div
              key={`city-${city}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30"
            >
              <MapPin className="h-3 w-3 text-emerald-400" />
              <span className="text-sm text-emerald-300">{city}</span>
              <button
                onClick={() => toggleCity(city)}
                className="ml-1 text-emerald-400/60 hover:text-emerald-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {filters.tags.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            return (
              <div
                key={`tag-${tagId}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-500/20 border border-violet-500/30"
              >
                <Tag className="h-3 w-3 text-violet-400" />
                <span className="text-sm text-violet-300">{tag?.name || tagId}</span>
                <button
                  onClick={() => toggleTag(tagId)}
                  className="ml-1 text-violet-400/60 hover:text-violet-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {filters.segments.map((segmentId) => {
            const segment = segments.find((s) => s.id === segmentId);
            return (
              <div
                key={`segment-${segmentId}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30"
              >
                <FolderKanban className="h-3 w-3 text-amber-400" />
                <span className="text-sm text-amber-300">{segment?.name || segmentId}</span>
                <button
                  onClick={() => toggleSegment(segmentId)}
                  className="ml-1 text-amber-400/60 hover:text-amber-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter tabs */}
      <GlassTabs defaultValue="cities">
        <GlassTabsList className="mb-4">
          <GlassTabsTrigger value="cities">
            <MapPin className="h-4 w-4 mr-2" />
            Πόλεις ({cities.length})
          </GlassTabsTrigger>
          <GlassTabsTrigger value="tags">
            <Tag className="h-4 w-4 mr-2" />
            Ετικέτες ({tags.length})
          </GlassTabsTrigger>
          <GlassTabsTrigger value="segments">
            <FolderKanban className="h-4 w-4 mr-2" />
            Τμήματα ({segments.length})
          </GlassTabsTrigger>
        </GlassTabsList>

        {/* Cities Tab */}
        <GlassTabsContent value="cities">
          <GlassInput
            placeholder="Αναζήτηση πόλης..."
            value={searchQueries.cities}
            onChange={(e) => setSearchQueries({ ...searchQueries, cities: e.target.value })}
            leftIcon={<Search className="h-4 w-4" />}
            className="mb-3"
          />
          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.08]">
            {loading ? (
              <div className="p-4 text-center text-white/40">Φόρτωση...</div>
            ) : filteredCities.length === 0 ? (
              <div className="p-4 text-center text-white/40">Δεν βρέθηκαν πόλεις</div>
            ) : (
              filteredCities.map((cityData) => {
                const isSelected = filters.cities.includes(cityData.city);
                return (
                  <button
                    key={cityData.city}
                    onClick={() => toggleCity(cityData.city)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors border-b border-white/[0.05] last:border-0 ${
                      isSelected ? 'bg-emerald-500/10 text-white' : 'text-white/70 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span>{cityData.city}</span>
                    </div>
                    <span className="text-xs text-white/40">{cityData.count}</span>
                  </button>
                );
              })
            )}
          </div>
        </GlassTabsContent>

        {/* Tags Tab */}
        <GlassTabsContent value="tags">
          <GlassInput
            placeholder="Αναζήτηση ετικέτας..."
            value={searchQueries.tags}
            onChange={(e) => setSearchQueries({ ...searchQueries, tags: e.target.value })}
            leftIcon={<Search className="h-4 w-4" />}
            className="mb-3"
          />
          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.08]">
            {loading ? (
              <div className="p-4 text-center text-white/40">Φόρτωση...</div>
            ) : filteredTags.length === 0 ? (
              <div className="p-4 text-center text-white/40">Δεν βρέθηκαν ετικέτες</div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = filters.tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors border-b border-white/[0.05] last:border-0 ${
                      isSelected ? 'bg-violet-500/10 text-white' : 'text-white/70 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-violet-500 border-violet-500' : 'border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </div>
                    {tag.count !== undefined && (
                      <span className="text-xs text-white/40">{tag.count}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </GlassTabsContent>

        {/* Segments Tab */}
        <GlassTabsContent value="segments">
          <GlassInput
            placeholder="Αναζήτηση τμήματος..."
            value={searchQueries.segments}
            onChange={(e) => setSearchQueries({ ...searchQueries, segments: e.target.value })}
            leftIcon={<Search className="h-4 w-4" />}
            className="mb-3"
          />
          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.08]">
            {loading ? (
              <div className="p-4 text-center text-white/40">Φόρτωση...</div>
            ) : filteredSegments.length === 0 ? (
              <div className="p-4 text-center text-white/40">Δεν βρέθηκαν τμήματα</div>
            ) : (
              filteredSegments.map((segment) => {
                const isSelected = filters.segments.includes(segment.id);
                return (
                  <button
                    key={segment.id}
                    onClick={() => toggleSegment(segment.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors border-b border-white/[0.05] last:border-0 ${
                      isSelected ? 'bg-amber-500/10 text-white' : 'text-white/70 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-amber-500 border-amber-500' : 'border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span>{segment.name}</span>
                    </div>
                    <span className="text-xs text-white/40">{segment.customerCount} πελάτες</span>
                  </button>
                );
              })
            )}
          </div>
        </GlassTabsContent>
      </GlassTabs>

      {/* Preview button */}
      {onPreview && totalFilters > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.08]">
          <GlassButton onClick={onPreview} variant="default" className="w-full">
            <Users className="h-4 w-4 mr-2" />
            Προεπισκόπηση παραληπτών
          </GlassButton>
        </div>
      )}
    </GlassCard>
  );
}

