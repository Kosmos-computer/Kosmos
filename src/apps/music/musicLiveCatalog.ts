import {
  MUSIC_LIVE_STATION_CATEGORY_LABELS,
  MUSIC_LIVE_STATIONS,
  type MusicLiveStation,
  type MusicLiveStationCategory,
} from "@shared/musicLiveStations";
import { musicLiveStreamPath } from "@shared/mediaPaths";
import { broadcastArtTone } from "./musicBroadcastCatalog";
import type { MusicImageTone } from "./types";

export { MUSIC_LIVE_STATION_CATEGORY_LABELS, MUSIC_LIVE_STATIONS };
export type { MusicLiveStation, MusicLiveStationCategory };

export function liveStationArtTone(label: string): MusicImageTone {
  return broadcastArtTone(label);
}

export function liveStationStreamSrc(stationId: string): string {
  return musicLiveStreamPath(stationId);
}

export function filterLiveStations(
  stations: MusicLiveStation[],
  query: string,
  category: MusicLiveStationCategory | "all",
): MusicLiveStation[] {
  let list = stations;
  if (category !== "all") {
    list = list.filter((station) => station.category === category);
  }

  const needle = query.trim().toLowerCase();
  if (!needle) return list;
  return list.filter(
    (station) =>
      station.label.toLowerCase().includes(needle) ||
      station.publisher.toLowerCase().includes(needle) ||
      station.location.toLowerCase().includes(needle) ||
      station.description.toLowerCase().includes(needle) ||
      MUSIC_LIVE_STATION_CATEGORY_LABELS[station.category].toLowerCase().includes(needle),
  );
}

export function groupedLiveStations(
  stations: MusicLiveStation[],
): Map<MusicLiveStationCategory, MusicLiveStation[]> {
  const grouped = new Map<MusicLiveStationCategory, MusicLiveStation[]>();
  for (const station of stations) {
    const bucket = grouped.get(station.category) ?? [];
    bucket.push(station);
    grouped.set(station.category, bucket);
  }
  return grouped;
}

export const LIVE_STATION_CATEGORIES = (
  Object.entries(MUSIC_LIVE_STATION_CATEGORY_LABELS) as [MusicLiveStationCategory, string][]
).map(([id, label]) => ({ id, label }));
