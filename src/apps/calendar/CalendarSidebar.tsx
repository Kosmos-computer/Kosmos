import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useMemo } from "react";
import { Check } from "lucide-react";
import { MiniCalendar } from "../tasks/MiniCalendar";
import type { CalendarEventTone, CalendarSource } from "./types";

const TONE_CLASS: Record<CalendarEventTone, string> = {
  accent: "arco-cal-sidebar__source--accent",
  success: "arco-cal-sidebar__source--success",
  warning: "arco-cal-sidebar__source--warning",
  danger: "arco-cal-sidebar__source--danger",
  neutral: "arco-cal-sidebar__source--neutral",
};

export function CalendarSidebar({
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onToday,
  selectedDate,
  onSelectDate,
  highlightedDates,
  sources,
  enabledSourceIds,
  onToggleSource,
}: {
  month: number;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday?: () => void;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  highlightedDates?: string[];
  sources: CalendarSource[];
  enabledSourceIds: string[];
  onToggleSource: (sourceId: string) => void;
}) {
  const enabled = useMemo(() => new Set(enabledSourceIds), [enabledSourceIds]);

  const groupedSources = useMemo(() => {
    const groups = new Map<string, CalendarSource[]>();
    for (const source of sources) {
      const bucket = groups.get(source.group);
      if (bucket) bucket.push(source);
      else groups.set(source.group, [source]);
    }
    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
  }, [sources]);

  return (
    <div className="arco-cal-sidebar">
      <MiniCalendar
        month={month}
        year={year}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onToday={onToday ?? (() => {})}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate ?? (() => {})}
        highlightedDates={highlightedDates ?? []}
      />
      <div className="arco-cal-sidebar__sources" role="group" aria-label={i18n.t(I18nKey.APPS$CALENDAR_CALENDARS)}>
        {groupedSources.map(({ group, items }) => (
          <div key={group} className="arco-cal-sidebar__group">
            <div className="arco-cal-sidebar__group-title">{group}</div>
            {items.map((source) => {
              const checked = enabled.has(source.id);
              const tone = source.tone ?? "accent";

              return (
                <label
                  key={source.id}
                  className={[
                    "arco-cal-sidebar__source",
                    checked ? "arco-cal-sidebar__source--checked" : "",
                    TONE_CLASS[tone],
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    type="checkbox"
                    className="arco-cal-sidebar__source-input"
                    checked={checked}
                    onChange={() => onToggleSource(source.id)}
                  />
                  <span className="arco-cal-sidebar__source-box" aria-hidden="true">
                    {checked ? <Check size={11} strokeWidth={2.5} /> : null}
                  </span>
                  <span className="arco-cal-sidebar__source-label">{source.name}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
