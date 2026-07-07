/**
 * Global podcast/audiobook playback store — shell audio engine keeps listening
 * alive when the Podcast window is minimized.
 */
import { create } from "zustand";
import type { ServiceConnection } from "@shared/serviceConnections";
import { presetById } from "@shared/serviceConnections";
import {
  buildShows,
  filterEpisodes,
  formatPodcastTime,
  isPlayableEpisode,
  localToEpisode,
  remoteToEpisode,
  rssToEpisode,
  type LocalEpisodeRecord,
  type RemoteEpisodeRecord,
  type RssEpisodeRecord,
} from "./podcastCatalog";
import type {
  PodcastContentFilter,
  PodcastEpisode,
  PodcastNavSection,
  PodcastNowPlaying,
  PodcastSourceFilter,
} from "./types";

async function fetchLocalEpisodes(): Promise<LocalEpisodeRecord[]> {
  const res = await fetch("/api/podcast/episodes");
  if (!res.ok) throw new Error(`Failed to load episodes (${res.status})`);
  return res.json() as Promise<LocalEpisodeRecord[]>;
}

async function fetchRssEpisodes(): Promise<RssEpisodeRecord[]> {
  const res = await fetch("/api/podcast/rss/episodes");
  if (!res.ok) throw new Error(`Failed to load RSS feeds (${res.status})`);
  return res.json() as Promise<RssEpisodeRecord[]>;
}

async function fetchRemoteEpisodes(input: {
  provider: "spotify" | "apple-podcasts" | "audible";
  token: string;
  query?: string;
  kind?: PodcastContentFilter;
}): Promise<RemoteEpisodeRecord[]> {
  const res = await fetch("/api/podcast/remote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: input.provider,
      token: input.token,
      query: input.query,
      kind: input.kind ?? "all",
    }),
  });
  if (!res.ok) throw new Error(`Failed to load ${input.provider} catalog (${res.status})`);
  return res.json() as Promise<RemoteEpisodeRecord[]>;
}

