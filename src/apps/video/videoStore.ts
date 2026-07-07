/**
 * Global video playback store — shell-mounted engine keeps playback alive
 * when the Video window is minimized.
 */
import { create } from "zustand";
import type { ServiceConnection } from "@shared/serviceConnections";
import { presetById } from "@shared/serviceConnections";
import {
  filterVideos,
  formatVideoTime,
  localToVideoItem,
  remoteToVideoItem,
  type LocalVideoRecord,
  type RemoteVideoRecord,
} from "./videoCatalog";
import type { VideoItem, VideoNavSection, VideoNowPlaying, VideoSourceFilter } from "./types";

async function fetchLocalVideos(): Promise<LocalVideoRecord[]> {
  const res = await fetch("/api/video/videos");
  if (!res.ok) throw new Error(`Failed to load local videos (${res.status})`);
  return res.json() as Promise<LocalVideoRecord[]>;
}

async function fetchRemoteVideos(input: {
  provider: "youtube" | "vimeo";
  token: string;
  query?: string;
}): Promise<RemoteVideoRecord[]> {
  const res = await fetch("/api/video/remote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to load ${input.provider} catalog (${res.status})`);
  return res.json() as Promise<RemoteVideoRecord[]>;
}

interface VideoStore {
  localVideos: VideoItem[];
  remoteVideos: VideoItem[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  searchQuery: string;
  navSection: VideoNavSection;
  sourceFilter: VideoSourceFilter;
  activeProviderId: "youtube" | "vimeo";
  activeConnectionId: string | null;
  activeVideoId: string | undefined;
  playing: boolean;
  nowPlaying: VideoNowPlaying;
  connectionTokens: Record<string, string>;

  init: () => void;
  refreshRemote: (connections: ServiceConnection[]) => Promise<void>;
  setSearchQuery: (value: string) => void;
  setNavSection: (section: VideoNavSection) => void;
  setSourceFilter: (filter: VideoSourceFilter) => void;
  setActiveProviderId: (provider: "youtube" | "vimeo") => void;
  setActiveConnectionId: (id: string | null) => void;
  setConnectionToken: (connectionId: string, token: string) => void;
  playVideo: (videoId: string, autoplay?: boolean) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setPlaybackProgress: (progress: number, elapsed: string, duration?: string) => void;
  seekPlayback: (progress: number) => void;
  stopPlayback: () => void;
}

function emptyNowPlaying(): VideoNowPlaying {
  return {
    video: {
      id: "",
      title: "No video selected",
      channel: "",
      durationLabel: "0:00",
      artTone: "blue",
      source: "local",
    },
    progress: 0,
    elapsed: "0:00",
    duration: "0:00",
  };
}

let initPromise: Promise<void> | null = null;
let seekHandler: ((progress: number) => void) | null = null;

export function registerVideoSeekHandler(handler: ((progress: number) => void) | null) {
  seekHandler = handler;
}

export const useVideoStore = create<VideoStore>((set, get) => ({
  localVideos: [],
  remoteVideos: [],
  loading: false,
  error: null,
  initialized: false,
  searchQuery: "",
  navSection: "home",
  sourceFilter: "local",
  activeProviderId: "youtube",
  activeConnectionId: null,
  activeVideoId: undefined,
  playing: false,
  nowPlaying: emptyNowPlaying(),
  connectionTokens: {},

  init: () => {
    if (initPromise) return;
    initPromise = (async () => {
      set({ loading: true, error: null });
      try {
        const records = await fetchLocalVideos();
        const available = records.filter((entry) => entry.available).map(localToVideoItem);
        const first = available[0];
        set({
          localVideos: available,
          activeVideoId: first?.id,
          nowPlaying: first
            ? {
                video: first,
                progress: 0,
                elapsed: "0:00",
                duration: first.durationLabel,
              }
            : emptyNowPlaying(),
          loading: false,
          initialized: true,
        });
      } catch (err: unknown) {
        set({
          error: err instanceof Error ? err.message : "Failed to load video library",
          loading: false,
          initialized: true,
        });
      }
    })();
  },

  refreshRemote: async (connections) => {
    const { activeProviderId, connectionTokens, searchQuery } = get();
    const connection = connections.find((c) => c.provider === activeProviderId && c.status === "connected");
    const token = connection ? connectionTokens[connection.id] : undefined;
    if (!connection || !token) {
      set({ remoteVideos: [] });
      return;
    }

    try {
      const records = await fetchRemoteVideos({
        provider: activeProviderId,
        token,
        query: searchQuery || undefined,
      });
      set({
        remoteVideos: records.map(remoteToVideoItem),
        activeConnectionId: connection.id,
      });
    } catch {
      set({ remoteVideos: [] });
    }
  },

  setSearchQuery: (value) => set({ searchQuery: value }),
  setNavSection: (section) => set({ navSection: section }),
  setSourceFilter: (filter) => set({ sourceFilter: filter }),
  setActiveProviderId: (provider) => set({ activeProviderId: provider }),
  setActiveConnectionId: (id) => set({ activeConnectionId: id }),

  setConnectionToken: (connectionId, token) => {
    set((state) => ({
      connectionTokens: { ...state.connectionTokens, [connectionId]: token },
    }));
  },

  playVideo: (videoId, autoplay = true) => {
    const { localVideos, remoteVideos } = get();
    const video = [...localVideos, ...remoteVideos].find((entry) => entry.id === videoId);
    if (!video) return;

    set({
      activeVideoId: videoId,
      nowPlaying: {
        video,
        progress: 0,
        elapsed: "0:00",
        duration: video.durationLabel,
      },
      playing: autoplay && video.source === "local",
    });
  },

  setPlaying: (playing) => set({ playing }),

  togglePlay: () => {
    const { activeVideoId, localVideos, playing, playVideo } = get();
    if (!activeVideoId && localVideos[0]) {
      playVideo(localVideos[0].id);
      return;
    }
    set({ playing: !playing });
  },

  setPlaybackProgress: (progress, elapsed, duration) => {
    set((state) => ({
      nowPlaying: {
        ...state.nowPlaying,
        progress,
        elapsed,
        duration: duration ?? state.nowPlaying.duration,
      },
    }));
  },

  seekPlayback: (progress) => {
    const clamped = Math.min(100, Math.max(0, progress));
    const durationSeconds = parseVideoTime(get().nowPlaying.duration);
    const elapsedSeconds = durationSeconds > 0 ? (clamped / 100) * durationSeconds : 0;
    set((state) => ({
      nowPlaying: {
        ...state.nowPlaying,
        progress: clamped,
        elapsed: formatVideoTime(elapsedSeconds),
      },
    }));
    seekHandler?.(clamped);
  },

  stopPlayback: () => set({ playing: false }),
}));

function parseVideoTime(label: string): number {
  const parts = label.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

export function useVideoViewModel() {
  const store = useVideoStore();
  const catalog =
    store.sourceFilter === "local"
      ? store.localVideos
      : store.remoteVideos.filter((v) => v.provider === store.activeProviderId);
  const visibleVideos = filterVideos(catalog, store.searchQuery);

  return {
    ...store,
    visibleVideos,
    featured: visibleVideos[0],
    relatedVideos: visibleVideos.slice(1, 7),
    providerLabel: presetById(store.activeProviderId).label,
  };
}

export type VideoViewModel = ReturnType<typeof useVideoViewModel>;
