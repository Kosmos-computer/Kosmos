import type { CalendarEvent, CalendarEventTone } from "./types";

const TONE_CLASS: Record<CalendarEventTone, string> = {
  accent: "arco-cal-event-chip--accent",
  success: "arco-cal-event-chip--success",
  warning: "arco-cal-event-chip--warning",
  danger: "arco-cal-event-chip--danger",
  neutral: "arco-cal-event-chip--neutral",
};

export function EventChip({ event, onClick }: { event: CalendarEvent; onClick?: () => void }) {
  const tone = event.tone ?? "accent";
  return (
    <button
      type="button"
      className="arco-cal-event-chip"
      onClick={(domEvent) => {
        domEvent.stopPropagation();
        onClick?.();
      }}
    >
      <span className={["arco-cal-event-chip__dot", TONE_CLASS[tone]].join(" ")} aria-hidden="true" />
      {event.startTime ? <span className="arco-cal-event-chip__time">{event.startTime}</span> : null}
      <span className="arco-cal-event-chip__title">{event.title}</span>
    </button>
  );
}
