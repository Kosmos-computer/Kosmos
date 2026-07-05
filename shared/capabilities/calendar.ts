/**
 * os.calendar@1 — the pilot capability contract.
 *
 * Contract ids use the brand-free "os." namespace so they survive a product
 * rename; they are permanent identifiers baked into third-party manifests.
 *
 * Deliberately minimal (CRUD + list-by-range): contract surface only grows
 * when a second consumer demands it. The OS owns the canonical event store
 * (server/services/calendarService.ts); any app implementing this contract
 * is a view over that data, which is what makes swapping implementations
 * lossless.
 */

export const CALENDAR_CONTRACT_ID = "os.calendar@1";

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO 8601. All-day events use local midnight boundaries. */
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventInput {
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string;
  notes?: string;
}

/** Intent ids and their access class — the grant/audit units of the contract. */
export const CALENDAR_INTENTS = {
  "calendar.events.list": "read",
  "calendar.event.get": "read",
  "calendar.event.create": "write",
  "calendar.event.update": "write",
  "calendar.event.delete": "write",
} as const;

export type CalendarIntentId = keyof typeof CALENDAR_INTENTS;

/**
 * JSON Schemas per intent — the machine-readable face of the contract.
 * Consumed wherever an intent is exposed as a callable tool (the outward
 * MCP endpoint today; a discovery API later).
 */
export const CALENDAR_INTENT_SCHEMAS: Record<CalendarIntentId, Record<string, unknown>> = {
  "calendar.events.list": {
    type: "object",
    properties: {
      from: { type: "string", description: "ISO date-time — only events ending at/after this" },
      to: { type: "string", description: "ISO date-time — only events starting at/before this" },
    },
  },
  "calendar.event.get": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "calendar.event.create": {
    type: "object",
    properties: {
      title: { type: "string" },
      start: { type: "string", description: "ISO 8601 start" },
      end: { type: "string", description: "ISO 8601 end" },
      allDay: { type: "boolean" },
      location: { type: "string" },
      notes: { type: "string" },
    },
    required: ["title", "start", "end"],
  },
  "calendar.event.update": {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      start: { type: "string" },
      end: { type: "string" },
      allDay: { type: "boolean" },
      location: { type: "string" },
      notes: { type: "string" },
    },
    required: ["id"],
  },
  "calendar.event.delete": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
};
