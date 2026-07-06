import { useMemo, type CSSProperties } from "react";
import { CalendarEventBlock } from "./CalendarEventBlock";
import { EventChip } from "./EventChip";
import {
  addDaysISO,
  formatMinutesToLabel,
  layoutTimedEvents,
  toISODate,
  WEEKDAY_LABELS,
  type CalendarEvent,
} from "./types";

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function CalendarWeekGrid({
  weekStartISO,
  events,
  onSelectEvent,
  startHour = 0,
  endHour = 24,
}: {
  weekStartISO: string;
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  startHour?: number;
  endHour?: number;
}) {
  const todayISO = toISODate(new Date());
  const hourSpan = endHour - startHour;
  const startMinutes = startHour * 60;
  const totalMinutes = hourSpan * 60;
  const currentMinutes = minutesSinceMidnight(new Date());

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const iso = addDaysISO(weekStartISO, index);
        return {
          iso,
          label: WEEKDAY_LABELS[index],
          dayNumber: Number(iso.split("-")[2]),
          isToday: iso === todayISO,
        };
      }),
    [todayISO, weekStartISO],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const bucket = map.get(event.date);
      if (bucket) bucket.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [events]);

  const allDayByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of days) {
      const dayEvents = eventsByDate.get(day.iso) ?? [];
      const allDay = dayEvents.filter((event) => !event.startTime);
      if (allDay.length) map.set(day.iso, allDay);
    }
    return map;
  }, [days, eventsByDate]);

  const hasAllDay = allDayByDate.size > 0;
  const hours = useMemo(
    () => Array.from({ length: hourSpan }, (_, index) => startHour + index),
    [hourSpan, startHour],
  );

  const showNowLine =
    days.some((day) => day.isToday) &&
    currentMinutes >= startMinutes &&
    currentMinutes < startHour * 60 + totalMinutes;
  const nowTopPercent = ((currentMinutes - startMinutes) / totalMinutes) * 100;

  return (
    <div className="arco-cal-week">
      <div className="arco-cal-week__head">
        <div className="arco-cal-week__header-row">
          <div className="arco-cal-week__time-gutter" aria-hidden="true" />
          {days.map((day) => (
            <div
              key={day.iso}
              className={[
                "arco-cal-week__day-header",
                day.isToday ? "arco-cal-week__day-header--today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="arco-cal-week__day-label">{day.label}</span>
              <span className="arco-cal-week__day-number">{day.dayNumber}</span>
            </div>
          ))}
        </div>

        {hasAllDay ? (
          <div className="arco-cal-week__allday">
            <div className="arco-cal-week__allday-label">all-day</div>
            {days.map((day) => (
              <div key={day.iso} className="arco-cal-week__allday-col">
                {(allDayByDate.get(day.iso) ?? []).map((event) => (
                  <EventChip key={event.id} event={event} onClick={() => onSelectEvent?.(event)} />
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="arco-cal-week__body" style={{ "--hour-span": hourSpan } as CSSProperties}>
        <div className="arco-cal-week__times">
          {hours.map((hour) => (
            <div key={hour} className="arco-cal-week__time-label">
              {formatMinutesToLabel(hour * 60)}
            </div>
          ))}
        </div>

        <div className="arco-cal-week__columns">
          {days.map((day) => {
            const timedLayouts = layoutTimedEvents(
              (eventsByDate.get(day.iso) ?? []).filter((event) => event.startTime),
            );

            return (
              <div key={day.iso} className="arco-cal-week__column">
                {hours.map((hour) => (
                  <div key={hour} className="arco-cal-week__hour" />
                ))}

                {timedLayouts.map(({ event, startMinutes: eventStart, endMinutes, column, columnCount }) => {
                  const top = ((eventStart - startMinutes) / totalMinutes) * 100;
                  const height = ((endMinutes - eventStart) / totalMinutes) * 100;
                  const width = 100 / columnCount;
                  const left = width * column;

                  return (
                    <div
                      key={event.id}
                      className="arco-cal-week__slot"
                      style={{
                        top: `${top}%`,
                        height: `${Math.max(height, 8)}%`,
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                      }}
                    >
                      <CalendarEventBlock
                        event={event}
                        compact={height < 10}
                        onClick={() => onSelectEvent?.(event)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {showNowLine ? (
            <div className="arco-cal-week__now" style={{ top: `${nowTopPercent}%` }}>
              <span className="arco-cal-week__now-badge">{formatMinutesToLabel(currentMinutes)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
