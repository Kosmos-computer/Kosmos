/**
 * Live Downloads store — polls os.downloads@1 via /api/downloads/*.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { DownloadsStatsDto, TorrentDto } from "@shared/capabilities/downloads";
import { buildCategoryFilters, buildTrackerGroups } from "./downloadsMock";
import type { GlobalStats, TorrentCategory, TorrentDetailTab, TorrentItem } from "./types";

const POLL_MS = 1500;

function matchesCategory(torrent: TorrentItem, category: TorrentCategory): boolean {
  switch (category) {
    case "all":
      return true;
    case "downloading":
      return torrent.status === "downloading" || torrent.status === "checking";
    case "seeding":
      return torrent.status === "seeding";
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

function toGlobalStats(stats: DownloadsStatsDto | null, fallbackCount: number): GlobalStats {
  if (!stats) {
    return {
      clientVersion: "WebTorrent (Kosmos)",
      host: "—",
      globalDownSpeed: "0 B/s",
      globalUpSpeed: "0 B/s",
      freeSpace: "—",
      totalSize: "0 B",
      torrentCount: fallbackCount,
    };
  }
  return stats;
}

export function useDownloads() {
  const [torrents, setTorrents] = useState<TorrentDto[]>([]);
  const [stats, setStats] = useState<DownloadsStatsDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<TorrentCategory>("all");
  const [trackerFilter, setTrackerFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailTab, setDetailTab] = useState<TorrentDetailTab>("general");
  const [sidebarWidth, setSidebarWidth] = useState(248);
  const [detailHeight, setDetailHeight] = useState(240);
  const [addOpen, setAddOpen] = useState(false);
  const [addSource, setAddSource] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seedAfterDownload, setSeedAfterDownloadState] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, nextStats, settings] = await Promise.all([
        api.downloadsList(),
        api.downloadsStats(),
        api.downloadsSettings(),
      ]);
      setTorrents(list);
      setStats(nextStats);
      setSeedAfterDownloadState(settings.seedAfterDownload);
      setLoadError(null);
      setSelectedIds((current) => {
        if (current.length === 0 && list[0]) return [list[0].id];
        const alive = current.filter((id) => list.some((t) => t.id === id));
        if (alive.length > 0) return alive;
        return list[0] ? [list[0].id] : [];
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

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

  const selectTorrent = useCallback(
    (id: string, options?: { additive?: boolean; range?: boolean }) => {
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
    },
    [filteredTorrents],
  );

  const runOnSelected = useCallback(
    async (
      action: (id: string) => Promise<TorrentDto | { ok: true }>,
      optimisticStatus?: "paused" | "stopped" | "downloading" | "seeding",
    ) => {
      if (selectedIds.length === 0) return;
      const ids = [...selectedIds];
      if (optimisticStatus) {
        setTorrents((current) =>
          current.map((torrent) => {
            if (!ids.includes(torrent.id)) return torrent;
            const idle = optimisticStatus === "paused" || optimisticStatus === "stopped";
            return {
              ...torrent,
              status:
                optimisticStatus === "downloading" || optimisticStatus === "seeding"
                  ? torrent.progress >= 1
                    ? "seeding"
                    : "downloading"
                  : optimisticStatus,
              downSpeed: idle ? "0 B/s" : torrent.downSpeed,
              upSpeed: idle ? "0 B/s" : torrent.upSpeed,
              peers: idle ? { connected: 0, total: torrent.peers.total } : torrent.peers,
              peersList: idle ? [] : torrent.peersList,
              error: optimisticStatus === "paused" || optimisticStatus === "stopped" ? null : torrent.error,
            };
          }),
        );
      }
      setBusy(true);
      setLoadError(null);
      try {
        const results = await Promise.all(ids.map((id) => action(id)));
        const updated = results.filter((entry): entry is TorrentDto => "id" in entry && "status" in entry);
        if (updated.length > 0) {
          setTorrents((current) => {
            const byId = new Map(updated.map((torrent) => [torrent.id, torrent]));
            return current.map((torrent) => byId.get(torrent.id) ?? torrent);
          });
        }
        await refresh();
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [selectedIds, refresh],
  );

  const pauseSelected = useCallback(
    () => runOnSelected((id) => api.downloadsPause(id), "paused"),
    [runOnSelected],
  );
  const resumeSelected = useCallback(
    () => runOnSelected((id) => api.downloadsResume(id), "downloading"),
    [runOnSelected],
  );
  const stopSelected = useCallback(
    () => runOnSelected((id) => api.downloadsStop(id), "stopped"),
    [runOnSelected],
  );
  const removeSelected = useCallback(
    () =>
      runOnSelected(async (id) => {
        await api.downloadsRemove(id, false);
        return { ok: true as const };
      }),
    [runOnSelected],
  );

  const openAddTorrent = useCallback(() => {
    setAddSource("");
    setAddError(null);
    setAddOpen(true);
  }, []);

  const closeAddTorrent = useCallback(() => {
    setAddOpen(false);
    setAddError(null);
  }, []);

  const submitAddTorrent = useCallback(async () => {
    const source = addSource.trim();
    if (!source) {
      setAddError("Paste a magnet link or .torrent URL");
      return;
    }
    setBusy(true);
    setAddError(null);
    try {
      const torrent = await api.downloadsAdd(source);
      setAddOpen(false);
      setAddSource("");
      setSelectedIds([torrent.id]);
      await refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [addSource, refresh]);

  const openSettings = useCallback(() => {
    setSettingsError(null);
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setSettingsError(null);
  }, []);

  const setSeedAfterDownload = useCallback(
    async (value: boolean) => {
      setSettingsBusy(true);
      setSettingsError(null);
      const previous = seedAfterDownload;
      setSeedAfterDownloadState(value);
      try {
        const settings = await api.downloadsUpdateSettings({ seedAfterDownload: value });
        setSeedAfterDownloadState(settings.seedAfterDownload);
        await refresh();
      } catch (err) {
        setSeedAfterDownloadState(previous);
        setSettingsError(err instanceof Error ? err.message : String(err));
      } finally {
        setSettingsBusy(false);
      }
    },
    [seedAfterDownload, refresh],
  );

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
    globalStats: toGlobalStats(stats, torrents.length),
    pauseSelected,
    resumeSelected,
    stopSelected,
    removeSelected,
    addTorrentStub: openAddTorrent,
    openAddTorrent,
    closeAddTorrent,
    submitAddTorrent,
    addOpen,
    addSource,
    setAddSource,
    addError,
    busy,
    loadError,
    settingsOpen,
    openSettings,
    closeSettings,
    seedAfterDownload,
    setSeedAfterDownload,
    settingsBusy,
    settingsError,
  };
}

export type DownloadsViewModel = ReturnType<typeof useDownloads>;
