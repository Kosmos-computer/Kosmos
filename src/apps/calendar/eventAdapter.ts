import type { CalendarEvent as ApiEvent, CalendarEventInput } from "@shared/capabilities/calendar";
import {
  formatMinutesToLabel,
  toISODate,
  type CalendarEvent,
  type CalendarEventTone,
  type EventFormState,
} from "./types";

const DEFAULT_SOURCE_ID = "personal";

const TONE_PALETTE: CalendarEventTone[] = ["accent", "success", "warning", "neutral", "danger"];

function toneForId(id: string): CalendarEventTone {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % TONE_PALETTE.length;
  }
  return TONE_PALETTE[hash] ?? "accent";
}

function ymd(date: Date): string {
  return toISODate(date);
}

function hm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function apiEventToUi(event: ApiEvent): CalendarEvent {
  const start = new Date(event.start);
  const end = new Date(event.end);

  if (event.allDay) {
    return {
      id: event.id,
      title: event.title,
      date: ymd(start),
      tone: toneForId(event.id),
      sourceId: DEFAULT_SOURCE_ID,
      location: event.location ?? undefined,
    };
  }

  return {
    id: event.id,
    title: event.title,
    date: ymd(start),
    startTime: formatMinutesToLabel(start.getHours() * 60 + start.getMinutes()),
    endTime: formatMinutesToLabel(end.getHours() * 60 + end.getMinutes()),
    tone: toneForId(event.id),
    sourceId: DEFAULT_SOURCE_ID,
    location: event.location ?? undefined,
  };
}

export function apiEventToForm(event: ApiEvent): EventFormState {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const endDisplay = event.allDay ? new Date(end.getTime() - 24 * 60 * 60 * 1000) : end;

  return {
    title: event.title,
    allDay: event.allDay,
    startDate: ymd(start),
    startTime: event.allDay ? "09:00" : hm(start),
    endDate: ymd(endDisplay),
    endTime: event.allDay ? "10:00" : hm(end),
    location: event.location ?? "",
    notes: event.notes ?? "",
  };
}

export function emptyEventForm(dateISO?: string): EventFormState {
  const base = dateISO ?? toISODate(new Date());
  return {
    title: "",
    allDay: false,
    startDate: base,
    startTime: "09:00",
    endDate: base,
    endTime: "10:00",
    location: "",
    notes: "",
  };
}

export function formToApiInput(form: EventFormState): CalendarEventInput {
  const title = form.title.trim();
  if (!title) throw new Error("Title is required");

  if (form.allDay) {
    const start = new Date(`${form.startDate}T00:00:00`);
    const endBase = new Date(`${form.endDate}T00:00:00`);
    const end = new Date(endBase.getTime() + 24 * 60 * 60 * 1000);
    return {
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: true,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
  }

  const start = new Date(`${form.startDate}T${form.startTime || "00:00"}`);
  const end = new Date(`${form.endDate}T${form.endTime || "23:59"}`);
  return {
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
    location: form.location.trim() || undefined,
    notes: form.notes.trim() || undefined,
  };
}
