import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEvent as ApiEvent } from "@shared/capabilities/calendar";
import { api } from "../../lib/api";
import { onAppEvent } from "../../os/appEventBus";
import { DEFAULT_CALENDAR_SOURCES } from "./calendarSources";
import { apiEventToForm, apiEventToUi, emptyEventForm, formToApiInput } from "./eventAdapter";
import {
  addDaysISO,
  getWeekStartSunday,
  parseISODate,
  toISODate,
  type CalendarEvent,
  type CalendarSource,
  type CalendarView,
  type EventFormState,
} from "./types";

function monthGridBounds(year: number, month: number): { from: string; to: string } {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const start = new Date(year, month, 1 - startOffset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const end = new Date(start);
  end.setDate(start.getDate() + totalCells);
  return { from: start.toISOString(), to: end.toISOString() };
}

function visibleRange(
  view: CalendarView,
  month: number,
  year: number,
  selectedDate: string,
  weekStartISO: string,
): { from: string; to: string } {
  switch (view) {
    case "day": {
      const dayStart = parseISODate(selectedDate);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      return { from: dayStart.toISOString(), to: dayEnd.toISOString() };
    }
    case "week": {
      const weekEndISO = addDaysISO(weekStartISO, 7);
      return {
        from: parseISODate(weekStartISO).toISOString(),
        to: parseISODate(weekEndISO).toISOString(),
      };
    }
    case "year":
      return {
        from: new Date(year, 0, 1).toISOString(),
        to: new Date(year + 1, 0, 1).toISOString(),
      };
    case "month":
    default:
      return monthGridBounds(year, month);
  }
}

export type CalendarViewModel = ReturnType<typeof useCalendar>;

/** Calendar workspace state — backed by os.calendar@1 via /api/calendar. */
export function useCalendar() {
  const now = new Date();
  const todayISO = toISODate(now);

  const [view, setView] = useState<CalendarView>("month");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [weekStartISO, setWeekStartISO] = useState(toISODate(getWeekStartSunday(now)));
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [enabledSourceIds, setEnabledSourceIds] = useState<string[]>(
    DEFAULT_CALENDAR_SOURCES.map((source) => source.id),
  );
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formDefaults, setFormDefaults] = useState<EventFormState>(() => emptyEventForm(todayISO));

  const sources: CalendarSource[] = DEFAULT_CALENDAR_SOURCES;
  const range = useMemo(
    () => visibleRange(view, month, year, selectedDate, weekStartISO),
    [view, month, year, selectedDate, weekStartISO],
  );

  const refreshEvents = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api.listCalendarEvents(range);
      setApiEvents(next);
      setError(null);
    } catch (err) {
      setApiEvents([]);
      setError(err instanceof Error ? err.message : "Could not load events");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    return onAppEvent((detail) => {
      if (detail.topic === "calendar.changed") {
        void refreshEvents();
      }
    });
  }, [refreshEvents]);

  const events = useMemo(() => apiEvents.map(apiEventToUi), [apiEvents]);

  const enabledSources = useMemo(() => new Set(enabledSourceIds), [enabledSourceIds]);

  const visibleEvents = useMemo(() => {
    if (!sources.length) return events;
    return events.filter((event) => !event.sourceId || enabledSources.has(event.sourceId));
  }, [events, enabledSources, sources.length]);

  const highlightedDates = useMemo(
    () => Array.from(new Set(visibleEvents.map((event) => event.date))),
    [visibleEvents],
  );

  const syncFocusDate = useCallback((iso: string) => {
    const date = parseISODate(iso);
    setSelectedDate(iso);
    setMonth(date.getMonth());
    setYear(date.getFullYear());
    setWeekStartISO(toISODate(getWeekStartSunday(date)));
  }, []);

  const handlePrevMonth = useCallback(() => {
    setMonth((current) => {
      if (current === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return current - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonth((current) => {
      if (current === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return current + 1;
    });
  }, []);

  const handlePrevWeek = useCallback(() => {
    const next = addDaysISO(weekStartISO, -7);
    setWeekStartISO(next);
    syncFocusDate(next);
  }, [weekStartISO, syncFocusDate]);

  const handleNextWeek = useCallback(() => {
    const next = addDaysISO(weekStartISO, 7);
    setWeekStartISO(next);
    syncFocusDate(next);
  }, [weekStartISO, syncFocusDate]);

  const handlePrevDay = useCallback(() => {
    syncFocusDate(addDaysISO(selectedDate, -1));
  }, [selectedDate, syncFocusDate]);

  const handleNextDay = useCallback(() => {
    syncFocusDate(addDaysISO(selectedDate, 1));
  }, [selectedDate, syncFocusDate]);

  const handlePrevYear = useCallback(() => {
    setYear((y) => y - 1);
  }, []);

  const handleNextYear = useCallback(() => {
    setYear((y) => y + 1);
  }, []);

  const handleToday = useCallback(() => {
    syncFocusDate(todayISO);
  }, [syncFocusDate, todayISO]);

  const handleMonthChange = useCallback((nextMonth: number, nextYear: number) => {
    setMonth(nextMonth);
    setYear(nextYear);
  }, []);

  const handleSelectDate = useCallback(
    (iso: string) => {
      const date = parseISODate(iso);
      setSelectedDate(iso);
      if (date.getMonth() !== month || date.getFullYear() !== year) {
        setMonth(date.getMonth());
        setYear(date.getFullYear());
      }
      setWeekStartISO(toISODate(getWeekStartSunday(date)));
    },
    [month, year],
  );

  const handleToggleSource = useCallback((sourceId: string) => {
    setEnabledSourceIds((current) =>
      current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId],
    );
  }, []);

  const openNewEvent = useCallback((dateISO?: string) => {
    setEditingEventId(null);
    setFormDefaults(emptyEventForm(dateISO ?? selectedDate));
    setModalOpen(true);
  }, [selectedDate]);

  const openEditEvent = useCallback(
    (event: CalendarEvent) => {
      const apiEvent = apiEvents.find((entry) => entry.id === event.id);
      if (!apiEvent) return;
      setEditingEventId(event.id);
      setFormDefaults(apiEventToForm(apiEvent));
      setModalOpen(true);
    },
    [apiEvents],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEventId(null);
  }, []);

  const saveEvent = useCallback(
    async (form: EventFormState) => {
      const input = formToApiInput(form);
      if (editingEventId) {
        await api.updateCalendarEvent(editingEventId, input);
      } else {
        await api.createCalendarEvent(input);
      }
      closeModal();
      await refreshEvents();
    },
    [closeModal, editingEventId, refreshEvents],
  );

  const deleteEvent = useCallback(async () => {
    if (!editingEventId) return;
    await api.deleteCalendarEvent(editingEventId);
    closeModal();
    await refreshEvents();
  }, [closeModal, editingEventId, refreshEvents]);

  return {
    view,
    setView,
    month,
    year,
    selectedDate,
    weekStartISO,
    events: visibleEvents,
    sources,
    enabledSourceIds,
    highlightedDates,
    sidebarWidth,
    setSidebarWidth,
    loading,
    error,
    modalOpen,
    editingEventId,
    formDefaults,
    handlePrevMonth,
    handleNextMonth,
    handlePrevWeek,
    handleNextWeek,
    handlePrevDay,
    handleNextDay,
    handlePrevYear,
    handleNextYear,
    handleToday,
    handleMonthChange,
    handleSelectDate,
    handleToggleSource,
    openNewEvent,
    openEditEvent,
    closeModal,
    saveEvent,
    deleteEvent,
  };
}
