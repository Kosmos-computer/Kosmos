/**
 * Category / tracker filter helpers for the Downloads sidebar.
 * Mock torrent fixtures were removed once os.downloads@1 went live.
 */
import type { CategoryFilter, TorrentItem, TrackerGroup } from "./types";

export const CATEGORY_LABELS: Record<CategoryFilter["id"], string> = {
  all: "All",
  downloading: "Downloading",
  completed: "Completed",
  active: "Active",
  inactive: "Inactive",
  stopped: "Stopped",
  error: "Error",
};

export function buildCategoryFilters(torrents: TorrentItem[]): CategoryFilter[] {
  const counts: Record<CategoryFilter["id"], number> = {
    all: torrents.length,
    downloading: 0,
    completed: 0,
    active: 0,
    inactive: 0,
    stopped: 0,
    error: 0,
  };

  for (const torrent of torrents) {
    if (torrent.status === "downloading" || torrent.status === "checking") counts.downloading += 1;
    if (torrent.progress >= 1 || torrent.status === "seeding") counts.completed += 1;
    if (
      torrent.status === "downloading" ||
      torrent.status === "seeding" ||
      torrent.status === "checking"
    ) {
      counts.active += 1;
    }
    if (torrent.status === "paused") counts.inactive += 1;
    if (torrent.status === "stopped") counts.stopped += 1;
    if (torrent.status === "error") counts.error += 1;
  }

  return (Object.keys(CATEGORY_LABELS) as CategoryFilter["id"][]).map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    count: counts[id],
  }));
}

export function buildTrackerGroups(torrents: TorrentItem[]): TrackerGroup[] {
  const map = new Map<string, number>();
  for (const torrent of torrents) {
    const url = torrent.tracker || "—";
    map.set(url, (map.get(url) ?? 0) + 1);
  }
  return [...map.entries()].map(([url, count], index) => ({
    id: `tg-${index}`,
    url,
    count,
  }));
}
