/**
 * Session transcript FTS5 index — Hermes session_search without the LLM.
 *
 * Incremental: every appendMessages call indexes new rows. Search is
 * keyword-only (FTS5 MATCH), zero model cost.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { ChatMessage } from "../../shared/types.js";
import { dataDirs } from "../env.js";

let db: Database.Database | null = null;

function searchDbPath(): string {
  return path.join(dataDirs.sessions, "search.db");
}

function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(dataDirs.sessions, { recursive: true });
  db = new Database(searchDbPath());
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS session_fts USING fts5(
      session_id UNINDEXED,
      message_idx UNINDEXED,
      role UNINDEXED,
      content,
      created_at UNINDEXED,
      tokenize = 'porter unicode61'
    );
    CREATE TABLE IF NOT EXISTS session_fts_meta (
      session_id TEXT PRIMARY KEY,
      indexed_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

function messageText(m: ChatMessage): string {
  if (m.role === "user" || m.role === "assistant") return m.content ?? "";
  if (m.role === "tool") return `${m.name ?? "tool"}: ${m.content ?? ""}`;
  return "";
}

export interface SessionSearchHit {
  sessionId: string;
  messageIdx: number;
  role: string;
  snippet: string;
  createdAt: string;
}

export const sessionSearchIndex = {
  /** Index messages starting at `fromIdx` (inclusive). Idempotent for gaps. */
  indexMessages(sessionId: string, messages: ChatMessage[], fromIdx = 0): void {
    if (messages.length === 0 || fromIdx >= messages.length) return;
    const database = getDb();
    const insert = database.prepare(
      `INSERT INTO session_fts (session_id, message_idx, role, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const tx = database.transaction(() => {
      for (let i = fromIdx; i < messages.length; i++) {
        const m = messages[i];
        const content = messageText(m).trim();
        if (!content) continue;
        const createdAt =
          m.role !== "tool" && "timestamp" in m && typeof m.timestamp === "string"
            ? m.timestamp
            : now;
        insert.run(sessionId, i, m.role, content, createdAt);
      }
      database
        .prepare(
          `INSERT INTO session_fts_meta (session_id, indexed_count, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(session_id) DO UPDATE SET
             indexed_count = excluded.indexed_count,
             updated_at = excluded.updated_at`,
        )
        .run(sessionId, messages.length, now);
    });
    tx();
  },

  /** Drop all rows for a session (on delete). */
  removeSession(sessionId: string): void {
    const database = getDb();
    database.prepare(`DELETE FROM session_fts WHERE session_id = ?`).run(sessionId);
    database.prepare(`DELETE FROM session_fts_meta WHERE session_id = ?`).run(sessionId);
  },

  search(opts: {
    query: string;
    sessionId?: string;
    limit?: number;
  }): SessionSearchHit[] {
    const q = opts.query.trim();
    if (!q) return [];
    const limit = Math.min(Math.max(opts.limit ?? 8, 1), 30);
    const database = getDb();

    // Escape FTS5 special chars loosely — quote multi-word as phrase OR tokenize.
    const tokens = q
      .replace(/["']/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !/^[-*]+$/.test(t));
    if (tokens.length === 0) return [];
    const match = tokens.map((t) => `"${t.replace(/"/g, "")}"*`).join(" ");

    try {
      if (opts.sessionId) {
        const rows = database
          .prepare(
            `SELECT session_id, message_idx, role,
                    snippet(session_fts, 3, '«', '»', '…', 24) AS snip,
                    created_at
             FROM session_fts
             WHERE session_fts MATCH ? AND session_id = ?
             ORDER BY rank
             LIMIT ?`,
          )
          .all(match, opts.sessionId, limit) as Array<{
          session_id: string;
          message_idx: number;
          role: string;
          snip: string;
          created_at: string;
        }>;
        return rows.map((r) => ({
          sessionId: r.session_id,
          messageIdx: r.message_idx,
          role: r.role,
          snippet: r.snip,
          createdAt: r.created_at,
        }));
      }

      const rows = database
        .prepare(
          `SELECT session_id, message_idx, role,
                  snippet(session_fts, 3, '«', '»', '…', 24) AS snip,
                  created_at
           FROM session_fts
           WHERE session_fts MATCH ?
           ORDER BY rank
           LIMIT ?`,
        )
        .all(match, limit) as Array<{
        session_id: string;
        message_idx: number;
        role: string;
        snip: string;
        created_at: string;
      }>;
      return rows.map((r) => ({
        sessionId: r.session_id,
        messageIdx: r.message_idx,
        role: r.role,
        snippet: r.snip,
        createdAt: r.created_at,
      }));
    } catch (err) {
      console.warn(
        `[arco] session FTS search failed:`,
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  },

  /** Full reindex from a session's messages (rebuild after corruption). */
  reindexSession(sessionId: string, messages: ChatMessage[]): void {
    this.removeSession(sessionId);
    this.indexMessages(sessionId, messages, 0);
  },
};
