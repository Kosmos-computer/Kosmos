/**
 * Namespaced SQLite — persistent state for generated apps.
 *
 * Each namespace is its own database file under `data/db/`, so one app's
 * schema can't collide with another's. Both the agent tools (db_query /
 * db_execute during a chat turn) and the app runtime's Query/Mutation
 * bindings go through these two functions — no LLM in the refresh loop.
 */
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { dataDirs } from "../env.js";

const connections = new Map<string, Database.Database>();

function sanitizeNamespace(ns: string): string {
  const cleaned = (ns || "default").replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || "default";
}

function getDb(namespace: string): Database.Database {
  const ns = sanitizeNamespace(namespace);
  let db = connections.get(ns);
  if (!db) {
    fs.mkdirSync(dataDirs.db, { recursive: true });
    db = new Database(path.join(dataDirs.db, `${ns}.sqlite`));
    db.pragma("journal_mode = WAL");
    connections.set(ns, db);
  }
  return db;
}

/** Coerce params to the types better-sqlite3 binds (it rejects booleans). */
function bindableParams(params: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (typeof v === "boolean") out[k] = v ? 1 : 0;
    else if (v === undefined) out[k] = null;
    else if (typeof v === "object" && v !== null) out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}

export function dbQuery(
  sql: string,
  params?: Record<string, unknown>,
  namespace = "default",
): { namespace: string; rows: unknown[] } {
  const db = getDb(namespace);
  const stmt = db.prepare(sql);
  const rows = stmt.reader ? stmt.all(bindableParams(params)) : (stmt.run(bindableParams(params)), []);
  return { namespace: sanitizeNamespace(namespace), rows };
}

export function dbExecute(
  sql: string,
  params?: Record<string, unknown>,
  namespace = "default",
): { namespace: string; changes: number; lastInsertRowid: number | bigint } {
  const db = getDb(namespace);
  const info = db.prepare(sql).run(bindableParams(params));
  return {
    namespace: sanitizeNamespace(namespace),
    changes: info.changes,
    lastInsertRowid: info.lastInsertRowid,
  };
}
