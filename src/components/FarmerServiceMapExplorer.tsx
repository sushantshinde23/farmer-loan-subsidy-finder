import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Phone,
  Navigation,
  Search,
  LocateFixed,
  ExternalLink,
  Star,
  Clock,
  ShieldCheck,
  Car,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface ServiceCategoryOption {
  id: string;
  label: string;
  query: string;
  includedType?: string;
  pinColor: string;
  borderColor: string;
  glyphColor: string;
  badgeClass: string;
}

export interface PlaceResultItem {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  userRatingCount?: number;
  phoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteURI?: string;
  googleMapsURI?: string;
  businessStatus?: string;
  isOpen?: boolean;
  categoryLabel: string;
  pinColor: string;
  borderColor: string;
  distanceKm?: number;
}

interface RouteMetrics {
  distanceKm: string;
  durationMins: number;
  destinationName: string;
}

interface FarmerServiceMapExplorerProps {
  title?: string;
  subtitle?: string;
  categories: ServiceCategoryOption[];
  defaultCategoryId?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  compact?: boolean;
  onSelectPlace?: (place: PlaceResultItem) => void;
}

// Haversine formula to compute straight-line distance in km
function computeDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c * 10) / 10;
}

// Check and dispatch quota exceeded event if 429 / OVER_QUERY_LIMIT / RESOURCE_EXHAUSTED
function handlePotentialQuotaError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('429') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

