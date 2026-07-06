import { formatMinutesToLabel, getEventStartMinutes, type CalendarEvent, type CalendarEventTone } from "./types";

const TONE_CLASS: Record<CalendarEventTone, string> = {
  accent: "arco-cal-event-block--accent",
  success: "arco-cal-event-block--success",
  warning: "arco-cal-event-block--warning",
  danger: "arco-cal-event-block--danger",
  neutral: "arco-cal-event-block--neutral",
};

export function CalendarEventBlock({
  event,
  compact = false,
  onClick,
}: {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
}) {
  const tone = event.tone ?? "accent";
  const startMinutes = getEventStartMinutes(event);
  const timeLabel = startMinutes != null ? formatMinutesToLabel(startMinutes) : undefined;

  return (
    <button
      type="button"
      className={[
        "arco-cal-event-block",
        TONE_CLASS[tone],
        compact ? "arco-cal-event-block--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(domEvent) => {
        domEvent.stopPropagation();
        onClick?.();
      }}
    >
      {timeLabel ? <div className="arco-cal-event-block__time">{timeLabel}</div> : null}
      <div className="arco-cal-event-block__title">{event.title}</div>
      {!compact && event.location ? (
        <div className="arco-cal-event-block__location">{event.location}</div>
      ) : null}
    </button>
  );
}
