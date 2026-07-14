/**
 * Global music playback store — survives window minimize/close so audio keeps
 * playing via the shell-mounted MusicEngine + MusicMiniWidget.
 */
import { create } from "zustand";
import type { MusicFeedSubscription } from "@shared/musicFeeds";
import { seekMusicAudio } from "./musicAudio";
import {
  albumLibraryItems,
  buildFeatured,
  buildMixes,
  buildNowPlaying,
  buildQuickAccess,
  filterTracks,
  relatedTracksFor,
  musicUser,
  type SeedTrackStatus,
} from "./musicCatalog";
import {
  broadcastArtTone,
  filterBroadcastSongs,
  rssToBroadcastSong,
  songsForFeed,
  type RssSongRecord,
} from "./musicBroadcastCatalog";
import {
  liveStationStreamSrc,
  MUSIC_LIVE_STATIONS,
  type MusicLiveStation,
} from "./musicLiveCatalog";
import type {
  MusicBroadcastSong,
  MusicContentFilter,
  MusicLibraryFilter,
  MusicNavSection,
  MusicNowPlaying,
  MusicTrack,
} from "./types";

export function formatMusicTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function parseMusicTime(label: string): number {
  const parts = label.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

function isLibraryFilter(section: MusicNavSection): section is MusicLibraryFilter {
  return section === "playlists" || section === "artists" || section === "albums" || section === "podcasts";
}

async function fetchSeedTracks(): Promise<SeedTrackStatus[]> {
  const res = await fetch("/api/music/tracks");
  if (!res.ok) throw new Error(`Failed to load music seed (${res.status})`);
  return res.json() as Promise<SeedTrackStatus[]>;
}

async function fetchRssFeeds(): Promise<MusicFeedSubscription[]> {
  const res = await fetch("/api/music/rss/feeds");
  if (!res.ok) throw new Error(`Failed to load RSS feeds (${res.status})`);
  return res.json() as Promise<MusicFeedSubscription[]>;
}

async function fetchFeedSongs(feedUrl: string): Promise<RssSongRecord[]> {
  const res = await fetch(`/api/music/rss/feed-songs?url=${encodeURIComponent(feedUrl)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to load feed songs (${res.status})`);
  }
  return res.json() as Promise<RssSongRecord[]>;
}

function broadcastSongToTrack(song: MusicBroadcastSong): MusicTrack {
  return {
    id: song.id,
    title: song.title,
    artists: song.artists,
    albumArtTone: song.artTone,
    duration: song.durationLabel === "—" ? "0:00" : song.durationLabel,
    source: "rss",
    previewSrc: song.previewSrc,
  };
}

function buildLiveNowPlaying(station: MusicLiveStation): MusicNowPlaying {
  return {
    track: {
      id: `live:${station.id}`,
      title: station.label,
      artists: `${station.publisher} · ${station.location}`,
      albumArtTone: broadcastArtTone(station.label),
      duration: "LIVE",
      source: "live",
      live: true,
      previewSrc: liveStationStreamSrc(station.id),
    },
    queueTitle: "Live radio",
    progress: 0,
    elapsed: "LIVE",
    relatedVideos: [],
  };
}

function buildBroadcastNowPlaying(song: MusicBroadcastSong, related: MusicBroadcastSong[]): MusicNowPlaying {
  return {
    track: broadcastSongToTrack(song),
    queueTitle: song.feedLabel,
    progress: 0,
    elapsed: "0:00",
    relatedVideos: related.slice(0, 3).map((entry) => ({
      id: entry.id,
      title: entry.title,
      artists: entry.artists,
      imageTone: entry.artTone,
    })),
  };
}

export interface MusicWidgetPosition {
  x: number;
  y: number;
}

interface MusicStore {
  tracks: SeedTrackStatus[];
  rssFeeds: MusicFeedSubscription[];
  rssSongs: MusicBroadcastSong[];
  rssLoading: boolean;
  rssError: string | null;
  feedsLoading: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  searchQuery: string;
  navSection: MusicNavSection;
  selectedBroadcastFeed: MusicFeedSubscription | null;
  broadcastFeedSongs: MusicBroadcastSong[];
  broadcastFeedLoading: boolean;
  broadcastFeedError: string | null;
  selectedSongId: string | null;
  activeLibraryItemId: string;
  activeTrackId: string | undefined;
  playbackQueue: string[];
  libraryFilter: MusicLibraryFilter;
  contentFilter: MusicContentFilter;
  playing: boolean;
  nowPlaying: MusicNowPlaying;
  widgetVisible: boolean;
  widgetCollapsed: boolean;
  widgetPosition: MusicWidgetPosition;

