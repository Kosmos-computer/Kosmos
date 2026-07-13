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
  MUSIC_SEED_ALBUM,
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
    label: "Local seed album",
    title: track?.title ?? "No tracks available",
    description: track
      ? `${track.artists} · ${track.album} — imported from your tirufm folder.`
      : "Set MUSIC_SEED_DIR or add MP3s to the default Music folder.",
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
  const artistTone = tracks[0] ? asImageTone(tracks[0].artTone) : "violet";
  return [
    {
      id: "album-tirufm",
      title: MUSIC_SEED_ALBUM,
      subtitle: `Album · ${MUSIC_SEED_ARTIST} · ${tracks.length} tracks`,
      kind: "album",
      imageTone: artistTone,
      coverTrackId: tracks[0]?.id,
    },
    {
      id: "artist-tirufm",
      title: MUSIC_SEED_ARTIST,
      subtitle: `Artist · ${tracks.length} tracks`,
      kind: "artist",
      imageTone: artistTone,
      coverTrackId: tracks[0]?.id,
    },
    ...buildLibraryItems(tracks),
  ];
}
