/**
 * Global podcast/audiobook playback store — shell audio engine keeps listening
 * alive when the Podcast window is minimized.
 */
import { create } from "zustand";
import type { PodcastFeedSubscription } from "@shared/podcastFeeds";
import type { ServiceConnection } from "@shared/serviceConnections";
import { presetById } from "@shared/serviceConnections";
import {
  buildShows,
  episodesForShow,
  episodeBelongsToShow,
  filterEpisodes,
  sortEpisodesNewestFirst,
  formatPodcastTime,
  isPlayableEpisode,
  localToEpisode,
  remoteToEpisode,
  rssToEpisode,
  type LocalEpisodeRecord,
  type RemoteEpisodeRecord,
  type RssEpisodeRecord,
} from "./podcastCatalog";
import type { PodcastDirectoryEntry } from "@shared/podcastDirectory";
import type {
  PodcastContentFilter,
  PodcastEpisode,
  PodcastEpisodeDetailTab,
  PodcastNavSection,
  PodcastNowPlaying,
  PodcastSourceFilter,
} from "./types";

async function fetchDriveSaves(): Promise<Record<string, string>> {
  const res = await fetch("/api/podcast/drive/saves");
  if (!res.ok) return {};
  const records = (await res.json()) as { episodeId: string; driveFileId: string }[];
  return Object.fromEntries(records.map((record) => [record.episodeId, record.driveFileId]));
}

interface PodcastTranscriptSummary {
  episodeId: string;
  title: string;
  showTitle: string;
  engine: "openai-whisper" | "voice-server";
  wordCount: number;
  createdAt: string;
  textPreview: string;
}

interface PodcastTranscriptRecord extends PodcastTranscriptSummary {
  text: string;
}

async function fetchTranscriptIndex(): Promise<Record<string, PodcastTranscriptSummary>> {
  const res = await fetch("/api/podcast/transcripts");
  if (!res.ok) return {};
  const records = (await res.json()) as PodcastTranscriptSummary[];
  return Object.fromEntries(records.map((record) => [record.episodeId, record]));
}

async function fetchRssFeeds(): Promise<PodcastFeedSubscription[]> {
  const res = await fetch("/api/podcast/rss/feeds");
  if (!res.ok) throw new Error(`Failed to load RSS feeds (${res.status})`);
  return res.json() as Promise<PodcastFeedSubscription[]>;
}

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

async function fetchFeedEpisodes(feedUrl: string): Promise<RssEpisodeRecord[]> {
  const res = await fetch(`/api/podcast/rss/feed-episodes?url=${encodeURIComponent(feedUrl)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to load feed episodes (${res.status})`);
  }
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
  rssFeeds: PodcastFeedSubscription[];
  driveSavedIds: Record<string, string>;
  driveSavingIds: Record<string, boolean>;
  transcriptIndex: Record<string, PodcastTranscriptSummary>;
  transcribingIds: Record<string, boolean>;
  activeTranscript: PodcastTranscriptRecord | null;
  selectedEpisodeId: string | null;
  episodeDetailTab: PodcastEpisodeDetailTab;
  episodeDetailReturnSection: PodcastNavSection | null;
  loading: boolean;
  feedsLoading: boolean;
  syncing: boolean;
  syncMessage: string | null;
  error: string | null;
  initialized: boolean;
  searchQuery: string;
  navSection: PodcastNavSection;
  selectedShowId: string | null;
  selectedDirectoryShow: PodcastDirectoryEntry | null;
  directoryShowEpisodes: PodcastEpisode[];
  directoryShowLoading: boolean;
  directoryShowError: string | null;
  contentFilter: PodcastContentFilter;
  sourceFilter: PodcastSourceFilter;
  activeProviderId: "spotify" | "apple-podcasts" | "audible";
  activeEpisodeId: string | undefined;
  playing: boolean;
  nowPlaying: PodcastNowPlaying;
  connectionTokens: Record<string, string>;

  init: () => void;
  refreshLibrary: () => Promise<void>;
  addRssFeed: (url: string, options?: { navigateToSettings?: boolean }) => Promise<void>;
  removeRssFeed: (feedId: string) => Promise<void>;
  followDirectoryShow: (url: string) => Promise<void>;
  unfollowDirectoryShow: (url: string) => Promise<void>;
  syncDownloads: () => Promise<void>;
  saveEpisodeToDrive: (episodeId: string) => Promise<void>;
  transcribeEpisode: (episodeId: string) => Promise<void>;
  openEpisodeDetail: (
    episodeId: string,
    tab?: PodcastEpisodeDetailTab,
    returnSection?: PodcastNavSection,
  ) => Promise<void>;
  closeEpisodeDetail: () => void;
  setEpisodeDetailTab: (tab: PodcastEpisodeDetailTab) => Promise<void>;
  openTranscript: (episodeId: string) => Promise<void>;
  refreshTranscripts: () => Promise<void>;
  refreshRemote: (connections: ServiceConnection[]) => Promise<void>;
  setSearchQuery: (value: string) => void;
  setNavSection: (section: PodcastNavSection) => void;
  setSelectedShowId: (showId: string | null) => void;
  openDirectoryShow: (entry: PodcastDirectoryEntry) => Promise<void>;
  closeDirectoryShow: () => void;
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

