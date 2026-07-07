import {
  MUSIC_LIVE_STATIONS,
  type MusicLiveStation,
} from "../../shared/musicLiveStations.js";

export function listMusicLiveStations(): MusicLiveStation[] {
  return MUSIC_LIVE_STATIONS;
}

export function resolveMusicLiveStation(id: string): MusicLiveStation | undefined {
  return MUSIC_LIVE_STATIONS.find((station) => station.id === id);
}

export async function proxyMusicLiveStream(
  id: string,
): Promise<{ body: ReadableStream<Uint8Array>; headers: Record<string, string> } | null> {
  const station = resolveMusicLiveStation(id);
  if (!station) return null;

  const response = await fetch(station.streamUrl, {
    headers: {
      Accept: "audio/*,*/*",
      "User-Agent": "Arco-Music/1.0",
    },
  });

  if (!response.ok || !response.body) return null;

  const headers: Record<string, string> = {
    "Cache-Control": "no-cache, no-store",
  };

  const contentType = response.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  else headers["Content-Type"] = "audio/mpeg";

  return { body: response.body, headers };
}