  init: () => void;
  refreshLibrary: () => Promise<void>;
  importFromTorrents: () => Promise<{ imported: number; scanned: number }>;
  uploadTracks: (files: FileList | File[]) => Promise<number>;
  refreshRss: () => Promise<void>;
  seedAudioBroadcasts: () => Promise<void>;
  addRssFeed: (url: string) => Promise<void>;
  removeRssFeed: (feedId: string) => Promise<void>;
  setNavSection: (section: MusicNavSection) => void;
  openBroadcastFeed: (feed: MusicFeedSubscription) => Promise<void>;
  closeBroadcastFeed: () => void;
  openSongDetail: (songId: string) => void;
  closeSongDetail: () => void;
  setSearchQuery: (value: string) => void;
  setActiveLibraryItemId: (id: string) => void;
  setLibraryFilter: (filter: MusicLibraryFilter) => void;
  setContentFilter: (filter: MusicContentFilter) => void;
  setPlaying: (playing: boolean) => void;
  playTrack: (trackId: string, autoplay?: boolean) => void;
  playLiveStation: (stationId: string, autoplay?: boolean) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setPlaybackProgress: (progress: number, elapsed: string, duration?: string) => void;
  seekPlayback: (progress: number) => void;
  stopPlayback: () => void;
  showWidget: () => void;
  hideWidget: () => void;
  toggleWidgetCollapsed: () => void;
  setWidgetPosition: (position: MusicWidgetPosition) => void;
  minimizeToWidget: () => void;
  restoreMusicWindow: () => void;
}

function defaultWidgetPosition(): MusicWidgetPosition {
  if (typeof window === "undefined") return { x: 24, y: 80 };
  return { x: 24, y: window.innerHeight - 120 };
}

function loadWidgetPosition(): MusicWidgetPosition {
  try {
    const raw = localStorage.getItem("arco:music-widget-pos");
    if (!raw) return defaultWidgetPosition();
    const parsed = JSON.parse(raw) as MusicWidgetPosition;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
  } catch {
    // ignore
  }
  return defaultWidgetPosition();
}

function persistWidgetPosition(position: MusicWidgetPosition) {
  try {
    localStorage.setItem("arco:music-widget-pos", JSON.stringify(position));
  } catch {
    // ignore
  }
}

function playbackQueueFor(state: Pick<MusicStore, "tracks" | "rssSongs" | "selectedBroadcastFeed">, trackId: string): string[] {
  const song = state.rssSongs.find((entry) => entry.id === trackId);
  if (song) {
    const feedSongs = songsForFeed(state.rssSongs, song.feedUrl);
    if (feedSongs.length > 0) return feedSongs.map((entry) => entry.id);
  }
  if (state.selectedBroadcastFeed) {
    const feedSongs = songsForFeed(state.rssSongs, state.selectedBroadcastFeed.url);
    if (feedSongs.length > 0) return feedSongs.map((entry) => entry.id);
  }
  return state.tracks.map((track) => track.id);
}

let initPromise: Promise<void> | null = null;

