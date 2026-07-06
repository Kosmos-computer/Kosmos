/**
 * System calendar service — the OS-owned canonical event store and the
 * default provider for os.calendar@1.
 *
 * Apps (core Calendar, third-party replacements, generated dashboards) and
 * the agent are all clients of this store through the contract's intents.
 * That's what makes "swap the calendar app" lossless: the data outlives any
 * particular UI.
 */
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import type { CalendarEvent, CalendarEventInput } from "../../shared/capabilities/calendar.js";
import { dataDirs } from "../env.js";
import { announceAppEvent } from "../bus.js";

/**
 * Pilot event topic: every write announces "calendar.changed" on the bus so
 * subscribers (open calendar windows, future widgets/automations) can react
 * to agent- or app-made changes without polling.
 */
function announceChange(): void {
  announceAppEvent("calendar.changed", { appId: "system" });
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(dataDirs.db, { recursive: true });
    db = new Database(path.join(dataDirs.db, "system-calendar.sqlite"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        allDay INTEGER NOT NULL DEFAULT 0,
        location TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_start ON events(start);
    `);
  }
  return db;
}

interface EventRow {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: number;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function toEvent(row: EventRow): CalendarEvent {
  return { ...row, allDay: row.allDay === 1 };
}

function assertIso(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO 8601 date-time, got "${value}"`);
  }
}

export const calendarService = {
  /** Events overlapping [from, to] (both optional), ordered by start. */
  list(params: { from?: string; to?: string } = {}): CalendarEvent[] {
    const clauses: string[] = [];
    const bind: Record<string, string> = {};
    if (params.from) {
      assertIso(params.from, "from");
      clauses.push("end >= $from");
      bind.from = params.from;
    }
    if (params.to) {
      assertIso(params.to, "to");
      clauses.push("start <= $to");
      bind.to = params.to;
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = getDb()
      .prepare(`SELECT * FROM events ${where} ORDER BY start ASC LIMIT 500`)
      .all(bind) as EventRow[];
    return rows.map(toEvent);
  },

  get(id: string): CalendarEvent | undefined {
    const row = getDb().prepare("SELECT * FROM events WHERE id = ?").get(id) as
      | EventRow
      | undefined;
    return row ? toEvent(row) : undefined;
  },

  create(input: CalendarEventInput): CalendarEvent {
    if (!input.title?.trim()) throw new Error("title is required");
    assertIso(input.start, "start");
    assertIso(input.end, "end");
    const now = new Date().toISOString();
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      start: input.start,
      end: input.end,
      allDay: input.allDay ?? false,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    getDb()
      .prepare(
        `INSERT INTO events (id, title, start, end, allDay, location, notes, createdAt, updatedAt)
         VALUES ($id, $title, $start, $end, $allDay, $location, $notes, $createdAt, $updatedAt)`,
      )
      .run({ ...event, allDay: event.allDay ? 1 : 0 });
    announceChange();
    return event;
  },

  update(id: string, patch: Partial<CalendarEventInput>): CalendarEvent {
    const existing = this.get(id);
    if (!existing) throw new Error(`Event not found: ${id}`);
    if (patch.start) assertIso(patch.start, "start");
    if (patch.end) assertIso(patch.end, "end");
    const next: CalendarEvent = {
      ...existing,
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.start !== undefined ? { start: patch.start } : {}),
      ...(patch.end !== undefined ? { end: patch.end } : {}),
      ...(patch.allDay !== undefined ? { allDay: patch.allDay } : {}),
      ...(patch.location !== undefined ? { location: patch.location.trim() || null } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes.trim() || null } : {}),
      updatedAt: new Date().toISOString(),
    };
    getDb()
      .prepare(
        `UPDATE events SET title=$title, start=$start, end=$end, allDay=$allDay,
         location=$location, notes=$notes, updatedAt=$updatedAt WHERE id=$id`,
      )
      .run({ ...next, allDay: next.allDay ? 1 : 0 });
    announceChange();
    return next;
  },

  delete(id: string): boolean {
    const deleted = getDb().prepare("DELETE FROM events WHERE id = ?").run(id).changes > 0;
    if (deleted) announceChange();
    return deleted;
  },
};
