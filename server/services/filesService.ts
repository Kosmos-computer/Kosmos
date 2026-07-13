/**
 * System files service — the OS-owned canonical file store and the default
 * provider for os.files@1 (the calendarService pattern).
 *
 * Metadata lives in SQLite; content lives as one blob file per entry under
 * data/files/ (simpler than SQLite blobs for large media, and a nightly
 * `tar` of the data dir keeps working as the backup story). Deletion is
 * two-phase: trash (recoverable, still listed under trashed=true) then
 * permanent delete, which also removes the blob and any descendants.
 */
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import {
  FILES_CHANGED_TOPIC,
  FOLDER_MIME,
  isBinaryMime,
  type FileCreateInput,
  type FileEntry,
} from "../../shared/capabilities/files.js";
import { MUSIC_SEED_TRACKS } from "../../shared/musicSeed.js";
import {
  DRIVE_SEED_FILES,
  DRIVE_SEED_FOLDERS,
  MUSIC_FOLDER_NAME,
} from "../seeds/driveSeedData.js";
import { resolveSeedTrack } from "./musicSeedService.js";
import { dataDirs } from "../env.js";
import { announceAppEvent } from "../bus.js";

/** Content larger than this is rejected for most files — large enough for seed MP3s (Glow ≈ 10 MB). */
const MAX_CONTENT_BYTES = 12 * 1024 * 1024;
/** Podcast episodes can be longer — allow up to 100 MB in Drive. */
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

const BLOBS_DIR = path.join(dataDirs.root, "files");
const moduleDir =
  typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));
const SEED_PDF_PATH = path.join(moduleDir, "../seeds/arco-test.pdf");
const SEED_PDF_NAME = "Arco Sample.pdf";

