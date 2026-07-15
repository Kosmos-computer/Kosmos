import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { Automation, AutomationTrigger, ChannelInfo, DeliveryTarget } from "@shared/types";
import { api } from "../../lib/api";
import { Button, Input } from "../../components/ui";
import {
  buildCronSchedule,
  formatTimeOfDay,
  parseCronSchedule,
  parseTimeOfDay,
  type SchedulePresetKind,
} from "./scheduleUtils";

type FrequencyKey = SchedulePresetKind | "custom";

function localizedWeekdayLabels(locale: string): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, 7 + index).toLocaleDateString(locale, { weekday: "short" }),
  );
}

function deliveryOptions(channels: ChannelInfo[]): { value: string; label: string }[] {
  return channels
    .filter((ch) => ch.config.enabled)
    .flatMap((ch) =>
      ch.peers.map((p) => ({
        value: `${ch.config.id}:${p.chatId}`,
        label: `${ch.config.name} · ${p.label}`,
      })),
    );
}

function parseTarget(value: string): DeliveryTarget | undefined {
  const idx = value.indexOf(":");
  if (idx <= 0) return undefined;
  return { channelId: value.slice(0, idx), chatId: value.slice(idx + 1) };
}

function buildInitialTrigger(automation: Automation): {
  triggerType: "schedule" | "event";
  frequency: FrequencyKey;
  weekday: number;
  timeOfDay: string;
  rawSchedule: string;
  eventSource: string;
  eventOn: string;
  eventFilter: string;
} {
  if (automation.trigger.type === "event") {
    return {
      triggerType: "event",
      frequency: "custom",
      weekday: 1,
      timeOfDay: "09:00",
      rawSchedule: "",
      eventSource: automation.trigger.source ?? "github",
      eventOn: Array.isArray(automation.trigger.on)
        ? automation.trigger.on.join(", ")
        : (automation.trigger.on ?? ""),
      eventFilter: automation.trigger.filter ?? "",
    };
  }
  const parsed = parseCronSchedule(automation.trigger.schedule ?? automation.schedule);
  if (parsed.kind === "custom") {
    return {
      triggerType: "schedule",
      frequency: "custom",
      weekday: 1,
      timeOfDay:
        parsed.hour !== undefined && parsed.minute !== undefined
          ? formatTimeOfDay(parsed.hour, parsed.minute)
          : "09:00",
      rawSchedule: parsed.raw,
      eventSource: "github",
      eventOn: "",
      eventFilter: "",
    };
  }
  return {
    triggerType: "schedule",
    frequency: parsed.kind,
    weekday: parsed.kind === "weekly" ? (parsed.weekday ?? 1) : 1,
    timeOfDay: formatTimeOfDay(parsed.hour, parsed.minute),
    rawSchedule: automation.trigger.schedule ?? automation.schedule,
    eventSource: "github",
    eventOn: "",
    eventFilter: "",
  };
}

