import { useMemo } from "react";
import { EventChip } from "./EventChip";
import { toISODate, WEEKDAY_LABELS, type CalendarEvent } from "./types";

export function MonthGrid({
  month,
  year,
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  maxEventsPerDay = 3,
}: {
  month: number;
  year: number;
  events: CalendarEvent[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  maxEventsPerDay?: number;
}) {
  const todayISO = toISODate(new Date());

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const result: Array<{ date: Date; iso: string; inMonth: boolean }> = [];
    for (let i = 0; i < totalCells; i += 1) {
      const date = new Date(year, month, i - startOffset + 1);
      result.push({ date, iso: toISODate(date), inMonth: date.getMonth() === month });
    }
    return result;
  }, [month, year]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const bucket = map.get(event.date);
      if (bucket) bucket.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [events]);

  return (
    <div className="arco-cal-month">
      <div className="arco-cal-month__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="arco-cal-month__weekday">
            {label}
          </div>
        ))}
      </div>
      <div className="arco-cal-month__days">
        {cells.map(({ date, iso, inMonth }) => {
          const dayEvents = eventsByDate.get(iso) ?? [];
          const visible = dayEvents.slice(0, maxEventsPerDay);
          const overflow = dayEvents.length - visible.length;
          const isToday = iso === todayISO;

          return (
            <div
              key={iso}
              className={[
                "arco-cal-month__day",
                !inMonth ? "arco-cal-month__day--outside" : "",
                iso === selectedDate ? "arco-cal-month__day--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate?.(iso)}
            >
              <button
                type="button"
                className={[
                  "arco-cal-month__day-num",
                  isToday ? "arco-cal-month__day-num--today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={date.toDateString()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectDate?.(iso);
                }}
              >
                {date.getDate()}
              </button>
              <div className="arco-cal-month__day-events">
                {visible.map((event) => (
                  <EventChip key={event.id} event={event} onClick={() => onSelectEvent?.(event)} />
                ))}
                {overflow > 0 ? (
                  <div className="arco-cal-month__overflow">+{overflow} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
