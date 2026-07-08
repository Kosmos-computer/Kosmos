/**
 * Share service — opaque public links scoped to one os.files@1 entry (and its
 * subtree when the entry is a folder). Public access never uses session auth
 * or internal file ids in URLs.
 */
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { FOLDER_MIME, type FileEntry } from "../../shared/capabilities/files.js";
import type { ShareCreateInput, ShareMode, ShareRecord } from "../../shared/capabilities/shares.js";
import { SHARES_CHANGED_TOPIC } from "../../shared/capabilities/shares.js";
import { hashPassword, verifyPassword } from "../auth/userStore.js";
import { dataDirs } from "../env.js";
import { announceAppEvent } from "../bus.js";
import { filesService } from "./filesService.js";

function announceChange(): void {
  announceAppEvent(SHARES_CHANGED_TOPIC, { appId: "system" });
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(dataDirs.db, { recursive: true });
    db = new Database(path.join(dataDirs.db, "system-shares.sqlite"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        fileId TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'download',
        allowDownload INTEGER NOT NULL DEFAULT 1,
        passwordHash TEXT,
        expiresAt TEXT,
        label TEXT,
        revokedAt TEXT,
        createdAt TEXT NOT NULL,
        accessCount INTEGER NOT NULL DEFAULT 0,
        lastAccessAt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_shares_file ON shares(fileId);
      CREATE INDEX IF NOT EXISTS idx_shares_creator ON shares(createdBy);
    `);
  }
  return db;
}

interface ShareRow {
  id: string;
  token: string;
  fileId: string;
  createdBy: string;
  mode: string;
  allowDownload: number;
  passwordHash: string | null;
  expiresAt: string | null;
  label: string | null;
  revokedAt: string | null;
  createdAt: string;
  accessCount: number;
  lastAccessAt: string | null;
}

function toRecord(row: ShareRow): ShareRecord {
  return {
    id: row.id,
    token: row.token,
    fileId: row.fileId,
    createdBy: row.createdBy,
    mode: row.mode as ShareMode,
    allowDownload: row.allowDownload === 1,
    expiresAt: row.expiresAt,
    label: row.label,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    accessCount: row.accessCount,
    lastAccessAt: row.lastAccessAt,
    hasPassword: Boolean(row.passwordHash),
  };
}

function mintToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function parseExpiry(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59.999Z`).toISOString();
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid expiresAt date");
  return date.toISOString();
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime();
}

/** True if `candidateId` is the root or lives under the shared folder subtree. */
function isInSharedSubtree(candidateId: string, rootId: string, rootIsFolder: boolean): boolean {
  if (candidateId === rootId) return true;
  if (!rootIsFolder) return false;
  let current = filesService.get(candidateId);
  while (current.parentId) {
    if (current.parentId === rootId) return true;
    current = filesService.get(current.parentId);
  }
  return false;
}

export interface ResolvedShare {
  share: ShareRecord;
  file: FileEntry;
}

export class ShareAccessError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404 | 410 = 404,
  ) {
    super(message);
    this.name = "ShareAccessError";
  }
}