export function EditAutomationModal({
  automation,
  channels,
  open,
  onClose,
  onSaved,
}: {
  automation: Automation;
  channels: ChannelInfo[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, i18n } = useTranslation();
  const weekdays = useMemo(() => localizedWeekdayLabels(i18n.language), [i18n.language]);
  const initial = useMemo(() => buildInitialTrigger(automation), [automation]);
  const [name, setName] = useState(automation.name);
  const [prompt, setPrompt] = useState(automation.prompt);
  const [deliver, setDeliver] = useState(
    automation.deliver ? `${automation.deliver.channelId}:${automation.deliver.chatId}` : "",
  );
  const [triggerType, setTriggerType] = useState(initial.triggerType);
  const [frequency, setFrequency] = useState<FrequencyKey>(initial.frequency);
  const [weekday, setWeekday] = useState(initial.weekday);
  const [timeOfDay, setTimeOfDay] = useState(initial.timeOfDay);
  const [rawSchedule, setRawSchedule] = useState(initial.rawSchedule);
  const [eventSource, setEventSource] = useState(initial.eventSource);
  const [eventOn, setEventOn] = useState(initial.eventOn);
  const [eventFilter, setEventFilter] = useState(initial.eventFilter);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(automation.name);
    setPrompt(automation.prompt);
    setDeliver(
      automation.deliver ? `${automation.deliver.channelId}:${automation.deliver.chatId}` : "",
    );
    const next = buildInitialTrigger(automation);
    setTriggerType(next.triggerType);
    setFrequency(next.frequency);
    setWeekday(next.weekday);
    setTimeOfDay(next.timeOfDay);
    setRawSchedule(next.rawSchedule);
    setEventSource(next.eventSource);
    setEventOn(next.eventOn);
    setEventFilter(next.eventFilter);
    setError(null);
  }, [open, automation]);

  if (!open) return null;

  function buildTrigger(): AutomationTrigger {
    if (triggerType === "event") {
      const onParts = eventOn
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      return {
        type: "event",
        source: eventSource.trim() || "github",
        on: onParts.length === 1 ? onParts[0] : onParts,
        filter: eventFilter.trim() || undefined,
      };
    }
    if (frequency === "custom") {
      return { type: "schedule", schedule: rawSchedule.trim() || "0 9 * * *" };
    }
    const time = parseTimeOfDay(timeOfDay) ?? { hour: 9, minute: 0 };
    const schedule = buildCronSchedule({
      kind: frequency,
      hour: time.hour,
      minute: time.minute,
      weekday: frequency === "weekly" ? weekday : undefined,
    });
    return { type: "schedule", schedule };
  }

  async function handleSave() {
    if (!name.trim() || !prompt.trim()) {
      setError(t(I18nKey.APPS$AUTOMATIONS_NAME_AND_PROMPT_REQUIRED));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const target = parseTarget(deliver);
      await api.updateAutomation(automation.id, {
        name: name.trim(),
        prompt: prompt.trim(),
        trigger: buildTrigger(),
        deliver: target ?? null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(I18nKey.APPS$AUTOMATIONS_SAVE_FAILED));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="arco-task-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-task-modal"
        role="dialog"
        aria-labelledby="edit-automation-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560 }}
      >
        <header className="arco-task-modal__header">
          <h2 id="edit-automation-title"><T k={I18nKey.APPS$AUTOMATIONS_EDIT_AUTOMATION} /></h2>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label={i18n.t(I18nKey.COMMON$CLOSE)}>
            <X size={16} />
          </button>
        </header>
        <div className="arco-task-modal__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="arco-label" htmlFor="edit-auto-name"><T k={I18nKey.APPS$AUTOMATIONS_NAME} /></label>
          <Input id="edit-auto-name" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="arco-label" htmlFor="edit-auto-prompt"><T k={I18nKey.APPS$AUTOMATIONS_PROMPT} /></label>
          <textarea
            id="edit-auto-prompt"
            className="arco-input"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <label className="arco-label"><T k={I18nKey.APPS$AUTOMATIONS_TRIGGER_TYPE} /></label>
          <div className="arco-chip-row">
            <button
              type="button"
              className={`arco-chip${triggerType === "schedule" ? " arco-chip--active" : ""}`}
              onClick={() => setTriggerType("schedule")}
            ><T k={I18nKey.APPS$AUTOMATIONS_SCHEDULE} /></button>
            <button
              type="button"
              className={`arco-chip${triggerType === "event" ? " arco-chip--active" : ""}`}
              onClick={() => setTriggerType("event")}
            ><T k={I18nKey.APPS$AUTOMATIONS_EVENT} /></button>
          </div>

          {triggerType === "schedule" ? (
            <>
              <label className="arco-label"><T k={I18nKey.APPS$AUTOMATIONS_FREQUENCY} /></label>
              <select className="arco-input" value={frequency} onChange={(e) => setFrequency(e.target.value as FrequencyKey)}>
                <option value="daily"><T k={I18nKey.APPS$AUTOMATIONS_DAILY} /></option>
                <option value="weekdays"><T k={I18nKey.APPS$AUTOMATIONS_WEEKDAYS} /></option>
                <option value="weekly"><T k={I18nKey.APPS$AUTOMATIONS_WEEKLY} /></option>
                <option value="custom"><T k={I18nKey.APPS$AUTOMATIONS_CUSTOM_CRON} /></option>
              </select>
              {frequency === "weekly" ? (
                <select className="arco-input" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                  {weekdays.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : null}
              {frequency !== "custom" ? (
                <Input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
              ) : (
                <Input
                  value={rawSchedule}
                  onChange={(e) => setRawSchedule(e.target.value)}
                  placeholder={i18n.t(I18nKey.APPS$AUTOMATIONS_0_9)}
                />
              )}
            </>
          ) : (
            <>
              <label className="arco-label" htmlFor="edit-auto-source"><T k={I18nKey.APPS$AUTOMATIONS_SOURCE} /></label>
              <Input id="edit-auto-source" value={eventSource} onChange={(e) => setEventSource(e.target.value)} />
              <label className="arco-label" htmlFor="edit-auto-on"><T k={I18nKey.APPS$AUTOMATIONS_EVENTS_COMMA_SEPARATED} /></label>
              <Input
                id="edit-auto-on"
                value={eventOn}
                onChange={(e) => setEventOn(e.target.value)}
                placeholder={i18n.t(I18nKey.APPS$AUTOMATIONS_PULL_REQUEST_OPENED)}
              />
              <label className="arco-label" htmlFor="edit-auto-filter"><T k={I18nKey.APPS$AUTOMATIONS_FILTER_JSON} /></label>
              <Input
                id="edit-auto-filter"
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                placeholder='{"action":"opened"}'
              />
              <p className="arco-listrow__sub"><T k={I18nKey.APPS$AUTOMATIONS_WEBHOOK_URL} /><code><T k={I18nKey.APPS$AUTOMATIONS_API_WEBHOOKS_AUTOMATIONS} />{automation.id}</code>
              </p>
            </>
          )}

          {deliveryOptions(channels).length > 0 ? (
            <>
              <label className="arco-label" htmlFor="edit-auto-deliver"><T k={I18nKey.APPS$AUTOMATIONS_DELIVER_RESULT_TO} /></label>
              <select
                id="edit-auto-deliver"
                className="arco-input"
                value={deliver}
                onChange={(e) => setDeliver(e.target.value)}
              >
                <option value=""><T k={I18nKey.APPS$AUTOMATIONS_IN_ARCO_ONLY} /></option>
                {deliveryOptions(channels).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {error ? <p style={{ color: "var(--arco-danger)", margin: 0 }}>{error}</p> : null}
        </div>
        <footer className="arco-task-modal__footer">
          <Button onClick={onClose}><T k={I18nKey.COMMON$CANCEL} /></Button>
          <Button variant="primary" disabled={saving} onClick={() => void handleSave()}>
            {saving ? t(I18nKey.APPS$AUTOMATIONS_SAVING) : t(I18nKey.COMMON$SAVE)}
          </Button>
        </footer>
      </div>
    </div>
  );
}
