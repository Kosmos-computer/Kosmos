/**
 * os.music@1 — local music library owned by the OS.
 *
 * Seed tracks (tirufm catalog) plus user-imported audio (torrent downloads,
 * Drive files, disk paths, uploads). The Music system app and the agent both
 * talk to this contract.
 */

export const MUSIC_CONTRACT_ID = "os.music@1";

export type MusicArtTone =
  | "rose"
  | "orange"
  | "amber"
  | "lime"
  | "green"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "pink";

export interface MusicTrackDto {
  id: string;
  title: string;
  fileName: string;
  artists: string;
  album: string;
  artTone: MusicArtTone;
  available: boolean;
  /** "seed" = curated tirufm catalog; "library" = user-imported. */
  origin: "seed" | "library";
  importedAt?: string;
}

export interface MusicImportInput {
  /** Absolute path under data/torrents, MUSIC_SEED_DIR, or workspace. */
  path?: string;
  /** Drive (os.files) file id for an audio blob. */
  driveFileId?: string;
  /** Torrent info-hash; imports completed audio files from that torrent. */
  torrentId?: string;
  /** Optional basename / relative path filter when importing from a torrent. */
  fileName?: string;
  /** Override metadata (otherwise derived from filename / ID3). */
  title?: string;
  artists?: string;
  album?: string;
}

export interface MusicScanInput {
  /**
   * Where to look for audio:
   * - "torrents" (default) → data/torrents
   * - "seed" → MUSIC_SEED_DIR (extra files beyond the curated catalog)
   * - "path" → absolute directory under an allowed root (pass `path`)
   */
  source?: "torrents" | "seed" | "path";
  path?: string;
}

export const MUSIC_INTENTS = {
  "music.tracks.list": "read",
  "music.tracks.get": "read",
  "music.tracks.import": "write",
  "music.tracks.scan": "write",
  "music.tracks.remove": "write",
} as const;

export type MusicIntentId = keyof typeof MUSIC_INTENTS;

export const MUSIC_CHANGED_TOPIC = "music.changed";

export const MUSIC_INTENT_SCHEMAS: Record<MusicIntentId, Record<string, unknown>> = {
  "music.tracks.list": {
    type: "object",
    properties: {},
  },
  "music.tracks.get": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "music.tracks.import": {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute path to an audio file under torrents/seed/workspace" },
      driveFileId: { type: "string", description: "Drive file id for an audio blob" },
      torrentId: { type: "string", description: "Torrent info-hash; imports completed audio from it" },
      fileName: { type: "string", description: "Optional file filter when importing from a torrent" },
      title: { type: "string" },
      artists: { type: "string" },
      album: { type: "string" },
    },
  },
  "music.tracks.scan": {
    type: "object",
    properties: {
      source: {
        type: "string",
        enum: ["torrents", "seed", "path"],
        description: "Scan torrents dir (default), seed dir, or an allowed path",
      },
      path: { type: "string", description: "Required when source=path" },
    },
  },
  "music.tracks.remove": {
    type: "object",
    properties: {
      id: { type: "string", description: "Library track id (seed tracks cannot be removed)" },
    },
    required: ["id"],
  },
};
