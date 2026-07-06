import { useMemo } from "react";
import { MONTH_LABELS, toISODate, type CalendarEvent } from "./types";

const MINI_WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function buildMonthCells(month: number, year: number) {
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
}

export function YearGrid({
  year,
  events,
  selectedDate,
  onSelectDate,
  onSelectMonth,
}: {
  year: number;
  events: CalendarEvent[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onSelectMonth?: (month: number, year: number) => void;
}) {
  const todayISO = toISODate(new Date());
  const highlightedDates = useMemo(() => new Set(events.map((event) => event.date)), [events]);

  return (
    <div className="arco-cal-year">
      <div className="arco-cal-year__months">
        {MONTH_LABELS.map((monthLabel, monthIndex) => {
          const cells = buildMonthCells(monthIndex, year);

          return (
            <section key={monthLabel} className="arco-cal-year__month">
              <button
                type="button"
                className="arco-cal-year__month-title"
                onClick={() => onSelectMonth?.(monthIndex, year)}
              >
                {monthLabel}
              </button>
              <div className="arco-cal-year__weekdays">
                {MINI_WEEKDAY_LABELS.map((label, index) => (
                  <div key={`${label}-${index}`} className="arco-cal-year__weekday">
                    {label}
                  </div>
                ))}
              </div>
              <div className="arco-cal-year__days">
                {cells.map(({ date, iso, inMonth }) => {
                  const isToday = iso === todayISO;
                  const isSelected = iso === selectedDate;

                  return (
                    <button
                      key={iso}
                      type="button"
                      className={[
                        "arco-cal-year__day",
                        !inMonth ? "arco-cal-year__day--outside" : "",
                        isToday ? "arco-cal-year__day--today" : "",
                        isSelected && !isToday ? "arco-cal-year__day--selected" : "",
                        highlightedDates.has(iso) ? "arco-cal-year__day--has-events" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={date.toDateString()}
                      onClick={() => onSelectDate?.(iso)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