export const shareService = {
  create(input: ShareCreateInput, createdBy: string): ShareRecord {
    const file = filesService.get(input.fileId);
    if (file.trashed) throw new Error("Cannot share trashed items");

    const now = new Date().toISOString();
    const mode: ShareMode = input.mode ?? "download";
    const allowDownload = input.allowDownload ?? mode !== "view";
    const passwordHash = input.password?.trim() ? hashPassword(input.password.trim()) : null;

    const row: ShareRow = {
      id: crypto.randomUUID(),
      token: mintToken(),
      fileId: file.id,
      createdBy,
      mode,
      allowDownload: allowDownload ? 1 : 0,
      passwordHash,
      expiresAt: parseExpiry(input.expiresAt),
      label: input.label?.trim() || null,
      revokedAt: null,
      createdAt: now,
      accessCount: 0,
      lastAccessAt: null,
    };

    getDb()
      .prepare(
        `INSERT INTO shares (
          id, token, fileId, createdBy, mode, allowDownload, passwordHash,
          expiresAt, label, revokedAt, createdAt, accessCount, lastAccessAt
        ) VALUES (
          $id, $token, $fileId, $createdBy, $mode, $allowDownload, $passwordHash,
          $expiresAt, $label, $revokedAt, $createdAt, $accessCount, $lastAccessAt
        )`,
      )
      .run(row);

    announceChange();
    return toRecord(row);
  },

  list(params: { fileId?: string; createdBy?: string } = {}): ShareRecord[] {
    let sql = "SELECT * FROM shares WHERE revokedAt IS NULL";
    const args: Record<string, string> = {};
    if (params.fileId) {
      sql += " AND fileId = $fileId";
      args.fileId = params.fileId;
    }
    if (params.createdBy) {
      sql += " AND createdBy = $createdBy";
      args.createdBy = params.createdBy;
    }
    sql += " ORDER BY createdAt DESC";
    const rows = getDb().prepare(sql).all(args) as ShareRow[];
    return rows.map(toRecord).filter((s) => !isExpired(s.expiresAt));
  },

  get(id: string): ShareRecord {
    const row = getDb().prepare("SELECT * FROM shares WHERE id = ?").get(id) as ShareRow | undefined;
    if (!row) throw new Error(`Share not found: ${id}`);
    return toRecord(row);
  },

  revoke(id: string): ShareRecord {
    const existing = shareService.get(id);
    if (existing.revokedAt) return existing;
    const now = new Date().toISOString();
    getDb().prepare("UPDATE shares SET revokedAt = ? WHERE id = ?").run(now, id);
    announceChange();
    return { ...existing, revokedAt: now };
  },

  update(
    id: string,
    patch: {
      mode?: ShareMode;
      allowDownload?: boolean;
      password?: string;
      expiresAt?: string | null;
      label?: string | null;
    },
  ): ShareRecord {
    const existing = shareService.get(id);
    if (existing.revokedAt) throw new Error("Share is revoked");

    const row = getDb().prepare("SELECT * FROM shares WHERE id = ?").get(id) as ShareRow;
    const mode = patch.mode ?? existing.mode;
    const allowDownload = patch.allowDownload ?? existing.allowDownload;
    let passwordHash = row.passwordHash;
    if (patch.password !== undefined) {
      passwordHash = patch.password.trim() ? hashPassword(patch.password.trim()) : null;
    }
    const expiresAt =
      patch.expiresAt !== undefined ? parseExpiry(patch.expiresAt) : existing.expiresAt;
    const label = patch.label !== undefined ? patch.label?.trim() || null : existing.label;

    getDb()
      .prepare(
        `UPDATE shares SET mode = ?, allowDownload = ?, passwordHash = ?, expiresAt = ?, label = ? WHERE id = ?`,
      )
      .run(mode, allowDownload ? 1 : 0, passwordHash, expiresAt, label, id);

    announceChange();
    return shareService.get(id);
  },

  /** Load share metadata without password verification or access counting. */
  peekToken(token: string): ShareRecord & { fileName: string } {
    const row = getDb().prepare("SELECT * FROM shares WHERE token = ?").get(token) as ShareRow | undefined;
    if (!row) throw new ShareAccessError("Share not found", 404);
    const share = toRecord(row);
    if (share.revokedAt) throw new ShareAccessError("Share has been revoked", 410);
    if (isExpired(share.expiresAt)) throw new ShareAccessError("Share has expired", 410);
    const file = filesService.get(share.fileId);
    if (file.trashed) throw new ShareAccessError("File is no longer available", 404);
    return { ...share, fileName: file.name };
  },

  /** Resolve a public token after password and expiry checks. */
  resolveToken(token: string, password?: string): ResolvedShare {
    const row = getDb().prepare("SELECT * FROM shares WHERE token = ?").get(token) as ShareRow | undefined;
    if (!row) throw new ShareAccessError("Share not found", 404);
    const share = toRecord(row);
    if (share.revokedAt) throw new ShareAccessError("Share has been revoked", 410);
    if (isExpired(share.expiresAt)) throw new ShareAccessError("Share has expired", 410);

    if (share.hasPassword) {
      const rowWithHash = row;
      if (!password || !rowWithHash.passwordHash || !verifyPassword(password, rowWithHash.passwordHash)) {
        throw new ShareAccessError("Password required", 401);
      }
    }

    const file = filesService.get(share.fileId);
    if (file.trashed) throw new ShareAccessError("File is no longer available", 404);

    const now = new Date().toISOString();
    getDb()
      .prepare("UPDATE shares SET accessCount = accessCount + 1, lastAccessAt = ? WHERE id = ?")
      .run(now, share.id);

    return { share: { ...share, accessCount: share.accessCount + 1, lastAccessAt: now }, file };
  },

  assertFileAccess(resolved: ResolvedShare, targetFileId: string): FileEntry {
    const rootIsFolder = resolved.file.mimeType === FOLDER_MIME;
    if (!isInSharedSubtree(targetFileId, resolved.file.id, rootIsFolder)) {
      throw new ShareAccessError("Access denied", 403);
    }
    const entry = filesService.get(targetFileId);
    if (entry.trashed) throw new ShareAccessError("File is no longer available", 404);
    return entry;
  },

  canDownload(resolved: ResolvedShare): boolean {
    return resolved.share.allowDownload && resolved.share.mode === "download";
  },

  listPublicChildren(resolved: ResolvedShare): FileEntry[] {
    if (resolved.file.mimeType !== FOLDER_MIME) {
      throw new ShareAccessError("Not a folder", 403);
    }
    return filesService.list({ parentId: resolved.file.id, trashed: false });
  },
};
