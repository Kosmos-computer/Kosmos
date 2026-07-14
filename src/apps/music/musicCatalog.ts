import type {
  MusicFeaturedCard,
  MusicImageTone,
  MusicLibraryItem,
  MusicMixCard,
  MusicNowPlaying,
  MusicQuickAccess,
  MusicRelatedVideo,
  MusicTrack,
  MusicUser,
} from "./types";
import {
  MUSIC_SEED_ARTIST,
  musicStreamPath,
  type MusicSeedTrack,
} from "@shared/musicSeed";

export const musicUser: MusicUser = {
  name: "Tiru.fm",
};

export interface SeedTrackStatus extends MusicSeedTrack {
  available: boolean;
}

function asImageTone(tone: MusicSeedTrack["artTone"]): MusicImageTone {
  return tone;
}

export function seedTrackToMusicTrack(track: MusicSeedTrack): MusicTrack {
  return {
    id: track.id,
    title: track.title,
    artists: track.artists,
    albumArtTone: asImageTone(track.artTone),
    duration: "0:00",
    previewSrc: musicStreamPath(track.id),
  };
}

export function buildLibraryItems(tracks: SeedTrackStatus[]): MusicLibraryItem[] {
  return tracks.map((track) => ({
    id: track.id,
    title: track.title,
    subtitle: `${track.artists} · ${track.album}`,
    kind: "playlist" as const,
    imageTone: asImageTone(track.artTone),
  }));
}

export function buildQuickAccess(tracks: SeedTrackStatus[]): MusicQuickAccess[] {
  return tracks.slice(0, 4).map((track) => ({
    id: track.id,
    title: track.title,
    imageTone: asImageTone(track.artTone),
  }));
}

export function buildFeatured(track: SeedTrackStatus | undefined): MusicFeaturedCard {
  return {
    id: track?.id ?? "featured",
    sectionTitle: "From your library",
    label: "Your library",
    title: track?.title ?? "No tracks available",
    description: track
      ? `${track.artists} · ${track.album}`
      : "Import MP3s from Downloads, or upload files into your library.",
    imageTone: track ? asImageTone(track.artTone) : "amber",
  };
}

export function buildMixes(tracks: SeedTrackStatus[]): MusicMixCard[] {
  return tracks.slice(0, 4).map((track, index) => ({
    id: track.id,
    number: String(index + 1).padStart(2, "0"),
    title: track.title,
    artists: [track.artists],
    imageTone: asImageTone(track.artTone),
  }));
}

export function buildNowPlaying(
  track: SeedTrackStatus | undefined,
  related: SeedTrackStatus[],
): MusicNowPlaying {
  const musicTrack = track ? seedTrackToMusicTrack(track) : {
    id: "empty",
    title: "No track selected",
    artists: MUSIC_SEED_ARTIST,
    albumArtTone: "amber" as const,
    duration: "0:00",
  };

  return {
    track: musicTrack,
    queueTitle: track?.title,
    progress: 0,
    elapsed: "0:00",
    relatedVideos: related.slice(0, 3).map((entry) => ({
      id: entry.id,
      title: entry.title,
      artists: entry.artists,
      imageTone: asImageTone(entry.artTone),
    })),
  };
}

export function relatedTracksFor(
  tracks: SeedTrackStatus[],
  activeTrackId: string | undefined,
): SeedTrackStatus[] {
  if (!activeTrackId) return tracks.slice(1, 4);
  const others = tracks.filter((track) => track.id !== activeTrackId);
  return others.slice(0, 3);
}

export function filterTracks(tracks: SeedTrackStatus[], query: string): SeedTrackStatus[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return tracks;
  return tracks.filter(
    (track) =>
      track.title.toLowerCase().includes(needle) ||
      track.artists.toLowerCase().includes(needle) ||
      track.album.toLowerCase().includes(needle),
  );
}

export function albumLibraryItems(tracks: SeedTrackStatus[]): MusicLibraryItem[] {
  const albums = new Map<string, SeedTrackStatus[]>();
  for (const track of tracks) {
    const key = `${track.album}::${track.artists}`;
    const list = albums.get(key) ?? [];
    list.push(track);
    albums.set(key, list);
  }

  const albumItems: MusicLibraryItem[] = [...albums.entries()].map(([key, albumTracks], index) => {
    const sample = albumTracks[0];
    return {
      id: `album-${index}-${key.slice(0, 24)}`,
      title: sample.album,
      subtitle: `Album · ${sample.artists} · ${albumTracks.length} tracks`,
      kind: "album" as const,
      imageTone: asImageTone(sample.artTone),
      coverTrackId: sample.id,
    };
  });

  const artists = new Map<string, SeedTrackStatus[]>();
  for (const track of tracks) {
    const list = artists.get(track.artists) ?? [];
    list.push(track);
    artists.set(track.artists, list);
  }
  const artistItems: MusicLibraryItem[] = [...artists.entries()].map(([name, artistTracks], index) => ({
    id: `artist-${index}-${name.slice(0, 24)}`,
    title: name,
    subtitle: `Artist · ${artistTracks.length} tracks`,
    kind: "artist" as const,
    imageTone: asImageTone(artistTracks[0].artTone),
    coverTrackId: artistTracks[0].id,
  }));

  return [...albumItems, ...artistItems, ...buildLibraryItems(tracks)];
}
