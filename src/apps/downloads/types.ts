export type TorrentStatus =
  | "downloading"
  | "seeding"
  | "paused"
  | "stopped"
  | "error"
  | "queued"
  | "checking";

export type TorrentCategory =
  | "all"
  | "downloading"
  | "completed"
  | "active"
  | "inactive"
  | "stopped"
  | "error";

export type TorrentDetailTab = "general" | "trackers" | "peers" | "files" | "statistics";

export interface TorrentTracker {
  id: string;
  url: string;
  status: "working" | "updating" | "error";
  lastAnnounce: string;
  seeders: number;
  leechers: number;
}

export interface TorrentPeer {
  id: string;
  address: string;
  client: string;
  progress: number;
  downSpeed: string;
  upSpeed: string;
  flags: string;
}

export interface TorrentFile {
  id: string;
  name: string;
  size: string;
  progress: number;
  priority: "high" | "normal" | "low";
  wanted: boolean;
}

export interface TorrentItem {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  progress: number;
  status: TorrentStatus;
  seeds: { connected: number; total: number };
  peers: { connected: number; total: number };
  downSpeed: string;
  upSpeed: string;
  ratio: number;
  uploaded: string;
  downloaded: string;
  remaining: string;
  wasted: string;
  tracker: string;
  trackerUpdate: string;
  lastActive: string;
  maxPeers: number;
  downLimit: string;
  upLimit: string;
  error: string | null;
  addedAt: string;
  trackers: TorrentTracker[];
  peersList: TorrentPeer[];
  files: TorrentFile[];
}

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

export interface GlobalStats {
  clientVersion: string;
  host: string;
  globalDownSpeed: string;
  globalUpSpeed: string;
  freeSpace: string;
  totalSize: string;
}