function announceChange(): void {
  announceAppEvent(FILES_CHANGED_TOPIC, { appId: "system" });
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(dataDirs.db, { recursive: true });
    fs.mkdirSync(BLOBS_DIR, { recursive: true });
    db = new Database(path.join(dataDirs.db, "system-files.sqlite"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parentId TEXT,
        mimeType TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        starred INTEGER NOT NULL DEFAULT 0,
        trashed INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parentId);
      CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
    `);
  }
  return db;
}

interface FileRow {
  id: string;
  name: string;
  parentId: string | null;
  mimeType: string;
  size: number;
  starred: number;
  trashed: number;
  createdAt: string;
  updatedAt: string;
}

function toEntry(row: FileRow): FileEntry {
  return { ...row, starred: row.starred === 1, trashed: row.trashed === 1 };
}

function blobPath(id: string): string {
  // Ids are server-minted UUIDs, so the path can't traverse.
  return path.join(BLOBS_DIR, id);
}

function requireEntry(id: string): FileEntry {
  const row = getDb().prepare("SELECT * FROM files WHERE id = ?").get(id) as FileRow | undefined;
  if (!row) throw new Error(`File not found: ${id}`);
  return toEntry(row);
}

function requireFolder(parentId: string | null): void {
  if (parentId === null) return;
  const parent = requireEntry(parentId);
  if (parent.mimeType !== FOLDER_MIME) throw new Error(`Not a folder: ${parentId}`);
  if (parent.trashed) throw new Error(`Folder is in the trash: ${parentId}`);
}

/** Every id in the subtree rooted at `id` (inclusive), folders first. */
function subtreeIds(id: string): string[] {
  const out: string[] = [id];
  const children = getDb().prepare("SELECT id FROM files WHERE parentId = ?").all(id) as {
    id: string;
  }[];
  for (const child of children) out.push(...subtreeIds(child.id));
  return out;
}

function seedEntryExists(name: string, parentId: string | null): boolean {
  const row = getDb()
    .prepare(
      `SELECT id FROM files
       WHERE name = ? AND trashed = 0
         AND ((parentId IS NULL AND ? IS NULL) OR parentId = ?)
       LIMIT 1`,
    )
    .get(name, parentId, parentId) as { id: string } | undefined;
  return Boolean(row);
}

function insertSeedFile(entry: FileEntry, content?: Buffer | string): void {
  getDb()
    .prepare(
      `INSERT INTO files (id, name, parentId, mimeType, size, starred, trashed, createdAt, updatedAt)
       VALUES ($id, $name, $parentId, $mimeType, $size, $starred, 0, $createdAt, $updatedAt)`,
    )
    .run({
      id: entry.id,
      name: entry.name,
      parentId: entry.parentId,
      mimeType: entry.mimeType,
      size: entry.size,
      starred: entry.starred ? 1 : 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  if (content !== undefined) {
    if (Buffer.isBuffer(content)) fs.writeFileSync(blobPath(entry.id), content);
    else fs.writeFileSync(blobPath(entry.id), content, "utf-8");
  }
}

function insertSeedFolder(name: string, parentId: string | null): FileEntry {
  const now = new Date().toISOString();
  const entry: FileEntry = {
    id: crypto.randomUUID(),
    name,
    parentId,
    mimeType: FOLDER_MIME,
    size: 0,
    starred: false,
    trashed: false,
    createdAt: now,
    updatedAt: now,
  };
  insertSeedFile(entry);
  return entry;
}

function findFolderId(name: string, parentId: string | null): string | undefined {
  const row = getDb()
    .prepare(
      `SELECT id FROM files
       WHERE name = ? AND mimeType = ? AND trashed = 0
         AND ((parentId IS NULL AND ? IS NULL) OR parentId = ?)
       LIMIT 1`,
    )
    .get(name, FOLDER_MIME, parentId, parentId) as { id: string } | undefined;
  return row?.id;
}

function seedDriveCatalog(): void {
  const folderIds = new Map<string, string>();

  for (const folder of DRIVE_SEED_FOLDERS) {
    const parentId = folder.parent ? (folderIds.get(folder.parent) ?? null) : null;
    const path = folder.parent ? `${folder.parent}/${folder.name}` : folder.name;
    if (folder.parent && !parentId) continue;

    const existingId = findFolderId(folder.name, parentId);
    if (existingId) {
      folderIds.set(path, existingId);
      continue;
    }

    const created = insertSeedFolder(folder.name, parentId);
    folderIds.set(path, created.id);
  }

  let seeded = 0;
  for (const file of DRIVE_SEED_FILES) {
    const parentId = file.folder ? (folderIds.get(file.folder) ?? null) : null;
    if (file.folder && !parentId) continue;
    if (seedEntryExists(file.name, parentId)) continue;

    const content = file.content;
    const size = Buffer.byteLength(content, "utf-8");
    const now = new Date().toISOString();
    const entry: FileEntry = {
      id: crypto.randomUUID(),
      name: file.name,
      parentId,
      mimeType: file.mimeType,
      size,
      starred: Boolean(file.starred),
      trashed: false,
      createdAt: now,
      updatedAt: now,
    };
    insertSeedFile(entry, content);
    seeded += 1;
  }

  if (seeded > 0) {
    announceChange();
    console.log(`[files] seeded ${seeded} Drive sample file(s)`);
  }

  seedMusicLibrary();
}

/** Import tirufm seed MP3s into the Drive Music folder (idempotent by name). */
function seedMusicLibrary(): void {
  const musicFolderId = findFolderId(MUSIC_FOLDER_NAME, null);
  if (!musicFolderId) return;

  let seeded = 0;
  for (const track of MUSIC_SEED_TRACKS) {
    if (seedEntryExists(track.fileName, musicFolderId)) continue;

    const resolved = resolveSeedTrack(track.id);
    if (!resolved) {
      console.warn(`[files] skipping ${track.fileName}: source MP3 not found`);
      continue;
    }

    const data = fs.readFileSync(resolved.absPath);
    if (data.length > MAX_CONTENT_BYTES) {
      console.warn(`[files] skipping ${track.fileName}: exceeds ${MAX_CONTENT_BYTES} byte limit`);
      continue;
    }

    const now = new Date().toISOString();
    const entry: FileEntry = {
      id: crypto.randomUUID(),
      name: track.fileName,
      parentId: musicFolderId,
      mimeType: "audio/mpeg",
      size: data.length,
      starred: false,
      trashed: false,
      createdAt: now,
      updatedAt: now,
    };
    insertSeedFile(entry, data);
    seeded += 1;
  }

  if (seeded > 0) {
    announceChange();
    console.log(`[files] seeded ${seeded} music file(s) into ${MUSIC_FOLDER_NAME}`);
  }
}

export const filesService = {
  list(params: { parentId?: string | null; trashed?: boolean; starred?: boolean } = {}): FileEntry[] {
    const dbh = getDb();
    let rows: FileRow[];
    if (params.starred) {
      rows = dbh
        .prepare("SELECT * FROM files WHERE starred = 1 AND trashed = 0 ORDER BY name ASC LIMIT 500")
        .all() as FileRow[];
    } else if (params.trashed) {
      rows = dbh
        .prepare("SELECT * FROM files WHERE trashed = 1 ORDER BY updatedAt DESC LIMIT 500")
        .all() as FileRow[];
    } else if (params.parentId == null) {
      rows = dbh
        .prepare("SELECT * FROM files WHERE parentId IS NULL AND trashed = 0 ORDER BY mimeType = 'inode/directory' DESC, name ASC LIMIT 500")
        .all() as FileRow[];
    } else {
      rows = dbh
        .prepare("SELECT * FROM files WHERE parentId = ? AND trashed = 0 ORDER BY mimeType = 'inode/directory' DESC, name ASC LIMIT 500")
        .all(params.parentId) as FileRow[];
    }
    return rows.map(toEntry);
  },

  get(id: string): FileEntry {
    return requireEntry(id);
  },

  search(query: string): FileEntry[] {
    const q = query.trim();
    if (!q) return [];
    const rows = getDb()
      .prepare(
        "SELECT * FROM files WHERE trashed = 0 AND name LIKE ? ESCAPE '\\' ORDER BY name ASC LIMIT 100",
      )
      .all(`%${q.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`) as FileRow[];
    return rows.map(toEntry);
  },

  /** Non-folder entries sorted by last update — the Drive "Recent" view. */
  recent(limit = 20): FileEntry[] {
    const rows = getDb()
      .prepare(
        "SELECT * FROM files WHERE trashed = 0 AND mimeType != ? ORDER BY updatedAt DESC LIMIT ?",
      )
      .all(FOLDER_MIME, limit) as FileRow[];
    return rows.map(toEntry);
  },

  create(input: FileCreateInput, options?: { maxBytes?: number }): FileEntry {
    const name = input.name?.trim();
    if (!name) throw new Error("name is required");
    const parentId = input.parentId ?? null;
    requireFolder(parentId);

    const isFolder = input.kind === "folder";
    const mimeType = isFolder ? FOLDER_MIME : input.mimeType?.trim() || "text/plain";
    const content = isFolder ? undefined : (input.content ?? "");
    const contentBase64 = isFolder ? undefined : input.contentBase64;
    const maxBytes = options?.maxBytes ?? MAX_CONTENT_BYTES;
    let size = 0;
    let blob: Buffer | string | undefined;
    if (contentBase64 !== undefined) {
      blob = Buffer.from(contentBase64, "base64");
      size = blob.length;
    } else if (content !== undefined) {
      blob = content;
      size = Buffer.byteLength(content, "utf-8");
    }
    if (size > maxBytes) throw new Error(`Content exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit`);

    const now = new Date().toISOString();
    const entry: FileEntry = {
      id: crypto.randomUUID(),
      name,
      parentId,
      mimeType,
      size,
      starred: false,
      trashed: false,
      createdAt: now,
      updatedAt: now,
    };
    getDb()
      .prepare(
        `INSERT INTO files (id, name, parentId, mimeType, size, starred, trashed, createdAt, updatedAt)
         VALUES ($id, $name, $parentId, $mimeType, $size, 0, 0, $createdAt, $updatedAt)`,
      )
      .run({
        id: entry.id,
        name: entry.name,
        parentId: entry.parentId,
        mimeType: entry.mimeType,
        size: entry.size,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    if (blob !== undefined) {
      if (Buffer.isBuffer(blob)) fs.writeFileSync(blobPath(entry.id), blob);
      else fs.writeFileSync(blobPath(entry.id), blob, "utf-8");
    }
    announceChange();
    return entry;
  },

  rename(id: string, name: string): FileEntry {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("name is required");
    requireEntry(id);
    getDb()
      .prepare("UPDATE files SET name = ?, updatedAt = ? WHERE id = ?")
      .run(trimmed, new Date().toISOString(), id);
    announceChange();
    return requireEntry(id);
  },

  move(id: string, parentId: string | null): FileEntry {
    const entry = requireEntry(id);
    requireFolder(parentId);
    // A folder must never move into its own subtree.
    if (parentId !== null && entry.mimeType === FOLDER_MIME && subtreeIds(id).includes(parentId)) {
      throw new Error("Cannot move a folder into itself");
    }
    getDb()
      .prepare("UPDATE files SET parentId = ?, updatedAt = ? WHERE id = ?")
      .run(parentId, new Date().toISOString(), id);
    announceChange();
    return requireEntry(id);
  },

  star(id: string, starred: boolean): FileEntry {
    requireEntry(id);
    getDb()
      .prepare("UPDATE files SET starred = ?, updatedAt = ? WHERE id = ?")
      .run(starred ? 1 : 0, new Date().toISOString(), id);
    announceChange();
    return requireEntry(id);
  },

  trash(id: string): FileEntry {
    requireEntry(id);
    // Trash the whole subtree so nothing keeps living inside a trashed folder.
    const stmt = getDb().prepare("UPDATE files SET trashed = 1, updatedAt = ? WHERE id = ?");
    const now = new Date().toISOString();
    for (const each of subtreeIds(id)) stmt.run(now, each);
    announceChange();
    return requireEntry(id);
  },

  restore(id: string): FileEntry {
    const entry = requireEntry(id);
    const stmt = getDb().prepare("UPDATE files SET trashed = 0, updatedAt = ? WHERE id = ?");
    const now = new Date().toISOString();
    for (const each of subtreeIds(id)) stmt.run(now, each);
    // A child restored out of a trashed parent would be invisible — reroot it.
    if (entry.parentId) {
      const parent = requireEntry(entry.parentId);
      if (parent.trashed) {
        getDb().prepare("UPDATE files SET parentId = NULL WHERE id = ?").run(id);
      }
    }
    announceChange();
    return requireEntry(id);
  },

  delete(id: string): boolean {
    requireEntry(id);
    const ids = subtreeIds(id);
    const stmt = getDb().prepare("DELETE FROM files WHERE id = ?");
    for (const each of ids) {
      stmt.run(each);
      fs.rmSync(blobPath(each), { force: true });
    }
    announceChange();
    return true;
  },

  readContent(id: string): { id: string; name: string; mimeType: string; content: string } {
    const entry = requireEntry(id);
    if (entry.mimeType === FOLDER_MIME) throw new Error("Folders have no content");
    if (isBinaryMime(entry.mimeType)) {
      throw new Error(`Binary content must be fetched via blob endpoint: ${entry.mimeType}`);
    }
    let content = "";
    try {
      content = fs.readFileSync(blobPath(id), "utf-8");
    } catch {
      // Entry exists but blob was never written — treat as empty.
    }
    return { id: entry.id, name: entry.name, mimeType: entry.mimeType, content };
  },

  readBlob(id: string): { entry: FileEntry; data: Buffer } {
    const entry = requireEntry(id);
    if (entry.mimeType === FOLDER_MIME) throw new Error("Folders have no content");
    let data = Buffer.alloc(0);
    try {
      data = fs.readFileSync(blobPath(id));
    } catch {
      // Entry exists but blob was never written — treat as empty.
    }
    return { entry, data };
  },

  writeContent(id: string, content: string): FileEntry {
    const entry = requireEntry(id);
    if (entry.mimeType === FOLDER_MIME) throw new Error("Folders have no content");
    if (isBinaryMime(entry.mimeType)) throw new Error(`Binary content is read-only: ${entry.mimeType}`);
    const size = Buffer.byteLength(content, "utf-8");
    if (size > MAX_CONTENT_BYTES) throw new Error("Content exceeds the 10 MB limit");
    fs.writeFileSync(blobPath(id), content, "utf-8");
    getDb()
      .prepare("UPDATE files SET size = ?, updatedAt = ? WHERE id = ?")
      .run(size, new Date().toISOString(), id);
    announceChange();
    return requireEntry(id);
  },

  /**
   * Import a file already on disk into Drive by copying into the blob store.
   * Used by Downloads (torrent complete) so we avoid base64 round-trips.
   */
  createFromPath(
    input: { name: string; parentId?: string | null; mimeType?: string; sourcePath: string },
    options?: { maxBytes?: number },
  ): FileEntry {
    const name = input.name?.trim();
    if (!name) throw new Error("name is required");
    const sourcePath = input.sourcePath;
    if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error("Source file not found");
    const parentId = input.parentId ?? null;
    requireFolder(parentId);

    const stat = fs.statSync(sourcePath);
    if (!stat.isFile()) throw new Error("Source path is not a file");
    const maxBytes = options?.maxBytes ?? MAX_CONTENT_BYTES;
    if (stat.size > maxBytes) {
      throw new Error(`Content exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit`);
    }

    const mimeType = input.mimeType?.trim() || "application/octet-stream";
    const now = new Date().toISOString();
    const entry: FileEntry = {
      id: crypto.randomUUID(),
      name,
      parentId,
      mimeType,
      size: stat.size,
      starred: false,
      trashed: false,
      createdAt: now,
      updatedAt: now,
    };
    getDb()
      .prepare(
        `INSERT INTO files (id, name, parentId, mimeType, size, starred, trashed, createdAt, updatedAt)
         VALUES ($id, $name, $parentId, $mimeType, $size, 0, 0, $createdAt, $updatedAt)`,
      )
      .run({
        id: entry.id,
        name: entry.name,
        parentId: entry.parentId,
        mimeType: entry.mimeType,
        size: entry.size,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    fs.copyFileSync(sourcePath, blobPath(entry.id));
    announceChange();
    return entry;
  },

  /** Idempotent sample content for Drive — PDF smoke test + office-suite catalog. */
  ensureSeeds(): void {
    seedPdf();
    seedDriveCatalog();
  },
};

function seedPdf(): void {
  const existing = getDb()
    .prepare("SELECT id FROM files WHERE name = ? AND parentId IS NULL AND trashed = 0 LIMIT 1")
    .get(SEED_PDF_NAME) as { id: string } | undefined;
  if (existing) return;
  if (!fs.existsSync(SEED_PDF_PATH)) {
    console.warn(`[files] missing seed PDF at ${SEED_PDF_PATH}`);
    return;
  }
  const data = fs.readFileSync(SEED_PDF_PATH);
  const now = new Date().toISOString();
  const entry: FileEntry = {
    id: crypto.randomUUID(),
    name: SEED_PDF_NAME,
    parentId: null,
    mimeType: "application/pdf",
    size: data.length,
    starred: true,
    trashed: false,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO files (id, name, parentId, mimeType, size, starred, trashed, createdAt, updatedAt)
       VALUES ($id, $name, $parentId, $mimeType, $size, 1, 0, $createdAt, $updatedAt)`,
    )
    .run({
      id: entry.id,
      name: entry.name,
      parentId: entry.parentId,
      mimeType: entry.mimeType,
      size: entry.size,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  fs.writeFileSync(blobPath(entry.id), data);
  announceChange();
  console.log(`[files] seeded ${SEED_PDF_NAME}`);
}