export const useMusicStore = create<MusicStore>((set, get) => ({
  tracks: [],
  rssFeeds: [],
  rssSongs: [],
  rssLoading: false,
  rssError: null,
  feedsLoading: false,
  loading: false,
  error: null,
  initialized: false,
  searchQuery: "",
  navSection: "home",
  selectedBroadcastFeed: null,
  broadcastFeedSongs: [],
  broadcastFeedLoading: false,
  broadcastFeedError: null,
  selectedSongId: null,
  activeLibraryItemId: "",
  activeTrackId: undefined,
  playbackQueue: [],
  libraryFilter: "playlists",
  contentFilter: "all",
  playing: false,
  nowPlaying: buildNowPlaying(undefined, []),
  widgetVisible: false,
  widgetCollapsed: false,
  widgetPosition: loadWidgetPosition(),

  init: () => {
    if (initPromise) return;
    initPromise = (async () => {
      set({ loading: true, error: null, rssLoading: true, rssError: null });
      try {
        const [seedTracks, rssFeeds] = await Promise.all([
          fetchSeedTracks(),
          fetchRssFeeds().catch(() => [] as MusicFeedSubscription[]),
        ]);
        const available = seedTracks.filter((track) => track.available);
        const first = available[0];
        set({
          tracks: available,
          rssFeeds,
          rssSongs: [],
          activeLibraryItemId: first?.id ?? "album-tirufm",
          activeTrackId: first?.id,
          playbackQueue: available.map((track) => track.id),
          nowPlaying: buildNowPlaying(first, relatedTracksFor(available, first?.id)),
          loading: false,
          rssLoading: false,
          initialized: true,
        });
      } catch (err: unknown) {
        set({
          error: err instanceof Error ? err.message : "Failed to load music library",
          loading: false,
          rssLoading: false,
          initialized: true,
        });
      }
    })();
  },

  refreshLibrary: async () => {
    try {
      const seedTracks = await fetchSeedTracks();
      const available = seedTracks.filter((track) => track.available);
      const { activeTrackId, playing, nowPlaying, initialized } = get();
      const stillActive = available.find((track) => track.id === activeTrackId);
      const nextActive = stillActive ?? available[0];
      set({
        tracks: available,
        error: null,
        loading: false,
        initialized: true,
        playbackQueue: available.map((track) => track.id),
        activeTrackId: nextActive?.id,
        // Keep the current now-playing card if audio is already going; otherwise
        // surface the newest library track so imports are obvious immediately.
        nowPlaying:
          playing && stillActive
            ? nowPlaying
            : buildNowPlaying(nextActive, relatedTracksFor(available, nextActive?.id)),
        ...(initialized ? {} : { activeLibraryItemId: nextActive?.id ?? "album-tirufm" }),
      });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to refresh music library",
        loading: false,
      });
    }
  },

  importFromTorrents: async () => {
    const res = await fetch("/api/music/tracks/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "torrents" }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Failed to import from downloads (${res.status})`);
    }
    const result = (await res.json()) as { imported: unknown[]; scanned: number };
    await get().refreshLibrary();
    return { imported: result.imported.length, scanned: result.scanned };
  },

  uploadTracks: async (files) => {
    const list = Array.from(files);
    let imported = 0;
    for (const file of list) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/music/tracks/upload", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to upload ${file.name}`);
      }
      imported += 1;
    }
    await get().refreshLibrary();
    return imported;
  },

  refreshRss: async () => {
    set({ rssLoading: true, rssError: null });
    try {
      const rssFeeds = await fetchRssFeeds();
      const { selectedBroadcastFeed } = get();
      set({
        rssFeeds,
        broadcastFeedSongs: selectedBroadcastFeed
          ? songsForFeed(get().rssSongs, selectedBroadcastFeed.url)
          : get().broadcastFeedSongs,
        rssLoading: false,
      });
    } catch (err: unknown) {
      set({
        rssError: err instanceof Error ? err.message : "Failed to refresh broadcasts",
        rssLoading: false,
      });
    }
  },

  seedAudioBroadcasts: async () => {
    set({ feedsLoading: true, rssError: null });
    try {
      const res = await fetch("/api/music/rss/seed-audio", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to add playable feeds (${res.status})`);
      }
      await get().refreshRss();
    } finally {
      set({ feedsLoading: false });
    }
  },

  addRssFeed: async (url) => {
    set({ feedsLoading: true, rssError: null });
    try {
      const res = await fetch("/api/music/rss/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to add feed (${res.status})`);
      }
      await get().refreshRss();
    } finally {
      set({ feedsLoading: false });
    }
  },

  removeRssFeed: async (feedId) => {
    set({ feedsLoading: true, rssError: null });
    try {
      const res = await fetch(`/api/music/rss/feeds/${encodeURIComponent(feedId)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to remove feed (${res.status})`);
      }
      await get().refreshRss();
    } finally {
      set({ feedsLoading: false });
    }
  },

  setNavSection: (section) => {
    set({
      navSection: section,
      libraryFilter: isLibraryFilter(section) ? section : get().libraryFilter,
      selectedBroadcastFeed: null,
      broadcastFeedSongs: [],
      broadcastFeedError: null,
      selectedSongId: null,
    });
  },

  openBroadcastFeed: async (feed) => {
    set({
      navSection: "broadcasts",
      selectedBroadcastFeed: feed,
      broadcastFeedSongs: songsForFeed(get().rssSongs, feed.url),
      broadcastFeedLoading: true,
      broadcastFeedError: null,
      selectedSongId: null,
    });

    try {
      const records = await fetchFeedSongs(feed.url);
      const songs = records.map(rssToBroadcastSong);
      set((state) => ({
        broadcastFeedSongs: songs,
        broadcastFeedLoading: false,
        rssSongs: [
          ...state.rssSongs.filter((song) => song.feedUrl !== feed.url),
          ...songs,
        ],
      }));
    } catch (err: unknown) {
      set({
        broadcastFeedError: err instanceof Error ? err.message : "Failed to load feed songs",
        broadcastFeedLoading: false,
      });
    }
  },

  closeBroadcastFeed: () => {
    set({
      selectedBroadcastFeed: null,
      broadcastFeedSongs: [],
      broadcastFeedError: null,
      selectedSongId: null,
    });
  },

  openSongDetail: (songId) => {
    set({ selectedSongId: songId });
  },

  closeSongDetail: () => {
    set({ selectedSongId: null });
  },

  setSearchQuery: (value) => set({ searchQuery: value }),

  setActiveLibraryItemId: (id) => {
    const section = get().navSection;
    set({
      navSection: isLibraryFilter(section) ? section : "home",
      selectedBroadcastFeed: null,
      selectedSongId: null,
      activeLibraryItemId: id,
    });
    if (id !== "album-tirufm" && id !== "artist-tirufm") get().playTrack(id);
  },

  setLibraryFilter: (filter) =>
    set({
      libraryFilter: filter,
      navSection: filter,
      selectedBroadcastFeed: null,
      broadcastFeedSongs: [],
      broadcastFeedError: null,
      selectedSongId: null,
    }),
  setContentFilter: (filter) => set({ contentFilter: filter }),
  setPlaying: (playing) => set({ playing }),

  playTrack: (trackId, autoplay = true) => {
    const state = get();
    const local = state.tracks.find((entry) => entry.id === trackId);
    if (local) {
      set({
        activeTrackId: trackId,
        activeLibraryItemId: trackId,
        playbackQueue: playbackQueueFor(state, trackId),
        nowPlaying: buildNowPlaying(local, relatedTracksFor(state.tracks, trackId)),
        playing: autoplay,
      });
      return;
    }

    const song = state.rssSongs.find((entry) => entry.id === trackId);
    if (!song) return;

    const feedSongs = songsForFeed(state.rssSongs, song.feedUrl);
    const others = feedSongs.filter((entry) => entry.id !== trackId);
    set({
      activeTrackId: trackId,
      playbackQueue: playbackQueueFor(state, trackId),
      nowPlaying: buildBroadcastNowPlaying(song, others),
      playing: autoplay,
    });
  },

  playLiveStation: (stationId, autoplay = true) => {
    const station = MUSIC_LIVE_STATIONS.find((entry) => entry.id === stationId);
    if (!station) return;

    set({
      activeTrackId: `live:${station.id}`,
      selectedBroadcastFeed: null,
      selectedSongId: null,
      playbackQueue: [],
      nowPlaying: buildLiveNowPlaying(station),
      playing: autoplay,
    });
  },

  togglePlay: () => {
    const { activeTrackId, tracks, rssSongs, playing, playTrack } = get();
    if (!activeTrackId) {
      if (tracks[0]) playTrack(tracks[0].id);
      else if (rssSongs[0]) playTrack(rssSongs[0].id);
      return;
    }
    set({ playing: !playing });
  },

  playNext: () => {
    const { activeTrackId, playbackQueue, playTrack, nowPlaying } = get();
    if (nowPlaying.track.live) return;
    if (!activeTrackId || playbackQueue.length === 0) return;
    const index = playbackQueue.findIndex((id) => id === activeTrackId);
    const next = playbackQueue[(index + 1) % playbackQueue.length];
    if (next) playTrack(next);
  },

  playPrevious: () => {
    const { activeTrackId, playbackQueue, playTrack, nowPlaying } = get();
    if (nowPlaying.track.live) return;
    if (!activeTrackId || playbackQueue.length === 0) return;
    const index = playbackQueue.findIndex((id) => id === activeTrackId);
    const prev = playbackQueue[(index - 1 + playbackQueue.length) % playbackQueue.length];
    if (prev) playTrack(prev);
  },

  setPlaybackProgress: (progress, elapsed, duration) => {
    set((state) => ({
      nowPlaying: {
        ...state.nowPlaying,
        progress,
        elapsed,
        track: duration ? { ...state.nowPlaying.track, duration } : state.nowPlaying.track,
      },
    }));
  },

  seekPlayback: (progress) => {
    if (get().nowPlaying.track.live) return;
    const clamped = Math.min(100, Math.max(0, progress));
    const durationSeconds = parseMusicTime(get().nowPlaying.track.duration);
    const elapsedSeconds = durationSeconds > 0 ? (clamped / 100) * durationSeconds : 0;

    set((state) => ({
      nowPlaying: {
        ...state.nowPlaying,
        progress: clamped,
        elapsed: formatMusicTime(elapsedSeconds),
      },
    }));

    seekMusicAudio(clamped);
  },

  stopPlayback: () => set({ playing: false }),

  showWidget: () => set({ widgetVisible: true, widgetCollapsed: false }),

  hideWidget: () => set({ widgetVisible: false }),

  toggleWidgetCollapsed: () => set((state) => ({ widgetCollapsed: !state.widgetCollapsed })),

  setWidgetPosition: (position) => {
    persistWidgetPosition(position);
    set({ widgetPosition: position });
  },

  restoreMusicWindow: () => {
    const { hideWidget } = get();
    hideWidget();
    import("../../os/windowStore").then(({ useWindowStore }) => {
      const { open, focus, windows } = useWindowStore.getState();
      const musicId = "system:music";
      const existing = windows.find((w) => w.id === musicId);
      if (existing?.minimized) {
        useWindowStore.getState().toggleMinimize(musicId);
      }
      if (existing) {
        focus(musicId);
      } else {
        open({ type: "system", app: "music" }, "Music");
      }
    });
  },

  minimizeToWidget: () => {
    get().showWidget();
    import("../../os/windowStore").then(({ useWindowStore }) => {
      const { windows, toggleMinimize } = useWindowStore.getState();
      const musicId = "system:music";
      const existing = windows.find((w) => w.id === musicId);
      if (existing && !existing.minimized) {
        toggleMinimize(musicId);
      }
    });
  },
}));

