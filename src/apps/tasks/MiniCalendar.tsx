import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function padISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MiniCalendar({
  month,
  year,
  selectedDate,
  highlightedDates,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectDate,
}: {
  month: number;
  year: number;
  selectedDate?: string;
  highlightedDates: string[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectDate: (iso: string) => void;
}) {
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const highlighted = new Set(highlightedDates);

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ iso: padISO(year, month, day), day });
  }

  return (
    <div className="arco-mini-calendar">
      <div className="arco-mini-calendar__header">
        <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onPrevMonth} aria-label={i18n.t(I18nKey.APPS$CALENDAR_PREVIOUS_MONTH)}>
          ‹
        </button>
        <div className="arco-mini-calendar__title">{monthLabel}</div>
        <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onNextMonth} aria-label={i18n.t(I18nKey.APPS$CALENDAR_NEXT_MONTH)}>
          ›
        </button>
      </div>
      <button type="button" className="arco-btn arco-mini-calendar__today" onClick={onToday}><T k={I18nKey.COMMON$TODAY} /></button>
      <div className="arco-mini-calendar__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="arco-mini-calendar__grid">
        {cells.map((cell, index) =>
          cell ? (
            <button
              key={cell.iso}
              type="button"
              className={[
                "arco-mini-calendar__day",
                cell.iso === selectedDate ? "arco-mini-calendar__day--selected" : "",
                highlighted.has(cell.iso) ? "arco-mini-calendar__day--highlighted" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate(cell.iso)}
            >
              {cell.day}
            </button>
          ) : (
            <span key={`empty-${index}`} className="arco-mini-calendar__day arco-mini-calendar__day--empty" />
          ),
        )}
      </div>
    </div>
  );
}
