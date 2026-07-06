import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui";
import { SidebarPane } from "../../components/patterns";
import { CalendarSidebar } from "./CalendarSidebar";
import { DayGrid } from "./DayGrid";
import { MonthGrid } from "./MonthGrid";
import { CalendarWeekGrid } from "./WeekGrid";
import { YearGrid } from "./YearGrid";
import {
  addDaysISO,
  formatDayTitle,
  getWeekStartSunday,
  MONTH_LABELS,
  parseISODate,
  toISODate,
  type CalendarEvent,
  type CalendarSource,
  type CalendarView,
} from "./types";

const VIEW_TABS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

export function CalendarWorkspace({
  month,
  year,
  events,
  view,
  onViewChange,
  weekStartISO,
  onPrevMonth,
  onNextMonth,
  onPrevWeek,
  onNextWeek,
  onPrevDay,
  onNextDay,
  onPrevYear,
  onNextYear,
  onToday,
  onMonthChange,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  onNewEvent,
  sources,
  enabledSourceIds,
  onToggleSource,
  sidebarWidth,
  onSidebarWidthChange,
  loading,
  error,
}: {
  month: number;
  year: number;
  events: CalendarEvent[];
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  weekStartISO: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onPrevYear: () => void;
  onNextYear: () => void;
  onToday: () => void;
  onMonthChange: (month: number, year: number) => void;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onNewEvent: () => void;
  sources: CalendarSource[];
  enabledSourceIds: string[];
  onToggleSource: (sourceId: string) => void;
  sidebarWidth: number;
  onSidebarWidthChange: (width: number) => void;
  loading?: boolean;
  error?: string | null;
}) {
  const todayISO = toISODate(new Date());
  const focusDateISO = selectedDate ?? todayISO;

  const enabledSources = useMemo(
    () => new Set(enabledSourceIds ?? sources.map((source) => source.id)),
    [enabledSourceIds, sources],
  );

  const visibleEvents = useMemo(() => {
    if (!sources.length) return events;
    return events.filter((event) => !event.sourceId || enabledSources.has(event.sourceId));
  }, [events, enabledSources, sources]);

  const highlightedDates = useMemo(
    () => Array.from(new Set(visibleEvents.map((event) => event.date))),
    [visibleEvents],
  );

  const resolvedWeekStartISO = useMemo(() => {
    if (weekStartISO) return weekStartISO;
    return toISODate(getWeekStartSunday(parseISODate(focusDateISO)));
  }, [focusDateISO, weekStartISO]);

  const dayEvents = useMemo(
    () => visibleEvents.filter((event) => event.date === focusDateISO),
    [focusDateISO, visibleEvents],
  );

  const weekEvents = useMemo(() => {
    const weekEndISO = addDaysISO(resolvedWeekStartISO, 6);
    return visibleEvents.filter(
      (event) => event.date >= resolvedWeekStartISO && event.date <= weekEndISO,
    );
  }, [resolvedWeekStartISO, visibleEvents]);

  const handleSelectDate = (iso: string) => {
    const [yearPart, monthPart] = iso.split("-").map(Number);
    const targetMonth = monthPart - 1;
    if (targetMonth !== month || yearPart !== year) {
      onMonthChange(targetMonth, yearPart);
    }
    onSelectDate(iso);
  };

  const handleYearSelectDate = (iso: string) => {
    handleSelectDate(iso);
    onViewChange("day");
  };

  const handleYearSelectMonth = (targetMonth: number, targetYear: number) => {
    onMonthChange(targetMonth, targetYear);
    onViewChange("month");
  };

  const headerTitle = (() => {
    switch (view) {
      case "day":
        return formatDayTitle(focusDateISO);
      case "week": {
        const weekDate = parseISODate(resolvedWeekStartISO);
        return `${MONTH_LABELS[weekDate.getMonth()]} ${weekDate.getFullYear()}`;
      }
      case "year":
        return String(year);
      case "month":
      default:
        return `${MONTH_LABELS[month]} ${year}`;
    }
  })();

  return (
    <div className="arco-cal">
      <SidebarPane
        width={sidebarWidth}
        onWidthChange={onSidebarWidthChange}
        minWidth={200}
        maxWidth={320}
        handleLabel="Resize calendar sidebar"
        className="arco-cal__sidebar-wrap"
      >
        <div className="arco-cal__sidebar arco-scroll">
          <CalendarSidebar
            month={month}
            year={year}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onToday={onToday}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            highlightedDates={highlightedDates}
            sources={sources}
            enabledSourceIds={Array.from(enabledSources)}
            onToggleSource={onToggleSource}
          />
        </div>
      </SidebarPane>

      <div className="arco-cal__main">
        <div className="arco-cal__panel">
          <div className="arco-cal__header">
            <div className="arco-cal__header-left">
              <div className="arco-cal__title">{headerTitle}</div>
              <div className="arco-cal__nav">
                {view === "day" ? (
                  <>
                    <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onPrevDay} aria-label="Previous day">
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onNextDay} aria-label="Next day">
                      <ChevronRight size={16} />
                    </button>
                  </>
                ) : view === "week" ? (
                  <>
                    <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onPrevWeek} aria-label="Previous week">
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onNextWeek} aria-label="Next week">
                      <ChevronRight size={16} />
                    </button>
                  </>
                ) : view === "year" ? (
                  <>
                    <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onPrevYear} aria-label="Previous year">
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onNextYear} aria-label="Next year">
                      <ChevronRight size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onPrevMonth} aria-label="Previous month">
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onNextMonth} aria-label="Next month">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
              <Button variant="ghost" onClick={onToday}>
                Today
              </Button>
            </div>

            <div className="arco-cal__tabs" role="tablist" aria-label="Calendar view">
              {VIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={view === tab.id}
                  className={["arco-cal__tab", view === tab.id ? "arco-cal__tab--active" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onViewChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="arco-cal__header-actions">
              <Button variant="primary" onClick={onNewEvent}>
                New event
              </Button>
            </div>
          </div>

          {error ? <div className="arco-cal__error">{error}</div> : null}
          {loading ? <div className="arco-cal__loading">Loading events…</div> : null}

          <div className="arco-cal__grid">
            {view === "day" ? (
              <DayGrid dateISO={focusDateISO} events={dayEvents} onSelectEvent={onSelectEvent} />
            ) : null}
            {view === "week" ? (
              <CalendarWeekGrid
                weekStartISO={resolvedWeekStartISO}
                events={weekEvents}
                onSelectEvent={onSelectEvent}
              />
            ) : null}
            {view === "month" ? (
              <MonthGrid
                month={month}
                year={year}
                events={visibleEvents}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onSelectEvent={onSelectEvent}
              />
            ) : null}
            {view === "year" ? (
              <YearGrid
                year={year}
                events={visibleEvents}
                selectedDate={selectedDate}
                onSelectDate={handleYearSelectDate}
                onSelectMonth={handleYearSelectMonth}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