/** Derived selectors for the Music app view model. */
export function useMusicViewModel() {
  const store = useMusicStore();
  const visibleTracks = filterTracks(store.tracks, store.searchQuery);
  const activeTrack = store.tracks.find((track) => track.id === store.activeTrackId);
  const visibleBroadcastSongs = filterBroadcastSongs(store.rssSongs, store.searchQuery);
  const activeBroadcastSong =
    store.rssSongs.find((song) => song.id === store.selectedSongId) ??
    store.rssSongs.find((song) => song.id === store.activeTrackId);

  return {
    user: musicUser,
    tracks: store.tracks,
    visibleTracks,
    libraryItems: albumLibraryItems(visibleTracks),
    rssFeeds: store.rssFeeds,
    rssSongs: visibleBroadcastSongs,
    rssLoading: store.rssLoading,
    rssError: store.rssError,
    feedsLoading: store.feedsLoading,
    refreshRss: store.refreshRss,
    seedAudioBroadcasts: store.seedAudioBroadcasts,
    addRssFeed: store.addRssFeed,
    removeRssFeed: store.removeRssFeed,
    refreshLibrary: store.refreshLibrary,
    importFromTorrents: store.importFromTorrents,
    uploadTracks: store.uploadTracks,
    navSection: store.navSection,
    setNavSection: store.setNavSection,
    selectedBroadcastFeed: store.selectedBroadcastFeed,
    broadcastFeedSongs: store.broadcastFeedSongs,
    broadcastFeedLoading: store.broadcastFeedLoading,
    broadcastFeedError: store.broadcastFeedError,
    openBroadcastFeed: store.openBroadcastFeed,
    closeBroadcastFeed: store.closeBroadcastFeed,
    selectedSongId: store.selectedSongId,
    activeBroadcastSong,
    openSongDetail: store.openSongDetail,
    closeSongDetail: store.closeSongDetail,
    quickAccess: buildQuickAccess(visibleTracks),
    featured: buildFeatured(activeTrack ?? visibleTracks[0]),
    mixes: buildMixes(visibleTracks),
    nowPlaying: store.nowPlaying,
    loading: store.loading,
    error: store.error,
    searchQuery: store.searchQuery,
    setSearchQuery: store.setSearchQuery,
    activeLibraryItemId: store.activeLibraryItemId,
    setActiveLibraryItemId: store.setActiveLibraryItemId,
    libraryFilter: store.libraryFilter,
    setLibraryFilter: store.setLibraryFilter,
    contentFilter: store.contentFilter,
    setContentFilter: store.setContentFilter,
    playing: store.playing,
    setPlaying: store.setPlaying,
    togglePlay: store.togglePlay,
    playTrack: store.playTrack,
    playLiveStation: store.playLiveStation,
    liveStations: MUSIC_LIVE_STATIONS,
    playNext: store.playNext,
    playPrevious: store.playPrevious,
    setPlaybackProgress: store.setPlaybackProgress,
    seekPlayback: store.seekPlayback,
    stopPlayback: store.stopPlayback,
    showWidget: store.showWidget,
    restoreMusicWindow: store.restoreMusicWindow,
    minimizeToWidget: store.minimizeToWidget,
    activeTrackId: store.activeTrackId,
  };
}

export type MusicViewModel = ReturnType<typeof useMusicViewModel>;