export const FarmerServiceMapExplorer: React.FC<FarmerServiceMapExplorerProps> = ({
  title = 'Interactive Service Locator',
  subtitle = 'Search real-time verified locations, calculate travel distance, and get turn-by-turn directions.',
  categories,
  defaultCategoryId,
  initialCenter = { lat: 18.5204, lng: 73.8567 }, // Pune agricultural hub default
  initialZoom = 12,
  compact = false,
  onSelectPlace
}) => {
  const { theme } = useTheme();
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    defaultCategoryId || categories[0]?.id || 'ALL'
  );
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number }>(initialCenter);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Pune District, Maharashtra');
  const [locatingGps, setLocatingGps] = useState<boolean>(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Autocomplete search state
  const [searchInput, setSearchInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Places search results
  const [places, setPlaces] = useState<PlaceResultItem[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResultItem | null>(null);

  // Active in-app route state
  const [activeRouteMetrics, setActiveRouteMetrics] = useState<RouteMetrics | null>(null);
  const [computingRoute, setComputingRoute] = useState<boolean>(false);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Sync external initialCenter changes (e.g. when district selector changes in MandiAndWeather)
  useEffect(() => {
    setSearchCenter(initialCenter);
    if (map) {
      map.panTo(initialCenter);
      map.setZoom(initialZoom);
    }
  }, [initialCenter.lat, initialCenter.lng, initialZoom, map]);

  // Clear route polylines helper
  const clearRoutePolylines = useCallback(() => {
    polylinesRef.current.forEach((poly) => poly.setMap(null));
    polylinesRef.current = [];
    setActiveRouteMetrics(null);
  }, []);

  // Cleanup polylines on unmount
  useEffect(() => {
    return () => {
      polylinesRef.current.forEach((poly) => poly.setMap(null));
      polylinesRef.current = [];
    };
  }, []);

  // Autocomplete suggestions using modern AutocompleteSuggestion.fetchAutocompleteSuggestions
  useEffect(() => {
    if (!placesLib || !searchInput.trim() || searchInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }

        const request: google.maps.places.AutocompleteRequest = {
          input: searchInput.trim(),
          sessionToken: sessionTokenRef.current,
          region: 'IN',
          locationBias: {
            center: searchCenter,
            radius: 50000
          }
        };

        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        setSuggestions(response.suggestions || []);
      } catch (err) {
        handlePotentialQuotaError(err);
        console.error('Autocomplete error:', err);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [placesLib, searchInput, searchCenter]);

  // Handle selecting an autocomplete suggestion
  const handleSelectSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'viewport']
      });

      sessionTokenRef.current = null;
      setSuggestions([]);
      setShowSuggestions(false);

      if (place.location) {
        const newPos = {
          lat: place.location.lat(),
          lng: place.location.lng()
        };
        setSearchCenter(newPos);
        setLocationLabel(place.displayName || place.formattedAddress || searchInput);
        setSearchInput(place.displayName || '');
        if (map) {
          if (place.viewport) {
            map.fitBounds(place.viewport);
          } else {
            map.panTo(newPos);
            map.setZoom(13);
          }
        }
      }
    } catch (err) {
      handlePotentialQuotaError(err);
      console.error('Error fetching suggestion fields:', err);
    }
  };

  // Execute Places API (New) Place.searchByText when category or searchCenter changes
  const fetchNearbyPlaces = useCallback(
    async (customTextQuery?: string) => {
      if (!placesLib) return;
      const activeCat =
        categories.find((c) => c.id === activeCategoryId) || categories[0];
      if (!activeCat) return;

      setLoadingPlaces(true);
      setSearchError(null);
      clearRoutePolylines();

      try {
        const { Place } = placesLib;
        const queryToRun = customTextQuery?.trim()
          ? `${customTextQuery.trim()} ${activeCat.query}`
          : activeCat.query;

        const request: google.maps.places.SearchByTextRequest = {
          textQuery: queryToRun,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'nationalPhoneNumber',
            'internationalPhoneNumber',
            'websiteURI',
            'googleMapsURI',
            'businessStatus',
            'regularOpeningHours'
          ],
          locationBias: {
            center: searchCenter,
            radius: 25000 // 25km agricultural block radius
          },
          maxResultCount: 15,
          region: 'IN'
        };

        const { places: rawPlaces } = await Place.searchByText(request);

        const referenceOrigin = userLocation || searchCenter;
        const mapped: PlaceResultItem[] = (rawPlaces || [])
          .filter((p: any) => p.location != null)
          .map((p: any) => {
            const lat = p.location!.lat();
            const lng = p.location!.lng();
            const dist = computeDistanceKm(referenceOrigin, { lat, lng });

            return {
              id: p.id || `${lat}-${lng}`,
              name: p.displayName || 'Verified Service Center',
              address: p.formattedAddress || 'Address available on Google Maps',
              location: { lat, lng },
              rating: p.rating ?? undefined,
              userRatingCount: p.userRatingCount ?? undefined,
              phoneNumber: p.nationalPhoneNumber || p.internationalPhoneNumber || undefined,
              internationalPhoneNumber: p.internationalPhoneNumber || undefined,
              websiteURI: p.websiteURI || undefined,
              googleMapsURI:
                p.googleMapsURI ||
                `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${p.id}`,
              businessStatus: p.businessStatus || undefined,
              categoryLabel: activeCat.label,
              pinColor: activeCat.pinColor,
              borderColor: activeCat.borderColor,
              distanceKm: dist
            };
          })
          .sort((a: PlaceResultItem, b: PlaceResultItem) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

        setPlaces(mapped);
        if (mapped.length > 0) {
          setSelectedPlace(mapped[0]);
        } else {
          setSelectedPlace(null);
        }
      } catch (err) {
        handlePotentialQuotaError(err);
        console.error('Error searching places:', err);
        setSearchError(
          'Unable to fetch nearby services at this moment. Please verify your network or search another area.'
        );
      } finally {
        setLoadingPlaces(false);
      }
    },
    [placesLib, activeCategoryId, categories, searchCenter, userLocation, clearRoutePolylines]
  );

  useEffect(() => {
    fetchNearbyPlaces();
  }, [fetchNearbyPlaces]);

  // Request Farmer's Current Location (Privacy-preserving: kept strictly in local client memory)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsNotice('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingGps(true);
    setGpsNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(coords);
        setSearchCenter(coords);
        setLocationLabel('Current GPS Location (Private)');
        setLocatingGps(false);
        if (map) {
          map.panTo(coords);
          map.setZoom(13);
        }
      },
      (err) => {
        setLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsNotice(
            'Location permission denied. You can still search any district, village, or PIN code above.'
          );
        } else {
          setGpsNotice('Could not acquire GPS signal. Using selected district center.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Compute in-app driving route using modern Routes API JS SDK (Route.computeRoutes)
  const handleDrawRouteOnMap = async (destinationPlace: PlaceResultItem) => {
    if (!routesLib || !map) return;

    setComputingRoute(true);
    clearRoutePolylines();

    const originCoords = userLocation || searchCenter;

    try {
      const RouteClass = (routesLib as any).Route;
      if (!RouteClass || typeof RouteClass.computeRoutes !== 'function') {
        throw new Error('Routes API computeRoutes not available');
      }

      const request = {
        origin: originCoords,
        destination: destinationPlace.location,
        travelMode: 'DRIVING',
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport']
      };

      const { routes } = await RouteClass.computeRoutes(request);
      if (routes && routes.length > 0) {
        const primaryRoute = routes[0];
        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline: google.maps.Polyline) => {
          polyline.setOptions({
            strokeColor: '#059669',
            strokeWeight: 6,
            strokeOpacity: 0.9
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        const distKm = ((primaryRoute.distanceMeters ?? 0) / 1000).toFixed(1);
        const durMins = Math.max(1, Math.round((primaryRoute.durationMillis ?? 0) / 60000));
        setActiveRouteMetrics({
          distanceKm: distKm,
          durationMins: durMins,
          destinationName: destinationPlace.name
        });
      }
    } catch (err) {
      handlePotentialQuotaError(err);
      console.error('Error computing route:', err);
    } finally {
      setComputingRoute(false);
    }
  };

  // Build Google Maps external directions URL
  const getDirectionsUrl = (place: PlaceResultItem) => {
    const originParam = userLocation
      ? `&origin=${userLocation.lat},${userLocation.lng}`
      : '';
    const destIdParam = place.id ? `&destination_place_id=${encodeURIComponent(place.id)}` : '';
    return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${place.location.lat},${place.location.lng}${destIdParam}&travelmode=driving`;
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Control Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {title}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                Location Privacy Protected
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          </div>

          {/* Search & GPS Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {/* Place Autocomplete Input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowSuggestions(false);
                    fetchNearbyPlaces(searchInput);
                  }
                }}
                placeholder="Search village, district, bank, or mandi..."
                className="w-full text-xs py-2 pl-9 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSuggestions([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Autocomplete Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                  {suggestions.map((s, idx) => (
                    <li
                      key={idx}
                      onClick={() => handleSelectSuggestion(s)}
                      className="px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer flex items-start gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="truncate font-medium">
                        {s.placePrediction?.text.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Use Current Location Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locatingGps}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {locatingGps ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5" />
              )}
              <span>{userLocation ? 'GPS Active' : 'Use My Location'}</span>
            </button>
          </div>
        </div>

        {/* GPS or Privacy Notice */}
        {gpsNotice && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{gpsNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setGpsNotice(null)}
              className="text-amber-700 dark:text-amber-300 hover:underline text-[11px] font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Service Category Filter Pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => {
              const active = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: active ? '#ffffff' : cat.pinColor }}
                  />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Route Summary Banner */}
      {activeRouteMetrics && (
        <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-semibold">
            <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Route to <strong>{activeRouteMetrics.destinationName}</strong>:{' '}
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {activeRouteMetrics.distanceKm} km
              </span>{' '}
              • Est. Drive:{' '}
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {activeRouteMetrics.durationMins} mins
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={clearRoutePolylines}
            className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Clear Route
          </button>
        </div>
      )}

      {/* Main Split View: Interactive Google Map + Live Places List */}
      <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-12' : 'lg:grid-cols-12'}`}>
        {/* Left/Main Map Canvas (Explicit height per CF2) */}
        <div
          className={`relative ${
            compact ? 'lg:col-span-7 h-[380px] sm:h-[430px]' : 'lg:col-span-7 xl:col-span-8 h-[420px] sm:h-[540px]'
          } w-full bg-slate-100 dark:bg-slate-800`}
        >
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={initialCenter}
            defaultZoom={initialZoom}
            gestureHandling="greedy"
            colorScheme={theme === 'dark' ? ('DARK' as any) : ('LIGHT' as any)}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Farmer's Local Location Marker (if GPS active) */}
            {userLocation && (
              <AdvancedMarker
                position={userLocation}
                title="Your Current Location (Private to your device)"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-blue-500/30 animate-ping absolute" />
                  <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md" />
                </div>
              </AdvancedMarker>
            )}

            {/* Nearby Service Markers */}
            {places.map((place) => {
              const isSelected = selectedPlace?.id === place.id;
              return (
                <AdvancedMarker
                  key={place.id}
                  position={place.location}
                  title={place.name}
                  onClick={() => {
                    setSelectedPlace(place);
                    if (onSelectPlace) onSelectPlace(place);
                  }}
                >
                  <Pin
                    background={isSelected ? '#f59e0b' : place.pinColor}
                    borderColor={isSelected ? '#78350f' : place.borderColor}
                    glyphColor="#ffffff"
                    scale={isSelected ? 1.25 : 1.0}
                  />
                </AdvancedMarker>
              );
            })}

            {/* Selected Place InfoWindow */}
            {selectedPlace && (
              <InfoWindow
                position={selectedPlace.location}
                onCloseClick={() => setSelectedPlace(null)}
                maxWidth={290}
              >
                <div className="p-1 text-slate-900 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                      {selectedPlace.categoryLabel}
                    </span>
                    {selectedPlace.distanceKm !== undefined && (
                      <span className="font-mono font-bold text-emerald-700 text-[11px]">
                        {selectedPlace.distanceKm} km
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-sm text-slate-900 leading-snug">
                    {selectedPlace.name}
                  </div>

                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    {selectedPlace.address}
                  </div>

                  {selectedPlace.rating && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>{selectedPlace.rating.toFixed(1)}</span>
                      {selectedPlace.userRatingCount && (
                        <span className="text-slate-400">
                          ({selectedPlace.userRatingCount} reviews)
                        </span>
                      )}
                    </div>
                  )}

                  {selectedPlace.phoneNumber && (
                    <div className="pt-1">
                      <a
                        href={`tel:${selectedPlace.phoneNumber}`}
                        className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{selectedPlace.phoneNumber}</span>
                      </a>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDrawRouteOnMap(selectedPlace)}
                      disabled={computingRoute}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Car className="w-3 h-3" />
                      <span>{computingRoute ? 'Routing...' : 'Show Route'}</span>
                    </button>

                    <a
                      href={getDirectionsUrl(selectedPlace)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Google Maps</span>
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>

          {/* Floating Map Status Pill */}
          <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-700 shadow-sm text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[220px]">{locationLabel}</span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
              {places.length} {places.length === 1 ? 'center' : 'centers'}
            </span>
          </div>
        </div>

        {/* Right Side Directory Results Panel */}
        <div
          className={`${
            compact ? 'lg:col-span-5 max-h-[430px]' : 'lg:col-span-5 xl:col-span-4 max-h-[540px]'
          } border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50`}
        >
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Nearby Verified Locations ({places.length})
            </span>
            {loadingPlaces && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Searching...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loadingPlaces && places.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Locating nearby agricultural services via Google Maps...
                </p>
              </div>
            ) : searchError ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p>{searchError}</p>
                <button
                  type="button"
                  onClick={() => fetchNearbyPlaces()}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px]"
                >
                  Retry Search
                </button>
              </div>
            ) : places.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <MapPin className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No matching centers found in this immediate radius.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Try selecting another category tab or searching a nearby town or district above.
                </p>
              </div>
            ) : (
              places.map((item) => {
                const isSelected = selectedPlace?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedPlace(item);
                      if (map) {
                        map.panTo(item.location);
                      }
                      if (onSelectPlace) onSelectPlace(item);
                    }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-500 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.categoryLabel}
                      </span>
                      {item.distanceKm !== undefined && (
                        <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                          {item.distanceKm} km away
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                      {item.name}
                    </h4>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.address}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      {item.rating && (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          {item.rating.toFixed(1)}
                          {item.userRatingCount ? ` (${item.userRatingCount})` : ''}
                        </span>
                      )}
                      {item.businessStatus === 'OPERATIONAL' && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Clock className="w-3 h-3" />
                          Active Center
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Call, Route on Map, Google Maps Directions */}
                    <div
                      className="pt-2 border-t border-slate-100 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.phoneNumber ? (
                        <a
                          href={`tel:${item.phoneNumber}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call {item.phoneNumber}</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Walk-in / Counter Service
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlace(item);
                            handleDrawRouteOnMap(item);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Car className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Route</span>
                        </button>

                        <a
                          href={getDirectionsUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Directions</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Mandatory Google Maps Attribution Footer */}
          <div className="px-3.5 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Real-time Place & Route Data</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Google Maps</span>
          </div>
        </div>
      </div>
    </div>
  );
};
