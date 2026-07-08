import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { useMemo, type CSSProperties } from "react";
import { CalendarEventBlock } from "./CalendarEventBlock";
import { EventChip } from "./EventChip";
import {
  formatDayTitle,
  formatMinutesToLabel,
  formatWeekdayLong,
  layoutTimedEvents,
  toISODate,
  type CalendarEvent,
} from "./types";

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function DayGrid({
  dateISO,
  events,
  onSelectEvent,
  startHour = 0,
  endHour = 24,
}: {
  dateISO: string;
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
  const isToday = dateISO === todayISO;

  const allDayEvents = useMemo(() => events.filter((event) => !event.startTime), [events]);
  const timedLayouts = useMemo(
    () => layoutTimedEvents(events.filter((event) => event.startTime)),
    [events],
  );
  const hours = useMemo(
    () => Array.from({ length: hourSpan }, (_, index) => startHour + index),
    [hourSpan, startHour],
  );

  const showNowLine =
    isToday && currentMinutes >= startMinutes && currentMinutes < startHour * 60 + totalMinutes;
  const nowTopPercent = ((currentMinutes - startMinutes) / totalMinutes) * 100;

  return (
    <div className="arco-cal-day">
      <div className="arco-cal-day__header">
        <div className="arco-cal-day__title">{formatDayTitle(dateISO)}</div>
        <div className="arco-cal-day__weekday">{formatWeekdayLong(dateISO)}</div>
      </div>

      {allDayEvents.length > 0 ? (
        <div className="arco-cal-day__allday">
          <div className="arco-cal-day__allday-label"><T k={I18nKey.APPS$CALENDAR_ALL_DAY} /></div>
          <div className="arco-cal-day__allday-events">
            {allDayEvents.map((event) => (
              <EventChip key={event.id} event={event} onClick={() => onSelectEvent?.(event)} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="arco-cal-day__body" style={{ "--hour-span": hourSpan } as CSSProperties}>
        <div className="arco-cal-day__times">
          {hours.map((hour) => (
            <div key={hour} className="arco-cal-day__time-label">
              {formatMinutesToLabel(hour * 60)}
            </div>
          ))}
        </div>

        <div className="arco-cal-day__column">
          {hours.map((hour) => (
            <div key={hour} className="arco-cal-day__hour" />
          ))}

          {timedLayouts.map(({ event, startMinutes: eventStart, endMinutes, column, columnCount }) => {
            const top = ((eventStart - startMinutes) / totalMinutes) * 100;
            const height = ((endMinutes - eventStart) / totalMinutes) * 100;
            const width = 100 / columnCount;
            const left = width * column;

            return (
              <div
                key={event.id}
                className="arco-cal-day__slot"
                style={{
                  top: `${top}%`,
                  height: `${Math.max(height, 8)}%`,
                  left: `calc(${left}% + 4px)`,
                  width: `calc(${width}% - 8px)`,
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

          {showNowLine ? (
            <div className="arco-cal-day__now" style={{ top: `${nowTopPercent}%` }}>
              <span className="arco-cal-day__now-badge">{formatMinutesToLabel(currentMinutes)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
