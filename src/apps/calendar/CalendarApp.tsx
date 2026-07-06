import { CalendarWorkspace } from "./CalendarWorkspace";
import { EventModal } from "./EventModal";
import { useCalendar } from "./useCalendar";

export function CalendarApp() {
  const calendar = useCalendar();

  return (
    <>
      <CalendarWorkspace
        month={calendar.month}
        year={calendar.year}
        events={calendar.events}
        view={calendar.view}
        onViewChange={calendar.setView}
        weekStartISO={calendar.weekStartISO}
        onPrevMonth={calendar.handlePrevMonth}
        onNextMonth={calendar.handleNextMonth}
        onPrevWeek={calendar.handlePrevWeek}
        onNextWeek={calendar.handleNextWeek}
        onPrevDay={calendar.handlePrevDay}
        onNextDay={calendar.handleNextDay}
        onPrevYear={calendar.handlePrevYear}
        onNextYear={calendar.handleNextYear}
        onToday={calendar.handleToday}
        onMonthChange={calendar.handleMonthChange}
        selectedDate={calendar.selectedDate}
        onSelectDate={calendar.handleSelectDate}
        onSelectEvent={calendar.openEditEvent}
        onNewEvent={() => calendar.openNewEvent()}
        sources={calendar.sources}
        enabledSourceIds={calendar.enabledSourceIds}
        onToggleSource={calendar.handleToggleSource}
        sidebarWidth={calendar.sidebarWidth}
        onSidebarWidthChange={calendar.setSidebarWidth}
        loading={calendar.loading}
        error={calendar.error}
      />

      <EventModal
        open={calendar.modalOpen}
        editing={calendar.editingEventId !== null}
        defaults={calendar.formDefaults}
        onClose={calendar.closeModal}
        onSave={calendar.saveEvent}
        onDelete={calendar.deleteEvent}
      />
    </>
  );
}
