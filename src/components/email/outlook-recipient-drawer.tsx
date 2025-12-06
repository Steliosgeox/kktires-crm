'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Search,
  MapPin,
  Tag,
  Users,
  Building2,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface RecipientFilters {
  cities: string[];
  tags: string[];
  segments: string[];
  categories: string[];
}

interface CityData {
  city: string;
  count: number;
}

interface TagData {
  id: string;
  name: string;
  color: string;
}

interface SegmentData {
  id: string;
  name: string;
  customerCount: number;
}

interface OutlookRecipientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: RecipientFilters;
  onFiltersChange: (filters: RecipientFilters) => void;
}

type TabType = 'cities' | 'tags' | 'segments';

export function OutlookRecipientDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
}: OutlookRecipientDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('cities');
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<CityData[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fetch data
  useEffect(() => {
    if (!isOpen) return;

    const abortController = new AbortController();
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const [citiesRes, tagsRes, segmentsRes] = await Promise.all([
          fetch('/api/customers/locations', { signal: abortController.signal }),
          fetch('/api/tags', { signal: abortController.signal }),
          fetch('/api/segments', { signal: abortController.signal }),
        ]);

        if (citiesRes.ok) {
          const data = await citiesRes.json();
          setCities(data.cities?.map((c: { name: string; count: number }) => ({
            city: c.name,
            count: c.count,
          })) || []);
        }

        if (tagsRes.ok) {
          const data = await tagsRes.json();
          setTags(data.tags || []);
        }

        if (segmentsRes.ok) {
          const data = await segmentsRes.json();
          setSegments(data.segments || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching recipient data:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    return () => abortController.abort();
  }, [isOpen]);

  // Calculate recipient count when filters change
  useEffect(() => {
    if (!filters.cities.length && !filters.tags.length && !filters.segments.length) {
      setRecipientCount(null);
      return;
    }

    const abortController = new AbortController();
    
    const fetchCount = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.cities.length) params.set('cities', filters.cities.join(','));
        if (filters.tags.length) params.set('tags', filters.tags.join(','));
        if (filters.segments.length) params.set('segments', filters.segments.join(','));

        const response = await fetch(`/api/recipients/count?${params}`, { 
          signal: abortController.signal 
        });
        if (response.ok) {
          const data = await response.json();
          setRecipientCount(data.count);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching recipient count:', error);
        }
      }
    };

    fetchCount();
    
    return () => abortController.abort();
  }, [filters]);

  const toggleCity = (city: string) => {
    const newCities = filters.cities.includes(city)
      ? filters.cities.filter((c) => c !== city)
      : [...filters.cities, city];
    onFiltersChange({ ...filters, cities: newCities });
  };

  const toggleTag = (tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter((t) => t !== tagId)
      : [...filters.tags, tagId];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const toggleSegment = (segmentId: string) => {
    const newSegments = filters.segments.includes(segmentId)
      ? filters.segments.filter((s) => s !== segmentId)
      : [...filters.segments, segmentId];
    onFiltersChange({ ...filters, segments: newSegments });
  };

  const selectAllCities = () => {
    const allCities = cities.map((c) => c.city);
    onFiltersChange({ ...filters, cities: allCities });
  };

  const clearAllCities = () => {
    onFiltersChange({ ...filters, cities: [] });
  };

  const filteredCities = cities.filter((c) =>
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSegments = segments.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'cities' as TabType, label: 'Πόλεις', icon: MapPin, count: filters.cities.length },
    { id: 'tags' as TabType, label: 'Ετικέτες', icon: Tag, count: filters.tags.length },
    { id: 'segments' as TabType, label: 'Τμήματα', icon: Users, count: filters.segments.length },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm outlook-animate-fade"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full w-96 z-50 flex flex-col outlook-animate-slide-right"
        style={{
          background: 'var(--outlook-bg-panel)',
          boxShadow: 'var(--outlook-shadow-lg)',
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--outlook-border)' }}
        >
          <h3 
            className="text-lg font-semibold"
            style={{ color: 'var(--outlook-text-primary)' }}
          >
            Επιλογή Παραληπτών
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:bg-[var(--outlook-bg-hover)]"
            style={{ color: 'var(--outlook-text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div 
          className="flex border-b"
          style={{ borderColor: 'var(--outlook-border)' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative"
                style={{
                  color: isActive ? 'var(--outlook-accent)' : 'var(--outlook-text-secondary)',
                  background: isActive ? 'var(--outlook-bg-hover)' : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span 
                    className="px-1.5 py-0.5 text-xs rounded-full"
                    style={{
                      background: 'var(--outlook-accent)',
                      color: 'white',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--outlook-accent)' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--outlook-text-tertiary)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-md"
              style={{
                background: 'var(--outlook-bg-surface)',
                border: '1px solid var(--outlook-border)',
                color: 'var(--outlook-text-primary)',
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto outlook-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 
                className="w-6 h-6 animate-spin"
                style={{ color: 'var(--outlook-accent)' }}
              />
            </div>
          ) : (
            <>
              {/* Cities Tab */}
              {activeTab === 'cities' && (
                <div className="p-3 space-y-1">
                  {/* Select All / Clear */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor: 'var(--outlook-border)' }}>
                    <button
                      onClick={selectAllCities}
                      className="text-xs font-medium"
                      style={{ color: 'var(--outlook-accent)' }}
                    >
                      Επιλογή όλων
                    </button>
                    <button
                      onClick={clearAllCities}
                      className="text-xs font-medium"
                      style={{ color: 'var(--outlook-text-tertiary)' }}
                    >
                      Καθαρισμός
                    </button>
                  </div>

                  {filteredCities.length === 0 ? (
                    <div 
                      className="text-center py-8 text-sm"
                      style={{ color: 'var(--outlook-text-tertiary)' }}
                    >
                      Δεν βρέθηκαν πόλεις
                    </div>
                  ) : (
                    filteredCities.map((cityData) => {
                      const isSelected = filters.cities.includes(cityData.city);
                      return (
                        <button
                          key={cityData.city}
                          onClick={() => toggleCity(cityData.city)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all"
                          style={{
                            background: isSelected ? 'var(--outlook-accent-light)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'var(--outlook-bg-hover)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{
                                background: isSelected ? 'var(--outlook-accent)' : 'var(--outlook-bg-surface)',
                                border: isSelected ? 'none' : '1px solid var(--outlook-border)',
                              }}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span 
                              className="text-sm"
                              style={{ color: 'var(--outlook-text-primary)' }}
                            >
                              {cityData.city}
                            </span>
                          </div>
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: 'var(--outlook-bg-hover)',
                              color: 'var(--outlook-text-tertiary)',
                            }}
                          >
                            {cityData.count}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tags Tab */}
              {activeTab === 'tags' && (
                <div className="p-3 space-y-1">
                  {filteredTags.length === 0 ? (
                    <div 
                      className="text-center py-8 text-sm"
                      style={{ color: 'var(--outlook-text-tertiary)' }}
                    >
                      Δεν βρέθηκαν ετικέτες
                    </div>
                  ) : (
                    filteredTags.map((tag) => {
                      const isSelected = filters.tags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all"
                          style={{
                            background: isSelected ? 'var(--outlook-accent-light)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'var(--outlook-bg-hover)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{
                                background: isSelected ? 'var(--outlook-accent)' : 'var(--outlook-bg-surface)',
                                border: isSelected ? 'none' : '1px solid var(--outlook-border)',
                              }}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ background: tag.color }}
                            />
                            <span 
                              className="text-sm"
                              style={{ color: 'var(--outlook-text-primary)' }}
                            >
                              {tag.name}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Segments Tab */}
              {activeTab === 'segments' && (
                <div className="p-3 space-y-1">
                  {filteredSegments.length === 0 ? (
                    <div 
                      className="text-center py-8 text-sm"
                      style={{ color: 'var(--outlook-text-tertiary)' }}
                    >
                      Δεν βρέθηκαν τμήματα
                    </div>
                  ) : (
                    filteredSegments.map((segment) => {
                      const isSelected = filters.segments.includes(segment.id);
                      return (
                        <button
                          key={segment.id}
                          onClick={() => toggleSegment(segment.id)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all"
                          style={{
                            background: isSelected ? 'var(--outlook-accent-light)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'var(--outlook-bg-hover)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{
                                background: isSelected ? 'var(--outlook-accent)' : 'var(--outlook-bg-surface)',
                                border: isSelected ? 'none' : '1px solid var(--outlook-border)',
                              }}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span 
                              className="text-sm"
                              style={{ color: 'var(--outlook-text-primary)' }}
                            >
                              {segment.name}
                            </span>
                          </div>
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: 'var(--outlook-bg-hover)',
                              color: 'var(--outlook-text-tertiary)',
                            }}
                          >
                            {segment.customerCount} πελάτες
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t"
          style={{ borderColor: 'var(--outlook-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span 
              className="text-sm"
              style={{ color: 'var(--outlook-text-secondary)' }}
            >
              Επιλεγμένοι παραλήπτες:
            </span>
            <span 
              className="text-lg font-semibold"
              style={{ color: 'var(--outlook-accent)' }}
            >
              {recipientCount !== null ? recipientCount : '—'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium rounded-md transition-all"
            style={{
              background: 'var(--outlook-accent)',
              color: 'white',
            }}
          >
            Εφαρμογή Επιλογών
          </button>
        </div>
      </div>
    </>
  );
}

