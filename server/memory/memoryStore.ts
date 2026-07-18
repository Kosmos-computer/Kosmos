/**
 * Memory document store — Phase 1 choke point for entries, collections, and
 * grants. Every read/write/search takes a principalId and checks ACLs before
 * touching SQLite. Vector/RAG backends land in Phase 2; this is keyword-only.
 *
 * Data: `data/memory/memory.db` (WAL), same better-sqlite3 posture as
 * transcription jobs and app-namespace DBs.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import type {
  MemoryAccess,
  MemoryCollection,
  MemoryEntry,
  MemoryGrant,
  MemoryKind,
  MemoryPrincipalId,
  MemoryStatus,
} from "../../shared/capabilities/memory.js";
import { dataDirs } from "../env.js";
import { appendAudit } from "../platform/grantStore.js";
import {
  MEMORY_KINDS,
  accessAtLeast,
  checkKindAccess,
  defaultSeedGrants,
  effectiveAccess,
  grantToRow,
  kindsReadable,
  rowToGrant,
  type GrantRow,
} from "./memoryGrantStore.js";

const KIND_NAMES: Record<MemoryKind, string> = {
  working: "Working",
  episodic: "Episodic",
  semantic: "Semantic",
  procedural: "Procedural",
  identity: "Identity",
  reference: "Reference",
};

export class MemoryAccessError extends Error {
  readonly status = 403 as const;
  constructor(message: string) {
    super(message);
    this.name = "MemoryAccessError";
  }
}

export class MemoryNotFoundError extends Error {
  readonly status = 404 as const;
  constructor(message: string) {
    super(message);
    this.name = "MemoryNotFoundError";
  }
}

interface EntryRow {
  id: string;
  kind: string;
  collection_id: string;
  title: string;
  summary: string;
  body: string | null;
  status: string;
  source: string;
  confidence: number;
  tags_json: string;
  source_session_id: string | null;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

interface CollectionRow {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  embedder_id: string;
  backend_id: string;
  vector_count: number;
  entry_count: number;
  dimensions: number;
  health: string;
  last_indexed: string;
  retention_days: number | null;
  created_at: string;
  updated_at: string;
}

let db: Database.Database | null = null;

function memoryDir(): string {
  return path.join(dataDirs.root, "memory");
}

function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(memoryDir(), { recursive: true });
  db = new Database(path.join(memoryDir(), "memory.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_collections (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      embedder_id TEXT NOT NULL,
      backend_id TEXT NOT NULL,
      vector_count INTEGER NOT NULL DEFAULT 0,
      entry_count INTEGER NOT NULL DEFAULT 0,
      dimensions INTEGER NOT NULL DEFAULT 0,
      health TEXT NOT NULL,
      last_indexed TEXT NOT NULL,
      retention_days INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      collection_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      body TEXT,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      confidence REAL NOT NULL,
      tags_json TEXT NOT NULL,
      source_session_id TEXT,
      last_accessed_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (collection_id) REFERENCES memory_collections(id)
    );
    CREATE INDEX IF NOT EXISTS idx_memory_entries_kind ON memory_entries(kind);
    CREATE INDEX IF NOT EXISTS idx_memory_entries_collection ON memory_entries(collection_id);
    CREATE INDEX IF NOT EXISTS idx_memory_entries_status ON memory_entries(status);
    CREATE INDEX IF NOT EXISTS idx_memory_entries_updated ON memory_entries(updated_at);

    CREATE TABLE IF NOT EXISTS memory_grants (
      principal_id TEXT NOT NULL,
      scope_key TEXT NOT NULL,
      access TEXT NOT NULL,
      PRIMARY KEY (principal_id, scope_key)
    );
  `);
  seedGrantsIfEmpty(db);
  return db;
}

function seedGrantsIfEmpty(database: Database.Database): void {
  const count = (database.prepare("SELECT COUNT(*) AS n FROM memory_grants").get() as { n: number }).n;
  if (count > 0) return;
  const insert = database.prepare(
    `INSERT INTO memory_grants (principal_id, scope_key, access) VALUES (?, ?, ?)`,
  );
  const tx = database.transaction(() => {
    for (const g of defaultSeedGrants()) {
      insert.run(g.principalId, g.scopeKey, g.access);
    }
  });
  tx();
}

function loadGrantRows(): GrantRow[] {
  return getDb()
    .prepare(`SELECT principal_id AS principalId, scope_key AS scopeKey, access FROM memory_grants`)
    .all() as GrantRow[];
}

function requireAccess(
  principalId: MemoryPrincipalId,
  kind: MemoryKind,
  need: MemoryAccess,
  collectionId?: string,
): void {
  const { allowed } = checkKindAccess(loadGrantRows(), principalId, kind, need, collectionId);
  if (!allowed) {
    throw new MemoryAccessError(
      `Principal "${principalId}" lacks ${need} access on memory kind "${kind}"`,
    );
  }
}

function requireGrantAdmin(principalId: MemoryPrincipalId): void {
  // Admin on any kind via all-scope, or admin on working (seeded via all).
  const access = effectiveAccess(loadGrantRows(), principalId, "working");
  if (!accessAtLeast(access, "admin")) {
    throw new MemoryAccessError(`Principal "${principalId}" cannot manage memory grants`);
  }
}

function rowToEntry(row: EntryRow): MemoryEntry {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags_json) as string[];
    if (!Array.isArray(tags)) tags = [];
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    kind: row.kind as MemoryKind,
    collectionId: row.collection_id,
    title: row.title,
    summary: row.summary,
    ...(row.body != null ? { body: row.body } : {}),
    status: row.status as MemoryStatus,
    source: row.source,
    confidence: row.confidence,
    tags,
    sourceSessionId: row.source_session_id,
    lastAccessedAt: row.last_accessed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCollection(row: CollectionRow): MemoryCollection {
  return {
    id: row.id,
    kind: row.kind as MemoryKind,
    name: row.name,
    ...(row.description != null ? { description: row.description } : {}),
    embedderId: row.embedder_id,
    backendId: row.backend_id,
    vectorCount: row.vector_count,
    entryCount: row.entry_count,
    dimensions: row.dimensions,
    health: row.health as MemoryCollection["health"],
    lastIndexed: row.last_indexed,
    retentionDays: row.retention_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function defaultCollectionId(kind: MemoryKind): string {
  return `${kind}:default`;
}

function bumpCollectionCount(collectionId: string, delta: number): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE memory_collections
       SET entry_count = MAX(0, entry_count + ?), updated_at = ?
       WHERE id = ?`,
    )
    .run(delta, now, collectionId);
}

function audit(
  principalId: MemoryPrincipalId,
  method: string,
  detail: string,
  allowed: boolean,
): void {
  appendAudit({
    caller: { kind: "agent", sessionId: `memory:${principalId}` },
    method,
    detail,
    allowed,
  });
}

export const memoryStore = {
  /** Ensure a default collection exists for this kind (idempotent). */
  ensureDefaultCollection(kind: MemoryKind): MemoryCollection {
    const id = defaultCollectionId(kind);
    const existing = getDb()
      .prepare(`SELECT * FROM memory_collections WHERE id = ?`)
      .get(id) as CollectionRow | undefined;
    if (existing) return rowToCollection(existing);

    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO memory_collections
         (id, kind, name, description, embedder_id, backend_id, vector_count, entry_count,
          dimensions, health, last_indexed, retention_days, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'none', 'document-sqlite', 0, 0, 0, 'healthy', ?, NULL, ?, ?)`,
      )
      .run(
        id,
        kind,
        `${KIND_NAMES[kind]} (default)`,
        `Default ${kind} collection`,
        now,
        now,
        now,
      );
    return this.getCollection(id)!;
  },

  listCollections(principalId: MemoryPrincipalId): MemoryCollection[] {
    const readable = kindsReadable(loadGrantRows(), principalId);
    if (readable.size === 0) return [];
    const rows = getDb()
      .prepare(`SELECT * FROM memory_collections ORDER BY kind, name`)
      .all() as CollectionRow[];
    return rows.map(rowToCollection).filter((c) => readable.has(c.kind));
  },

  getCollection(id: string): MemoryCollection | null {
    const row = getDb()
      .prepare(`SELECT * FROM memory_collections WHERE id = ?`)
      .get(id) as CollectionRow | undefined;
    return row ? rowToCollection(row) : null;
  },

  createCollection(
    principalId: MemoryPrincipalId,
    input: {
      kind: MemoryKind;
      name: string;
      description?: string;
      id?: string;
      retentionDays?: number | null;
    },
  ): MemoryCollection {
    requireAccess(principalId, input.kind, "write");
    if (!MEMORY_KINDS.includes(input.kind)) {
      throw new Error(`Invalid memory kind: ${input.kind}`);
    }
    const slug =
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "collection";
    let id = input.id?.trim() || `${input.kind}:${slug}`;
    if (this.getCollection(id)) {
      let n = 2;
      while (this.getCollection(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO memory_collections
         (id, kind, name, description, embedder_id, backend_id, vector_count, entry_count,
          dimensions, health, last_indexed, retention_days, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'none', 'document-sqlite', 0, 0, 0, 'healthy', ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.kind,
        input.name.trim(),
        input.description?.trim() ?? null,
        now,
        input.retentionDays ?? null,
        now,
        now,
      );
    audit(principalId, "memory.collection.create", id, true);
    return this.getCollection(id)!;
  },

  createEntry(
    principalId: MemoryPrincipalId,
    input: {
      kind: MemoryKind;
      title: string;
      summary: string;
      body?: string;
      tags?: string[];
      collectionId?: string;
      status?: MemoryStatus;
      source?: string;
      confidence?: number;
      sourceSessionId?: string | null;
    },
  ): MemoryEntry {
    if (!MEMORY_KINDS.includes(input.kind)) {
      throw new Error(`Invalid memory kind: ${input.kind}`);
    }
    const title = input.title.trim();
    const summary = input.summary.trim();
    if (!title || !summary) throw new Error("title and summary are required");

    const collection =
      input.collectionId != null
        ? this.getCollection(input.collectionId)
        : this.ensureDefaultCollection(input.kind);
    if (!collection) throw new MemoryNotFoundError("Collection not found");
    if (collection.kind !== input.kind) {
      throw new Error(`Collection ${collection.id} is kind ${collection.kind}, not ${input.kind}`);
    }

    requireAccess(principalId, input.kind, "write", collection.id);

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const tags = (input.tags ?? []).map(String).filter(Boolean);
    getDb()
      .prepare(
        `INSERT INTO memory_entries
         (id, kind, collection_id, title, summary, body, status, source, confidence,
          tags_json, source_session_id, last_accessed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.kind,
        collection.id,
        title,
        summary,
        input.body ?? null,
        input.status ?? "active",
        input.source ?? principalId,
        input.confidence ?? 80,
        JSON.stringify(tags),
        input.sourceSessionId ?? null,
        now,
        now,
        now,
      );
    bumpCollectionCount(collection.id, 1);
    audit(principalId, "memory.entry.create", id, true);
    return this.getEntry(principalId, id)!;
  },

  getEntry(principalId: MemoryPrincipalId, id: string): MemoryEntry | null {
    const row = getDb()
      .prepare(`SELECT * FROM memory_entries WHERE id = ?`)
      .get(id) as EntryRow | undefined;
    if (!row) return null;
    requireAccess(principalId, row.kind as MemoryKind, "read", row.collection_id);
    const now = new Date().toISOString();
    getDb()
      .prepare(`UPDATE memory_entries SET last_accessed_at = ? WHERE id = ?`)
      .run(now, id);
    return rowToEntry({ ...row, last_accessed_at: now });
  },

  listEntries(
    principalId: MemoryPrincipalId,
    opts: {
      kind?: MemoryKind;
      collectionId?: string;
      status?: MemoryStatus;
      q?: string;
      limit?: number;
    } = {},
  ): MemoryEntry[] {
    const readable = kindsReadable(loadGrantRows(), principalId);
    if (readable.size === 0) return [];

    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (opts.kind) {
      if (!readable.has(opts.kind)) return [];
      clauses.push("kind = ?");
      params.push(opts.kind);
    } else {
      const kinds = [...readable];
      clauses.push(`kind IN (${kinds.map(() => "?").join(",")})`);
      params.push(...kinds);
    }

    if (opts.collectionId) {
      clauses.push("collection_id = ?");
      params.push(opts.collectionId);
    }
    if (opts.status) {
      clauses.push("status = ?");
      params.push(opts.status);
    }
    if (opts.q?.trim()) {
      const like = `%${opts.q.trim().toLowerCase()}%`;
      clauses.push(
        `(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(COALESCE(body, '')) LIKE ?)`,
      );
      params.push(like, like, like);
    }

    params.push(limit);
    const sql = `SELECT * FROM memory_entries WHERE ${clauses.join(" AND ")}
                 ORDER BY updated_at DESC LIMIT ?`;
    const rows = getDb().prepare(sql).all(...params) as EntryRow[];
    return rows.map(rowToEntry);
  },

  updateEntry(
    principalId: MemoryPrincipalId,
    id: string,
    patch: {
      title?: string;
      summary?: string;
      body?: string | null;
      status?: MemoryStatus;
      tags?: string[];
      confidence?: number;
    },
  ): MemoryEntry {
    const row = getDb()
      .prepare(`SELECT * FROM memory_entries WHERE id = ?`)
      .get(id) as EntryRow | undefined;
    if (!row) throw new MemoryNotFoundError("Entry not found");
    requireAccess(principalId, row.kind as MemoryKind, "write", row.collection_id);

    const title = patch.title !== undefined ? patch.title.trim() : row.title;
    const summary = patch.summary !== undefined ? patch.summary.trim() : row.summary;
    const body = patch.body !== undefined ? patch.body : row.body;
    const status = patch.status ?? row.status;
    const confidence = patch.confidence ?? row.confidence;
    const tagsJson =
      patch.tags !== undefined ? JSON.stringify(patch.tags.map(String).filter(Boolean)) : row.tags_json;
    const now = new Date().toISOString();

    getDb()
      .prepare(
        `UPDATE memory_entries
         SET title = ?, summary = ?, body = ?, status = ?, confidence = ?,
             tags_json = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(title, summary, body, status, confidence, tagsJson, now, id);

    audit(principalId, "memory.entry.update", id, true);
    return this.getEntry(principalId, id)!;
  },

  deleteEntry(principalId: MemoryPrincipalId, id: string): boolean {
    const row = getDb()
      .prepare(`SELECT * FROM memory_entries WHERE id = ?`)
      .get(id) as EntryRow | undefined;
    if (!row) return false;
    requireAccess(principalId, row.kind as MemoryKind, "write", row.collection_id);
    getDb().prepare(`DELETE FROM memory_entries WHERE id = ?`).run(id);
    bumpCollectionCount(row.collection_id, -1);
    audit(principalId, "memory.entry.delete", id, true);
    return true;
  },

  /** Keyword search across title/summary/body for kinds the principal may read. */
  search(
    principalId: MemoryPrincipalId,
    opts: {
      query: string;
      kinds?: MemoryKind[];
      limit?: number;
    },
  ): MemoryEntry[] {
    const q = opts.query.trim();
    if (!q) return [];
    const readable = kindsReadable(loadGrantRows(), principalId);
    const kinds =
      opts.kinds && opts.kinds.length > 0
        ? opts.kinds.filter((k) => readable.has(k))
        : [...readable];
    if (kinds.length === 0) return [];

    const limit = Math.min(Math.max(opts.limit ?? 10, 1), 20);
    const like = `%${q.toLowerCase()}%`;
    const sql = `SELECT * FROM memory_entries
      WHERE kind IN (${kinds.map(() => "?").join(",")})
        AND (LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(COALESCE(body, '')) LIKE ?)
        AND status != 'archived'
      ORDER BY updated_at DESC
      LIMIT ?`;
    const rows = getDb()
      .prepare(sql)
      .all(...kinds, like, like, like, limit) as EntryRow[];
    return rows.map(rowToEntry);
  },

  listGrants(_principalId: MemoryPrincipalId): MemoryGrant[] {
    return loadGrantRows()
      .map(rowToGrant)
      .filter((g): g is MemoryGrant => g != null);
  },

  setGrant(actorPrincipalId: MemoryPrincipalId, grant: MemoryGrant): MemoryGrant {
    requireGrantAdmin(actorPrincipalId);
    const row = grantToRow(grant);
    getDb()
      .prepare(
        `INSERT INTO memory_grants (principal_id, scope_key, access)
         VALUES (?, ?, ?)
         ON CONFLICT(principal_id, scope_key) DO UPDATE SET access = excluded.access`,
      )
      .run(row.principalId, row.scopeKey, row.access);
    audit(
      actorPrincipalId,
      "memory.grants.set",
      `${row.principalId}#${row.scopeKey}=${row.access}`,
      true,
    );
    return grant;
  },

  setGrants(actorPrincipalId: MemoryPrincipalId, grants: MemoryGrant[]): MemoryGrant[] {
    requireGrantAdmin(actorPrincipalId);
    const tx = getDb().transaction(() => {
      for (const grant of grants) {
        const row = grantToRow(grant);
        getDb()
          .prepare(
            `INSERT INTO memory_grants (principal_id, scope_key, access)
             VALUES (?, ?, ?)
             ON CONFLICT(principal_id, scope_key) DO UPDATE SET access = excluded.access`,
          )
          .run(row.principalId, row.scopeKey, row.access);
      }
    });
    tx();
    audit(actorPrincipalId, "memory.grants.set", `${grants.length} grants`, true);
    return this.listGrants(actorPrincipalId);
  },

  /** Test helper — close the handle so a fresh DB path can open. */
  _resetForTests(): void {
    if (db) {
      db.close();
      db = null;
    }
  },
};
