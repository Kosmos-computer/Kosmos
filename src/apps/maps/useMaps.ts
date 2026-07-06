import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDrivingRoute, geocodePlace, searchPlaces } from "./mapsApi";
import {
  clearMapsHistory,
  readMapsHistory,
  rememberPlaceLookup,
  rememberRouteLookup,
} from "./mapsHistoryStore";
import type { MapHistoryEntry, MapPlace, MapRoute, MapsMode } from "./types";
import { CURRENT_LOCATION_ID, currentLocationPlace } from "./types";

interface UseMapsState {
  mode: MapsMode;
  setMode: (mode: MapsMode) => void;
  query: string;
  setQuery: (value: string) => void;
  results: MapPlace[];
  selectedId: string | null;
  selectPlace: (id: string) => void;
  loading: boolean;
  error: string | null;
  searchInView: boolean;
  setSearchInView: (value: boolean) => void;
  refreshInView: (viewbox: string) => void;
  fromQuery: string;
  setFromQuery: (value: string) => void;
  toQuery: string;
  setToQuery: (value: string) => void;
  useCurrentLocation: boolean;
  setUseCurrentLocation: (value: boolean) => void;
  route: MapRoute | null;
  routeLoading: boolean;
  routeError: string | null;
  getDirections: () => Promise<void>;
  swapEndpoints: () => void;
  directionsToPlace: (place: MapPlace) => Promise<void>;
  clearRoute: () => void;
  history: MapHistoryEntry[];
  activeHistoryId: string | null;
  restoreHistoryEntry: (entry: MapHistoryEntry) => void;
  clearHistory: () => void;
}

function readCurrentLocation(): Promise<MapPlace> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location access is not available in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(currentLocationPlace(pos.coords.latitude, pos.coords.longitude)),
      () => reject(new Error("Could not access your current location")),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  });
}

async function resolveEndpoint(query: string, useCurrent: boolean): Promise<MapPlace> {
  if (useCurrent) return readCurrentLocation();
  const trimmed = query.trim();
  if (!trimmed) throw new Error("Enter a start and destination");
  const place = await geocodePlace(trimmed);
  if (!place) throw new Error(`Could not find "${trimmed}"`);
  return place;
}

/** OpenStreetMap search + OSRM driving directions. */
export function useMaps(): UseMapsState {
  const [mode, setMode] = useState<MapsMode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapPlace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInView, setSearchInView] = useState(false);
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [route, setRoute] = useState<MapRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [history, setHistory] = useState<MapHistoryEntry[]>(() => readMapsHistory());
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewboxRef = useRef<string | undefined>(undefined);
  const resultsRef = useRef<MapPlace[]>([]);
  const queryRef = useRef("");

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const recordPlace = useCallback((place: MapPlace, searchQuery?: string) => {
    setHistory(rememberPlaceLookup(place, searchQuery ?? queryRef.current));
  }, []);

  const recordRoute = useCallback((nextRoute: MapRoute) => {
    setHistory(rememberRouteLookup(nextRoute));
  }, []);

  const runSearch = useCallback(async (q: string, options?: { viewbox?: string; bounded?: boolean }) => {
    if (!q.trim()) {
      setResults([]);
      setSelectedId(null);
      setError(null);
      return;
    }
    if (q.trim().length < 2) {
      setResults([]);
      setSelectedId(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const places = await searchPlaces(q, options);
      setResults(places);
      setSelectedId(places[0]?.id ?? null);
    } catch (err) {
      setResults([]);
      setSelectedId(null);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "search") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query, searchInView && viewboxRef.current ? { viewbox: viewboxRef.current, bounded: true } : undefined);
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch, searchInView, mode]);

  const refreshInView = useCallback(
    (viewbox: string) => {
      viewboxRef.current = viewbox;
      if (mode !== "search" || !searchInView || !query.trim()) return;
      runSearch(query, { viewbox, bounded: true });
    },
    [query, runSearch, searchInView, mode],
  );

  const selectPlace = useCallback(
    (id: string) => {
      setSelectedId(id);
      setActiveHistoryId(null);
      const place = resultsRef.current.find((entry) => entry.id === id);
      if (place) recordPlace(place);
    },
    [recordPlace],
  );

  const restoreHistoryEntry = useCallback((entry: MapHistoryEntry) => {
    setActiveHistoryId(entry.id);
    if (entry.kind === "place" && entry.place) {
      setMode("search");
      setQuery(entry.query ?? entry.place.name);
      setResults([entry.place]);
      setSelectedId(entry.place.id);
      setRoute(null);
      setRouteError(null);
      return;
    }

    if (entry.kind === "route" && entry.route) {
      setMode("directions");
      setRoute(entry.route);
      setRouteError(null);
      setToQuery(entry.route.to.address || entry.route.to.name);
      setUseCurrentLocation(entry.route.from.id === CURRENT_LOCATION_ID);
      setFromQuery(entry.route.from.id === CURRENT_LOCATION_ID ? "" : entry.route.from.address);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory(clearMapsHistory());
    setActiveHistoryId(null);
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setRouteError(null);
  }, []);

  const getDirections = useCallback(async () => {
    setRouteLoading(true);
    setRouteError(null);
    try {
      const [from, to] = await Promise.all([
        resolveEndpoint(fromQuery, useCurrentLocation),
        resolveEndpoint(toQuery, false),
      ]);
      const nextRoute = await fetchDrivingRoute(from, to);
      setRoute(nextRoute);
      setMode("directions");
      recordRoute(nextRoute);
    } catch (err) {
      setRoute(null);
      setRouteError(err instanceof Error ? err.message : "Directions failed");
    } finally {
      setRouteLoading(false);
    }
  }, [fromQuery, toQuery, useCurrentLocation, recordRoute]);

  const swapEndpoints = useCallback(() => {
    if (useCurrentLocation) {
      setUseCurrentLocation(false);
      setFromQuery(toQuery);
      setToQuery("");
      return;
    }
    const nextFrom = toQuery;
    const nextTo = fromQuery;
    setFromQuery(nextFrom);
    setToQuery(nextTo);
  }, [fromQuery, toQuery, useCurrentLocation]);

  const directionsToPlace = useCallback(async (place: MapPlace) => {
    setMode("directions");
    setUseCurrentLocation(true);
    setFromQuery("");
    setToQuery(place.address || place.name);
    setSelectedId(place.id);
    setRouteLoading(true);
    setRouteError(null);
    try {
      const from = await readCurrentLocation();
      const nextRoute = await fetchDrivingRoute(from, place);
      setRoute(nextRoute);
      recordRoute(nextRoute);
      recordPlace(place);
    } catch (err) {
      setRoute(null);
      setRouteError(err instanceof Error ? err.message : "Directions failed");
    } finally {
      setRouteLoading(false);
    }
  }, [recordRoute, recordPlace]);

  return {
    mode,
    setMode,
    query,
    setQuery,
    results,
    selectedId,
    selectPlace,
    loading,
    error,
    searchInView,
    setSearchInView,
    refreshInView,
    fromQuery,
    setFromQuery,
    toQuery,
    setToQuery,
    useCurrentLocation,
    setUseCurrentLocation,
    route,
    routeLoading,
    routeError,
    getDirections,
    swapEndpoints,
    directionsToPlace,
    clearRoute,
    history,
    activeHistoryId,
    restoreHistoryEntry,
    clearHistory,
  };
}

export { CURRENT_LOCATION_ID };
