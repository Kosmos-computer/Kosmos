import type { MapHistoryEntry, MapPlace, MapRoute } from "./types";
import { CURRENT_LOCATION_ID } from "./types";

const STORAGE_KEY = "arco:maps-history:v1";
const MAX_ENTRIES = 40;

function loadHistory(): MapHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is MapHistoryEntry =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as MapHistoryEntry).id === "string" &&
        typeof (entry as MapHistoryEntry).visitedAt === "number" &&
        ((entry as MapHistoryEntry).kind === "place" || (entry as MapHistoryEntry).kind === "route"),
    );
  } catch {
    return [];
  }
}

function saveHistory(entries: MapHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Quota errors are non-fatal.
  }
}

function entryKey(entry: Pick<MapHistoryEntry, "kind" | "place" | "route">): string {
  if (entry.kind === "place" && entry.place) return `place:${entry.place.id}`;
  if (entry.kind === "route" && entry.route) {
    const { from, to } = entry.route;
    return `route:${from.lat.toFixed(5)},${from.lon.toFixed(5)}:${to.lat.toFixed(5)},${to.lon.toFixed(5)}`;
  }
  return crypto.randomUUID();
}

function upsertEntry(entries: MapHistoryEntry[], next: MapHistoryEntry): MapHistoryEntry[] {
  const key = entryKey(next);
  const filtered = entries.filter((entry) => entryKey(entry) !== key);
  return [next, ...filtered].slice(0, MAX_ENTRIES);
}

export function readMapsHistory(): MapHistoryEntry[] {
  return loadHistory().sort((a, b) => b.visitedAt - a.visitedAt);
}

export function rememberPlaceLookup(place: MapPlace, query?: string): MapHistoryEntry[] {
  if (place.id === CURRENT_LOCATION_ID) return readMapsHistory();
  const next = upsertEntry(loadHistory(), {
    id: crypto.randomUUID(),
    kind: "place",
    visitedAt: Date.now(),
    query: query?.trim() || undefined,
    place,
  });
  saveHistory(next);
  return next;
}

export function rememberRouteLookup(route: MapRoute): MapHistoryEntry[] {
  const next = upsertEntry(loadHistory(), {
    id: crypto.randomUUID(),
    kind: "route",
    visitedAt: Date.now(),
    route,
  });
  saveHistory(next);
  return next;
}

export function clearMapsHistory(): MapHistoryEntry[] {
  saveHistory([]);
  return [];
}

export function formatVisitedAt(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
