/**
 * os.downloads@1 — BitTorrent client owned by the OS.
 *
 * Downloads land under data/torrents/; completed files may be imported into
 * Drive (os.files@1). The Downloads system app is a view over this contract.
 */

export const DOWNLOADS_CONTRACT_ID = "os.downloads@1";

export type TorrentStatus =
  | "downloading"
  | "seeding"
  | "paused"
  | "stopped"
  | "error"
  | "queued"
  | "checking";

export interface TorrentTrackerDto {
  id: string;
  url: string;
  status: "working" | "updating" | "error";
  lastAnnounce: string;
  seeders: number;
  leechers: number;
}

export interface TorrentPeerDto {
  id: string;
  address: string;
  client: string;
  progress: number;
  downSpeed: string;
  upSpeed: string;
  flags: string;
}

export interface TorrentFileDto {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  progress: number;
  priority: "high" | "normal" | "low";
  wanted: boolean;
  /** Absolute path on disk once the torrent has metadata. */
  path?: string;
}

export interface TorrentDto {
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
  savePath: string;
  magnetUri?: string;
  /** Drive folder created for this torrent (under Drive → Downloads). */
  driveFolderId: string | null;
  /** Drive file ids created when this torrent finished (small enough to import). */
  driveFileIds: string[];
  trackers: TorrentTrackerDto[];
  peersList: TorrentPeerDto[];
  files: TorrentFileDto[];
}

export interface DownloadsStatsDto {
  clientVersion: string;
  host: string;
  globalDownSpeed: string;
  globalUpSpeed: string;
  freeSpace: string;
  totalSize: string;
  torrentCount: number;
}

/** Client preferences for the Downloads app. */
export interface DownloadsSettingsDto {
  /** When true, finished torrents keep seeding. When false, they pause on complete. */
  seedAfterDownload: boolean;
}

export interface TorrentAddInput {
  /** Magnet URI or http(s) URL to a .torrent file. */
  source: string;
  /** Pause immediately after adding. */
  paused?: boolean;
}

export const DOWNLOADS_INTENTS = {
  "torrents.list": "read",
  "torrents.get": "read",
  "torrents.stats": "read",
  "torrents.add": "write",
  "torrents.pause": "write",
  "torrents.resume": "write",
  "torrents.stop": "write",
  "torrents.remove": "write",
} as const;

export type DownloadsIntentId = keyof typeof DOWNLOADS_INTENTS;

export const DOWNLOADS_CHANGED_TOPIC = "downloads.changed";

export const DOWNLOADS_INTENT_SCHEMAS: Record<DownloadsIntentId, Record<string, unknown>> = {
  "torrents.list": {
    type: "object",
    properties: {},
  },
  "torrents.get": {
    type: "object",
    properties: { id: { type: "string", description: "Torrent info-hash id" } },
    required: ["id"],
  },
  "torrents.stats": {
    type: "object",
    properties: {},
  },
  "torrents.add": {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Magnet URI (magnet:?xt=...) or http(s) URL to a .torrent file",
      },
      paused: { type: "boolean", description: "Add in paused state" },
    },
    required: ["source"],
  },
  "torrents.pause": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "torrents.resume": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "torrents.stop": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "torrents.remove": {
    type: "object",
    properties: {
      id: { type: "string" },
      deleteFiles: {
        type: "boolean",
        description: "When true, also delete downloaded data from disk",
      },
    },
    required: ["id"],
  },
};