function allEpisodes(state: Pick<PodcastStore, "localEpisodes" | "rssEpisodes" | "remoteEpisodes">): PodcastEpisode[] {
  return [...state.localEpisodes, ...state.rssEpisodes, ...state.remoteEpisodes];
}

async function fetchTranscriptRecord(episodeId: string): Promise<PodcastTranscriptRecord | null> {
  try {
    const res = await fetch(`/api/podcast/transcripts/${encodeURIComponent(episodeId)}`);
    if (!res.ok) return null;
    return (await res.json()) as PodcastTranscriptRecord;
  } catch {
    return null;
  }
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
  rssFeeds: [],
  driveSavedIds: {},
  driveSavingIds: {},
  transcriptIndex: {},
  transcribingIds: {},
  activeTranscript: null,
  selectedEpisodeId: null,
  episodeDetailTab: "episode",
  episodeDetailReturnSection: null,
  loading: false,
  feedsLoading: false,
  syncing: false,
  syncMessage: null,
  error: null,
  initialized: false,
  searchQuery: "",
  navSection: "home",
  selectedShowId: null,
  selectedDirectoryShow: null,
  directoryShowEpisodes: [],
  directoryShowLoading: false,
  directoryShowError: null,
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
        const [localRecords, rssRecords, rssFeeds, driveSavedIds, transcriptIndex] = await Promise.all([
          fetchLocalEpisodes(),
          fetchRssEpisodes().catch(() => [] as RssEpisodeRecord[]),
          fetchRssFeeds().catch(() => [] as PodcastFeedSubscription[]),
          fetchDriveSaves(),
          fetchTranscriptIndex(),
        ]);
        const localEpisodes = localRecords.filter((entry) => entry.available).map(localToEpisode);
        const rssEpisodes = rssRecords.filter((entry) => entry.available).map(rssToEpisode);
        const playable = [...localEpisodes, ...rssEpisodes];
        const first = playable[0];
        const sourceFilter = localEpisodes.length > 0 ? "local" : rssEpisodes.length > 0 ? "rss" : "local";
        set({
          localEpisodes,
          rssEpisodes,
          rssFeeds,
          driveSavedIds,
          transcriptIndex,
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

  refreshLibrary: async () => {
    set({ loading: true, error: null });
    try {
      const [localRecords, rssRecords, rssFeeds, driveSavedIds, transcriptIndex] = await Promise.all([
        fetchLocalEpisodes(),
        fetchRssEpisodes().catch(() => [] as RssEpisodeRecord[]),
        fetchRssFeeds().catch(() => get().rssFeeds),
        fetchDriveSaves(),
        fetchTranscriptIndex(),
      ]);
      const localEpisodes = localRecords.filter((entry) => entry.available).map(localToEpisode);
      const rssEpisodes = rssRecords.filter((entry) => entry.available).map(rssToEpisode);
      set({ localEpisodes, rssEpisodes, rssFeeds, driveSavedIds, transcriptIndex, loading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to refresh podcast library",
        loading: false,
      });
    }
  },

  addRssFeed: async (url, options) => {
    set({ feedsLoading: true, error: null });
    try {
      const res = await fetch("/api/podcast/rss/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to add feed (${res.status})`);
      }
      const feed = (await res.json()) as PodcastFeedSubscription;
      set((state) => ({
        rssFeeds: state.rssFeeds.some((entry) => entry.id === feed.id)
          ? state.rssFeeds
          : [...state.rssFeeds, feed],
        feedsLoading: false,
        sourceFilter: "rss",
        navSection: options?.navigateToSettings === false ? state.navSection : "settings",
      }));
      await get().refreshLibrary();
      void get().syncDownloads();
    } catch (err: unknown) {
      set({
        feedsLoading: false,
        error: err instanceof Error ? err.message : "Failed to add feed",
      });
      throw err;
    }
  },

  followDirectoryShow: async (url) => {
    await get().addRssFeed(url, { navigateToSettings: false });
    if (get().selectedDirectoryShow) {
      set({ sourceFilter: "rss" });
      return;
    }
    set({ navSection: "home", sourceFilter: "rss" });
  },

  unfollowDirectoryShow: async (url) => {
    const feed = get().rssFeeds.find((entry) => entry.url === url);
    if (!feed) return;
    await get().removeRssFeed(feed.id);
  },

  removeRssFeed: async (feedId) => {
    set({ feedsLoading: true, error: null });
    try {
      const res = await fetch(`/api/podcast/rss/feeds/${encodeURIComponent(feedId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to remove feed (${res.status})`);
      }
      set((state) => ({
        rssFeeds: state.rssFeeds.filter((feed) => feed.id !== feedId),
        feedsLoading: false,
      }));
      await get().refreshLibrary();
    } catch (err: unknown) {
      set({
        feedsLoading: false,
        error: err instanceof Error ? err.message : "Failed to remove feed",
      });
      throw err;
    }
  },

  syncDownloads: async () => {
    set({ syncing: true, syncMessage: null });
    try {
      const res = await fetch("/api/podcast/rss/sync", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Sync failed (${res.status})`);
      }
      const result = (await res.json()) as { downloaded: number; skipped: number; errors?: string[] };
      const message =
        result.downloaded > 0
          ? `Downloaded ${result.downloaded} new episode${result.downloaded === 1 ? "" : "s"}`
          : "Feeds are up to date";
      set({ syncing: false, syncMessage: message });
      if (result.downloaded > 0) {
        await get().refreshLibrary();
      }
    } catch (err: unknown) {
      set({
        syncing: false,
        syncMessage: err instanceof Error ? err.message : "Sync failed",
      });
    }
  },

  saveEpisodeToDrive: async (episodeId) => {
    set((state) => ({
      driveSavingIds: { ...state.driveSavingIds, [episodeId]: true },
      error: null,
    }));
    try {
      const res = await fetch(`/api/podcast/drive/${encodeURIComponent(episodeId)}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to save to Drive (${res.status})`);
      }
      const entry = (await res.json()) as { id: string };
      set((state) => ({
        driveSavedIds: { ...state.driveSavedIds, [episodeId]: entry.id },
        driveSavingIds: { ...state.driveSavingIds, [episodeId]: false },
        syncMessage: "Saved to Drive → Podcasts",
      }));
    } catch (err: unknown) {
      set((state) => ({
        driveSavingIds: { ...state.driveSavingIds, [episodeId]: false },
        error: err instanceof Error ? err.message : "Failed to save to Drive",
      }));
      throw err;
    }
  },

  transcribeEpisode: async (episodeId) => {
    set((state) => ({
      transcribingIds: { ...state.transcribingIds, [episodeId]: true },
      error: null,
      syncMessage: null,
    }));
    try {
      const res = await fetch(`/api/podcast/transcripts/${encodeURIComponent(episodeId)}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Transcription failed (${res.status})`);
      }
      const transcript = (await res.json()) as PodcastTranscriptRecord;
      set((state) => ({
        transcriptIndex: {
          ...state.transcriptIndex,
          [episodeId]: {
            episodeId: transcript.episodeId,
            title: transcript.title,
            showTitle: transcript.showTitle,
            engine: transcript.engine,
            wordCount: transcript.wordCount,
            createdAt: transcript.createdAt,
            textPreview: transcript.textPreview,
          },
        },
        transcribingIds: { ...state.transcribingIds, [episodeId]: false },
        syncMessage: `Transcript saved (${transcript.wordCount.toLocaleString()} words)`,
      }));
      await get().openEpisodeDetail(episodeId, "transcript");
    } catch (err: unknown) {
      set((state) => ({
        transcribingIds: { ...state.transcribingIds, [episodeId]: false },
        error: err instanceof Error ? err.message : "Transcription failed",
      }));
      throw err;
    }
  },

  openEpisodeDetail: async (episodeId, tab = "episode", returnSection) => {
    const state = get();
    const episode = allEpisodes(state).find((entry) => entry.id === episodeId);
    const transcript =
      tab === "transcript" || state.transcriptIndex[episodeId] ? await fetchTranscriptRecord(episodeId) : null;

    set({
      selectedEpisodeId: episodeId,
      episodeDetailTab: tab,
      episodeDetailReturnSection: returnSection ?? state.navSection,
      selectedShowId: null,
      selectedDirectoryShow: null,
      directoryShowEpisodes: [],
      directoryShowError: null,
      directoryShowLoading: false,
      activeTranscript: transcript,
      ...(episode
        ? {
            sourceFilter:
              episode.source === "rss" ? "rss" : episode.source === "remote" ? "remote" : ("local" as const),
          }
        : {}),
    });
  },

  closeEpisodeDetail: () => {
    const returnSection = get().episodeDetailReturnSection;
    set({
      selectedEpisodeId: null,
      episodeDetailTab: "episode",
      episodeDetailReturnSection: null,
      activeTranscript: null,
      ...(returnSection ? { navSection: returnSection } : {}),
    });
  },

  setEpisodeDetailTab: async (tab) => {
    const episodeId = get().selectedEpisodeId;
    if (!episodeId) return;

    if (tab === "transcript" && !get().activeTranscript && get().transcriptIndex[episodeId]) {
      const transcript = await fetchTranscriptRecord(episodeId);
      set({ episodeDetailTab: tab, activeTranscript: transcript });
      return;
    }

    set({ episodeDetailTab: tab });
  },

  openTranscript: async (episodeId) => {
    if (get().transcriptIndex[episodeId]) {
      await get().openEpisodeDetail(episodeId, "transcript");
      return;
    }

    await get().transcribeEpisode(episodeId);
  },

  refreshTranscripts: async () => {
    try {
      const transcriptIndex = await fetchTranscriptIndex();
      set({ transcriptIndex });
    } catch {
      // Keep the cached index if the refresh fails.
    }
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
  setNavSection: (section) => {
    set({
      navSection: section,
      selectedShowId: null,
      selectedDirectoryShow: null,
      selectedEpisodeId: null,
      episodeDetailTab: "episode",
      episodeDetailReturnSection: null,
      activeTranscript: null,
      directoryShowEpisodes: [],
      directoryShowError: null,
      directoryShowLoading: false,
    });
    if (section === "transcripts") void get().refreshTranscripts();
  },
  setSelectedShowId: (showId) =>
    set({
      selectedShowId: showId,
      selectedEpisodeId: null,
      episodeDetailTab: "episode",
      episodeDetailReturnSection: null,
      activeTranscript: null,
      selectedDirectoryShow: null,
      directoryShowEpisodes: [],
      directoryShowError: null,
      directoryShowLoading: false,
    }),

  openDirectoryShow: async (entry) => {
    const cached = get().rssEpisodes.filter((episode) => episode.feedUrl === entry.url);
    set({
      selectedDirectoryShow: entry,
      selectedShowId: null,
      selectedEpisodeId: null,
      episodeDetailTab: "episode",
      episodeDetailReturnSection: null,
      activeTranscript: null,
      directoryShowLoading: true,
      directoryShowError: null,
      directoryShowEpisodes: cached,
    });

    try {
      const records = await fetchFeedEpisodes(entry.url);
      set({
        directoryShowEpisodes: records.map(rssToEpisode),
        directoryShowLoading: false,
      });
    } catch (err: unknown) {
      set({
        directoryShowLoading: false,
        directoryShowError: err instanceof Error ? err.message : "Failed to load episodes",
      });
    }
  },

  closeDirectoryShow: () =>
    set({
      selectedDirectoryShow: null,
      directoryShowEpisodes: [],
      directoryShowError: null,
      directoryShowLoading: false,
    }),
  setContentFilter: (filter) => set({ contentFilter: filter }),
  setSourceFilter: (filter) => set({ sourceFilter: filter, selectedShowId: null }),
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

function subscribedEpisodesForFeeds(
  rssEpisodes: PodcastEpisode[],
  rssFeeds: PodcastFeedSubscription[],
): PodcastEpisode[] {
  const subscribedUrls = new Set(rssFeeds.map((feed) => feed.url));
  return rssEpisodes.filter((episode) => episode.feedUrl && subscribedUrls.has(episode.feedUrl));
}

export function usePodcastViewModel() {
  const store = usePodcastStore();
  const catalog = catalogForFilter(
    store.sourceFilter,
    store.localEpisodes,
    store.rssEpisodes,
    store.remoteEpisodes,
    store.activeProviderId,
  );
  const homeCatalog = sortEpisodesNewestFirst(subscribedEpisodesForFeeds(store.rssEpisodes, store.rssFeeds));
  const homeEpisodes = filterEpisodes(homeCatalog, store.searchQuery, store.contentFilter);
  const homeShows = buildShows(homeCatalog);
  const downloadedCatalog = store.localEpisodes.filter((episode) => episode.id.startsWith("scan-"));
  const libraryCatalog = catalog;
  const showDetailCatalog =
    store.navSection === "home" || store.navSection === "main-feed"
      ? homeCatalog
      : store.navSection === "downloads"
        ? downloadedCatalog
        : libraryCatalog;
  const visibleEpisodes =
    store.navSection === "downloads"
      ? filterEpisodes(downloadedCatalog, store.searchQuery, store.contentFilter)
      : store.navSection === "home"
        ? homeEpisodes
        : filterEpisodes(catalog, store.searchQuery, store.contentFilter);
  const shows = store.navSection === "home" ? homeShows : buildShows(visibleEpisodes);
  const activeShow = store.selectedShowId
    ? buildShows(showDetailCatalog).find((show) => show.id === store.selectedShowId) ?? null
    : null;
  const showEpisodes = activeShow
    ? sortEpisodesNewestFirst(
        filterEpisodes(episodesForShow(showDetailCatalog, activeShow), "", store.contentFilter),
      )
    : [];
  const continueListening =
    homeEpisodes.find((episode) => isPlayableEpisode(episode)) ?? homeEpisodes[0] ?? null;
  const catalogEpisodes = [...store.localEpisodes, ...store.rssEpisodes, ...store.remoteEpisodes];
  const query = store.searchQuery.trim().toLowerCase();
  const matchesTranscriptQuery = (title: string, showTitle: string, preview = "") => {
    if (!query) return true;
    return (
      title.toLowerCase().includes(query) ||
      showTitle.toLowerCase().includes(query) ||
      preview.toLowerCase().includes(query)
    );
  };

  const processingTranscripts = Object.entries(store.transcribingIds)
    .filter(([episodeId, active]) => active && !store.transcriptIndex[episodeId])
    .map(([episodeId]) => {
      const episode = catalogEpisodes.find((entry) => entry.id === episodeId);
      return {
        status: "processing" as const,
        episodeId,
        title: episode?.title ?? "Episode",
        showTitle: episode?.showTitle ?? "",
      };
    })
    .filter((entry) => matchesTranscriptQuery(entry.title, entry.showTitle));

  const transcripts = Object.values(store.transcriptIndex)
    .filter((record) => matchesTranscriptQuery(record.title, record.showTitle, record.textPreview))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((record) => ({ status: "ready" as const, ...record }));

  const transcriptEntries = [...processingTranscripts, ...transcripts];
  const processingTranscriptCount = Object.values(store.transcribingIds).filter(Boolean).length;

  return {
    ...store,
    visibleEpisodes,
    transcripts,
    transcriptEntries,
    processingTranscriptCount,
    activeEpisode: store.selectedEpisodeId
      ? catalogEpisodes.find((episode) => episode.id === store.selectedEpisodeId) ?? null
      : null,
    episodeForTranscript: (episodeId: string) => catalogEpisodes.find((episode) => episode.id === episodeId),
    homeEpisodes,
    homeShows,
    shows,
    activeShow,
    showEpisodes,
    continueListening,
    newEpisodes: homeEpisodes.slice(0, 8),
    followedShowCount: store.rssFeeds.length,
    isSubscribedToFeed: (url: string) => store.rssFeeds.some((feed) => feed.url === url),
    providerLabel: presetById(store.activeProviderId).label,
    downloadedEpisodes: store.localEpisodes.filter((episode) => episode.id.startsWith("scan-")),
  };
}

export type PodcastViewModel = ReturnType<typeof usePodcastViewModel>;
