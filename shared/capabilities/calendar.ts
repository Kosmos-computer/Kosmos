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
