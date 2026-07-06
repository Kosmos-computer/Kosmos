export type CalendarView = "day" | "week" | "month" | "year";

export type CalendarEventTone = "accent" | "success" | "warning" | "danger" | "neutral";

export interface CalendarSource {
  id: string;
  name: string;
  group: string;
  tone?: CalendarEventTone;
}

/** UI-facing event shape (ported from UI Experiments calendar workspace). */
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  tone?: CalendarEventTone;
  sourceId?: string;
  location?: string;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function getWeekStartSunday(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function parseTimeLabelToMinutes(label: string): number {
  const trimmed = label.trim();
  if (trimmed.toLowerCase() === "noon") return 12 * 60;

  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return 0;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function formatMinutesToLabel(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  if (minutes === 0) {
    return `${hours12} ${meridiem}`;
  }
  return `${hours12}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

export function getEventStartMinutes(event: CalendarEvent): number | undefined {
  if (!event.startTime) return undefined;
  return parseTimeLabelToMinutes(event.startTime);
}

export function getEventEndMinutes(event: CalendarEvent): number | undefined {
  if (event.endTime) return parseTimeLabelToMinutes(event.endTime);
  const start = getEventStartMinutes(event);
  if (start != null) return start + 60;
  return undefined;
}

export function formatDayTitle(iso: string): string {
  const date = parseISODate(iso);
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatWeekdayLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, { weekday: "long" });
}

export interface TimedEventLayout {
  event: CalendarEvent;
  startMinutes: number;
  endMinutes: number;
  column: number;
  columnCount: number;
}

export function layoutTimedEvents(events: CalendarEvent[]): TimedEventLayout[] {
  const timed = events
    .map((event) => {
      const startMinutes = getEventStartMinutes(event);
      if (startMinutes == null) return null;
      return {
        event,
        startMinutes,
        endMinutes: getEventEndMinutes(event) ?? startMinutes + 60,
      };
    })
    .filter((item): item is Omit<TimedEventLayout, "column" | "columnCount"> => item != null)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

  const layouts: TimedEventLayout[] = [];
  let cluster: Omit<TimedEventLayout, "column" | "columnCount">[] = [];
  let clusterEnd = 0;

  const flushCluster = () => {
    if (!cluster.length) return;

    const columns: Omit<TimedEventLayout, "column" | "columnCount">[][] = [];
    for (const item of cluster) {
      let placed = false;
      for (const column of columns) {
        const last = column[column.length - 1];
        if (last.endMinutes <= item.startMinutes) {
          column.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([item]);
    }

    const columnCount = columns.length;
    for (const [columnIndex, column] of columns.entries()) {
      for (const item of column) {
        layouts.push({ ...item, column: columnIndex, columnCount });
      }
    }
    cluster = [];
    clusterEnd = 0;
  };

  for (const item of timed) {
    if (cluster.length && item.startMinutes >= clusterEnd) {
      flushCluster();
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMinutes);
  }
  flushCluster();

  return layouts;
}

export interface EventFormState {
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  notes: string;
}
