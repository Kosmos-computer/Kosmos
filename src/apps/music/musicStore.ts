/**
 * Global music playback store — survives window minimize/close so audio keeps
 * playing via the shell-mounted MusicEngine + MusicMiniWidget.
 */
import { create } from "zustand";
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
import type { MusicContentFilter, MusicLibraryFilter, MusicNowPlaying } from "./types";

export function formatMusicTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function fetchSeedTracks(): Promise<SeedTrackStatus[]> {
  const res = await fetch("/api/music/tracks");
  if (!res.ok) throw new Error(`Failed to load music seed (${res.status})`);
  return res.json() as Promise<SeedTrackStatus[]>;
}

export interface MusicWidgetPosition {
  x: number;
  y: number;
}

interface MusicStore {
  tracks: SeedTrackStatus[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  searchQuery: string;
  activeLibraryItemId: string;
  activeTrackId: string | undefined;
  libraryFilter: MusicLibraryFilter;
  contentFilter: MusicContentFilter;
  playing: boolean;
  nowPlaying: MusicNowPlaying;
  widgetVisible: boolean;
  widgetCollapsed: boolean;
  widgetPosition: MusicWidgetPosition;

  init: () => void;
  setSearchQuery: (value: string) => void;
  setActiveLibraryItemId: (id: string) => void;
  setLibraryFilter: (filter: MusicLibraryFilter) => void;
  setContentFilter: (filter: MusicContentFilter) => void;
  setPlaying: (playing: boolean) => void;
  playTrack: (trackId: string, autoplay?: boolean) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setPlaybackProgress: (progress: number, elapsed: string, duration?: string) => void;
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

let initPromise: Promise<void> | null = null;

export const useMusicStore = create<MusicStore>((set, get) => ({
  tracks: [],
  loading: false,
  error: null,
  initialized: false,
  searchQuery: "",
  activeLibraryItemId: "",
  activeTrackId: undefined,
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
      set({ loading: true, error: null });
      try {
        const seedTracks = await fetchSeedTracks();
        const available = seedTracks.filter((track) => track.available);
        const first = available[0];
        set({
          tracks: available,
          activeLibraryItemId: first?.id ?? "album-tirufm",
          activeTrackId: first?.id,
          nowPlaying: buildNowPlaying(first, relatedTracksFor(available, first?.id)),
          loading: false,
          initialized: true,
        });
      } catch (err: unknown) {
        set({
          error: err instanceof Error ? err.message : "Failed to load music library",
          loading: false,
          initialized: true,
        });
      }
    })();
  },

  setSearchQuery: (value) => set({ searchQuery: value }),

  setActiveLibraryItemId: (id) => {
    set({ activeLibraryItemId: id });
    if (id !== "album-tirufm") get().playTrack(id);
  },

  setLibraryFilter: (filter) => set({ libraryFilter: filter }),
  setContentFilter: (filter) => set({ contentFilter: filter }),
  setPlaying: (playing) => set({ playing }),

  playTrack: (trackId, autoplay = true) => {
    const { tracks } = get();
    const track = tracks.find((entry) => entry.id === trackId);
    if (!track) return;

    set({
      activeTrackId: trackId,
      activeLibraryItemId: trackId,
      nowPlaying: buildNowPlaying(track, relatedTracksFor(tracks, trackId)),
      playing: autoplay,
    });
  },

  togglePlay: () => {
    const { activeTrackId, tracks, playing, playTrack } = get();
    if (!activeTrackId && tracks[0]) {
      playTrack(tracks[0].id);
      return;
    }
    set({ playing: !playing });
  },

  playNext: () => {
    const { activeTrackId, tracks, playTrack } = get();
    if (!activeTrackId || tracks.length === 0) return;
    const index = tracks.findIndex((track) => track.id === activeTrackId);
    const next = tracks[(index + 1) % tracks.length];
    if (next) playTrack(next.id);
  },

  playPrevious: () => {
    const { activeTrackId, tracks, playTrack } = get();
    if (!activeTrackId || tracks.length === 0) return;
    const index = tracks.findIndex((track) => track.id === activeTrackId);
    const prev = tracks[(index - 1 + tracks.length) % tracks.length];
    if (prev) playTrack(prev.id);
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

  return {
    user: musicUser,
    tracks: store.tracks,
    visibleTracks,
    libraryItems: albumLibraryItems(visibleTracks),
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
    playNext: store.playNext,
    playPrevious: store.playPrevious,
    setPlaybackProgress: store.setPlaybackProgress,
    stopPlayback: store.stopPlayback,
    showWidget: store.showWidget,
    restoreMusicWindow: store.restoreMusicWindow,
    minimizeToWidget: store.minimizeToWidget,
  };
}

export type MusicViewModel = ReturnType<typeof useMusicViewModel>;
