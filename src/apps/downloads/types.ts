/**
 * Downloads UI types — OS DTO shapes plus view-only filters/tabs.
 */
export type {
  DownloadsStatsDto as GlobalStats,
  TorrentDto as TorrentItem,
  TorrentFileDto as TorrentFile,
  TorrentPeerDto as TorrentPeer,
  TorrentStatus,
  TorrentTrackerDto as TorrentTracker,
} from "@shared/capabilities/downloads";

export type TorrentCategory =
  | "all"
  | "downloading"
  | "completed"
  | "active"
  | "inactive"
  | "stopped"
  | "error";

export type TorrentDetailTab = "general" | "trackers" | "peers" | "files" | "statistics";

export interface TrackerGroup {
  id: string;
  url: string;
  count: number;
}

export interface CategoryFilter {
  id: TorrentCategory;
  label: string;
  count: number;
}
