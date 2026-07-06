/**
 * STUB: replace with useDownloadsStore when a BitTorrent / Transmission API exists.
 */
import { useCallback, useMemo, useState } from "react";
import {
  buildCategoryFilters,
  buildTrackerGroups,
  DOWNLOADS_GLOBAL_STATS,
  DOWNLOADS_MOCK,
} from "./downloadsMock";
import type { TorrentCategory, TorrentDetailTab, TorrentItem, TorrentStatus } from "./types";

function matchesCategory(torrent: TorrentItem, category: TorrentCategory): boolean {
  switch (category) {
    case "all":
      return true;
    case "downloading":
      return torrent.status === "downloading" || torrent.status === "checking";
    case "completed":
      return torrent.progress >= 1 || torrent.status === "seeding";
    case "active":
      return (
        torrent.status === "downloading" ||
        torrent.status === "seeding" ||
        torrent.status === "checking"
      );
    case "inactive":
      return torrent.status === "paused";
    case "stopped":
      return torrent.status === "stopped";
    case "error":
      return torrent.status === "error";
    default:
      return true;
  }
}

function idleSpeeds(status: TorrentStatus): Pick<TorrentItem, "downSpeed" | "upSpeed"> {
  if (status === "paused" || status === "stopped" || status === "error" || status === "queued") {
    return { downSpeed: "0 B/s", upSpeed: "0 B/s" };
  }
  return { downSpeed: "512 KB/s", upSpeed: "8 KB/s" };
}

function resumeStatus(torrent: TorrentItem): TorrentStatus {
  if (torrent.progress >= 1) return "seeding";
  if (torrent.progress > 0 && torrent.progress < 1) return "downloading";
  return "downloading";
}

/** STUB: replace with useDownloadsStore when os.downloads@1 exists. */
export function useDownloadsStub() {
  const [torrents, setTorrents] = useState<TorrentItem[]>(() =>
    DOWNLOADS_MOCK.map((entry) => ({ ...entry })),
  );
  const [category, setCategory] = useState<TorrentCategory>("all");
  const [trackerFilter, setTrackerFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    DOWNLOADS_MOCK[0] ? [DOWNLOADS_MOCK[0].id] : [],
  );
  const [detailTab, setDetailTab] = useState<TorrentDetailTab>("general");
  const [sidebarWidth, setSidebarWidth] = useState(248);
  const [detailHeight, setDetailHeight] = useState(240);

  const categories = useMemo(() => buildCategoryFilters(torrents), [torrents]);
  const trackers = useMemo(() => buildTrackerGroups(torrents), [torrents]);

  const filteredTorrents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return torrents.filter((torrent) => {
      if (!matchesCategory(torrent, category)) return false;
      if (trackerFilter && torrent.tracker !== trackerFilter) return false;
      if (!query) return true;
      return (
        torrent.name.toLowerCase().includes(query) ||
        torrent.tracker.toLowerCase().includes(query)
      );
    });
  }, [torrents, category, trackerFilter, searchQuery]);

  const selectedTorrent = useMemo(() => {
    const primaryId = selectedIds[0];
    if (!primaryId) return null;
    return torrents.find((torrent) => torrent.id === primaryId) ?? null;
  }, [torrents, selectedIds]);

  const selectTorrent = useCallback((id: string, options?: { additive?: boolean; range?: boolean }) => {
    setSelectedIds((current) => {
      if (options?.range && current.length > 0) {
        const ids = filteredTorrents.map((torrent) => torrent.id);
        const anchor = current[current.length - 1];
        const start = ids.indexOf(anchor);
        const end = ids.indexOf(id);
        if (start === -1 || end === -1) return [id];
        const [from, to] = start < end ? [start, end] : [end, start];
        return ids.slice(from, to + 1);
      }
      if (options?.additive) {
        return current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      }
      return [id];
    });
  }, [filteredTorrents]);

  const updateSelected = useCallback((updater: (torrent: TorrentItem) => TorrentItem) => {
    setTorrents((current) =>
      current.map((torrent) => (selectedIds.includes(torrent.id) ? updater(torrent) : torrent)),
    );
  }, [selectedIds]);

  const pauseSelected = useCallback(() => {
    updateSelected((torrent) => ({
      ...torrent,
      status: "paused",
      downSpeed: "0 B/s",
      upSpeed: "0 B/s",
    }));
  }, [updateSelected]);

  const resumeSelected = useCallback(() => {
    updateSelected((torrent) => {
      const status = resumeStatus(torrent);
      const speeds = idleSpeeds(status);
      return { ...torrent, status, ...speeds, error: torrent.error && status === "error" ? torrent.error : null };
    });
  }, [updateSelected]);

  const stopSelected = useCallback(() => {
    updateSelected((torrent) => ({
      ...torrent,
      status: "stopped",
      downSpeed: "0 B/s",
      upSpeed: "0 B/s",
    }));
  }, [updateSelected]);

  const removeSelected = useCallback(() => {
    setTorrents((current) => current.filter((torrent) => !selectedIds.includes(torrent.id)));
    setSelectedIds([]);
  }, [selectedIds]);

  const addTorrentStub = useCallback(() => {
    const id = `t-new-${Date.now()}`;
    const torrent: TorrentItem = {
      id,
      name: "void-linux-202507-minimal-x86_64.iso",
      size: "420 MB",
      sizeBytes: 420_000_000,
      progress: 0,
      status: "queued",
      seeds: { connected: 0, total: 0 },
      peers: { connected: 0, total: 0 },
      downSpeed: "0 B/s",
      upSpeed: "0 B/s",
      ratio: 0,
      uploaded: "0 B",
      downloaded: "0 B",
      remaining: "420 MB",
      wasted: "0 B",
      tracker: "udp://tracker.opentrackr.org:1337/announce",
      trackerUpdate: "—",
      lastActive: "—",
      maxPeers: 50,
      downLimit: "Unlimited",
      upLimit: "Unlimited",
      error: null,
      addedAt: new Date().toISOString(),
      trackers: [
        {
          id: "tr-new",
          url: "udp://tracker.opentrackr.org:1337/announce",
          status: "updating",
          lastAnnounce: "—",
          seeders: 0,
          leechers: 0,
        },
      ],
      peersList: [],
      files: [
        {
          id: `${id}-file`,
          name: "void-linux-202507-minimal-x86_64.iso",
          size: "420 MB",
          progress: 0,
          priority: "normal",
          wanted: true,
        },
      ],
    };
    setTorrents((current) => [torrent, ...current]);
    setSelectedIds([id]);
  }, []);

  return {
    torrents: filteredTorrents,
    allTorrents: torrents,
    categories,
    trackers,
    category,
    setCategory,
    trackerFilter,
    setTrackerFilter,
    searchQuery,
    setSearchQuery,
    selectedIds,
    selectedTorrent,
    selectTorrent,
    detailTab,
    setDetailTab,
    sidebarWidth,
    setSidebarWidth,
    detailHeight,
    setDetailHeight,
    globalStats: DOWNLOADS_GLOBAL_STATS,
    pauseSelected,
    resumeSelected,
    stopSelected,
    removeSelected,
    addTorrentStub,
  };
}

export type DownloadsViewModel = ReturnType<typeof useDownloadsStub>;