interface PodcastStore {
  localEpisodes: PodcastEpisode[];
  rssEpisodes: PodcastEpisode[];
  remoteEpisodes: PodcastEpisode[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  searchQuery: string;
  navSection: PodcastNavSection;
  contentFilter: PodcastContentFilter;
  sourceFilter: PodcastSourceFilter;
  activeProviderId: "spotify" | "apple-podcasts" | "audible";
  activeEpisodeId: string | undefined;
  playing: boolean;
  nowPlaying: PodcastNowPlaying;
  connectionTokens: Record<string, string>;

  init: () => void;
  refreshRemote: (connections: ServiceConnection[]) => Promise<void>;
  setSearchQuery: (value: string) => void;
  setNavSection: (section: PodcastNavSection) => void;
  setContentFilter: (filter: PodcastContentFilter) => void;
  setSourceFilter: (filter: PodcastSourceFilter) => void;
  setActiveProviderId: (provider: "spotify" | "apple-podcasts" | "audible") => void;
  setConnectionToken: (connectionId: string, token: string) => void;
  playEpisode: (episodeId: string, autoplay?: boolean) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setPlaybackProgress: (progress: number, elapsed: string, duration?: string) => void;
  seekPlayback: (progress: number) => void;
  stopPlayback: () => void;
}

function emptyNowPlaying(): PodcastNowPlaying {
  return {
    episode: {
      id: "",
      title: "No episode selected",
      showTitle: "",
      host: "",
      durationLabel: "0:00",
      kind: "podcast",
      artTone: "teal",
      source: "local",
    },
    progress: 0,
    elapsed: "0:00",
    duration: "0:00",
  };
}

let initPromise: Promise<void> | null = null;
let seekHandler: ((progress: number) => void) | null = null;

export function registerPodcastSeekHandler(handler: ((progress: number) => void) | null) {
  seekHandler = handler;
}

function catalogForEpisode(
  episode: PodcastEpisode | undefined,
  localEpisodes: PodcastEpisode[],
  rssEpisodes: PodcastEpisode[],
  remoteEpisodes: PodcastEpisode[],
  activeProviderId: PodcastStore["activeProviderId"],
): PodcastEpisode[] {
  if (episode?.source === "rss") return rssEpisodes;
  if (episode?.source === "remote") {
    return remoteEpisodes.filter((entry) => entry.provider === activeProviderId);
  }
  return localEpisodes;
}

function catalogForFilter(
  sourceFilter: PodcastSourceFilter,
  localEpisodes: PodcastEpisode[],
  rssEpisodes: PodcastEpisode[],
  remoteEpisodes: PodcastEpisode[],
  activeProviderId: PodcastStore["activeProviderId"],
): PodcastEpisode[] {
  if (sourceFilter === "rss") return rssEpisodes;
  if (sourceFilter === "remote") {
    return remoteEpisodes.filter((entry) => entry.provider === activeProviderId);
  }
  return localEpisodes;
}

function parsePodcastTime(label: string): number {
  const parts = label.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

export const usePodcastStore = create<PodcastStore>((set, get) => ({
  localEpisodes: [],
  rssEpisodes: [],
  remoteEpisodes: [],
  loading: false,
  error: null,
  initialized: false,
  searchQuery: "",
  navSection: "home",
  contentFilter: "all",
  sourceFilter: "local",
  activeProviderId: "spotify",
  activeEpisodeId: undefined,
  playing: false,
  nowPlaying: emptyNowPlaying(),
  connectionTokens: {},

  init: () => {
    if (initPromise) return;
    initPromise = (async () => {
      set({ loading: true, error: null });
      try {
        const [localRecords, rssRecords] = await Promise.all([
          fetchLocalEpisodes(),
          fetchRssEpisodes().catch(() => [] as RssEpisodeRecord[]),
        ]);
        const localEpisodes = localRecords.filter((entry) => entry.available).map(localToEpisode);
        const rssEpisodes = rssRecords.filter((entry) => entry.available).map(rssToEpisode);
        const playable = [...localEpisodes, ...rssEpisodes];
        const first = playable[0];
        const sourceFilter = localEpisodes.length > 0 ? "local" : rssEpisodes.length > 0 ? "rss" : "local";
        set({
          localEpisodes,
          rssEpisodes,
          sourceFilter,
          activeEpisodeId: first?.id,
          nowPlaying: first
            ? { episode: first, progress: 0, elapsed: "0:00", duration: first.durationLabel }
            : emptyNowPlaying(),
          loading: false,
          initialized: true,
        });
      } catch (err: unknown) {
        set({
          error: err instanceof Error ? err.message : "Failed to load podcast library",
          loading: false,
          initialized: true,
        });
      }
    })();
  },

  refreshRemote: async (connections) => {
    const { activeProviderId, connectionTokens, searchQuery, contentFilter } = get();
    const connection = connections.find((c) => c.provider === activeProviderId && c.status === "connected");
    const token = connection ? connectionTokens[connection.id] : undefined;
    if (!connection || !token) {
      set({ remoteEpisodes: [] });
      return;
    }

    try {
      const records = await fetchRemoteEpisodes({
        provider: activeProviderId,
        token,
        query: searchQuery || undefined,
        kind: contentFilter,
      });
      set({ remoteEpisodes: records.map(remoteToEpisode) });
    } catch {
      set({ remoteEpisodes: [] });
    }
  },

  setSearchQuery: (value) => set({ searchQuery: value }),
  setNavSection: (section) => set({ navSection: section }),
  setContentFilter: (filter) => set({ contentFilter: filter }),
  setSourceFilter: (filter) => set({ sourceFilter: filter }),
  setActiveProviderId: (provider) => set({ activeProviderId: provider }),

  setConnectionToken: (connectionId, token) => {
    set((state) => ({
      connectionTokens: { ...state.connectionTokens, [connectionId]: token },
    }));
  },

  playEpisode: (episodeId, autoplay = true) => {
    const { localEpisodes, rssEpisodes, remoteEpisodes } = get();
    const episode = [...localEpisodes, ...rssEpisodes, ...remoteEpisodes].find((entry) => entry.id === episodeId);
    if (!episode) return;

    const sourceFilter =
      episode.source === "rss" ? "rss" : episode.source === "remote" ? "remote" : "local";

    set({
      sourceFilter,
      activeEpisodeId: episodeId,
      nowPlaying: {
        episode,
        progress: 0,
        elapsed: "0:00",
        duration: episode.durationLabel,
      },
      playing: autoplay && isPlayableEpisode(episode),
    });
  },

  setPlaying: (playing) => set({ playing }),
  togglePlay: () => {
    const state = get();
    const { activeEpisodeId, localEpisodes, rssEpisodes, remoteEpisodes, activeProviderId, playing, playEpisode, nowPlaying } =
      state;
    const catalog = catalogForEpisode(
      nowPlaying.episode.id ? nowPlaying.episode : undefined,
      localEpisodes,
      rssEpisodes,
      remoteEpisodes,
      activeProviderId,
    );
    if (!activeEpisodeId && catalog[0]) {
      playEpisode(catalog[0].id);
      return;
    }
    if (!activeEpisodeId || !isPlayableEpisode(nowPlaying.episode)) return;
    set({ playing: !playing });
  },

  playNext: () => {
    const state = get();
    const { activeEpisodeId, localEpisodes, rssEpisodes, remoteEpisodes, activeProviderId, playEpisode, nowPlaying } =
      state;
    const catalog = catalogForEpisode(
      nowPlaying.episode,
      localEpisodes,
      rssEpisodes,
      remoteEpisodes,
      activeProviderId,
    );
    if (!activeEpisodeId || catalog.length === 0) return;
    const index = catalog.findIndex((e) => e.id === activeEpisodeId);
    if (index < 0) {
      playEpisode(catalog[0].id);
      return;
    }
    const next = catalog[(index + 1) % catalog.length];
    if (next) playEpisode(next.id);
  },

  playPrevious: () => {
    const state = get();
    const { activeEpisodeId, localEpisodes, rssEpisodes, remoteEpisodes, activeProviderId, playEpisode, nowPlaying } =
      state;
    const catalog = catalogForEpisode(
      nowPlaying.episode,
      localEpisodes,
      rssEpisodes,
      remoteEpisodes,
      activeProviderId,
    );
    if (!activeEpisodeId || catalog.length === 0) return;
    const index = catalog.findIndex((e) => e.id === activeEpisodeId);
    if (index < 0) {
      playEpisode(catalog[0].id);
      return;
    }
    const prev = catalog[(index - 1 + catalog.length) % catalog.length];
    if (prev) playEpisode(prev.id);
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
    const durationSeconds = parsePodcastTime(get().nowPlaying.duration);
    const elapsedSeconds = durationSeconds > 0 ? (clamped / 100) * durationSeconds : 0;
    set((state) => ({
      nowPlaying: {
        ...state.nowPlaying,
        progress: clamped,
        elapsed: formatPodcastTime(elapsedSeconds),
      },
    }));
    seekHandler?.(clamped);
  },

  stopPlayback: () => set({ playing: false }),
}));

export function usePodcastViewModel() {
  const store = usePodcastStore();
  const catalog = catalogForFilter(
    store.sourceFilter,
    store.localEpisodes,
    store.rssEpisodes,
    store.remoteEpisodes,
    store.activeProviderId,
  );
  const visibleEpisodes = filterEpisodes(catalog, store.searchQuery, store.contentFilter);
  const shows = buildShows(visibleEpisodes);

  return {
    ...store,
    visibleEpisodes,
    shows,
    continueListening: visibleEpisodes[0],
    newEpisodes: visibleEpisodes.slice(0, 6),
    providerLabel: presetById(store.activeProviderId).label,
  };
}

export type PodcastViewModel = ReturnType<typeof usePodcastViewModel>;
