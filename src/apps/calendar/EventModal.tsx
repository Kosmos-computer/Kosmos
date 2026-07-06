import { useEffect, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { Button, Input } from "../../components/ui";
import type { EventFormState } from "./types";

export function EventModal({
  open,
  editing,
  defaults,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  editing: boolean;
  defaults: EventFormState;
  onClose: () => void;
  onSave: (form: EventFormState) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [form, setForm] = useState<EventFormState>(defaults);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(defaults);
    setError(null);
  }, [open, defaults]);

  if (!open) return null;

  const canSave = form.title.trim().length > 0;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="arco-cal-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-cal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cal-event-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="arco-cal-modal__header">
          <div className="arco-cal-modal__heading">
            <CalendarDays size={18} aria-hidden />
            <h2 id="cal-event-title">{editing ? "Edit event" : "New event"}</h2>
          </div>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="arco-cal-modal__body">
          <label className="arco-cal-modal__field">
            <span>Title</span>
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              autoFocus
            />
          </label>

          <label className="arco-cal-modal__checkbox">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(event) => setForm((current) => ({ ...current, allDay: event.target.checked }))}
            />
            All day
          </label>

          <div className="arco-cal-modal__row">
            <label className="arco-cal-modal__field">
              <span>Start date</span>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              />
            </label>
            {!form.allDay ? (
              <label className="arco-cal-modal__field">
                <span>Start time</span>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                />
              </label>
            ) : null}
          </div>

          <div className="arco-cal-modal__row">
            <label className="arco-cal-modal__field">
              <span>End date</span>
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              />
            </label>
            {!form.allDay ? (
              <label className="arco-cal-modal__field">
                <span>End time</span>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                />
              </label>
            ) : null}
          </div>

          <label className="arco-cal-modal__field">
            <span>Location</span>
            <Input
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            />
          </label>

          <label className="arco-cal-modal__field">
            <span>Notes</span>
            <textarea
              className="arco-input arco-cal-modal__notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
            />
          </label>

          {error ? <div className="arco-cal-modal__error">{error}</div> : null}
        </div>

        <div className="arco-cal-modal__footer">
          {editing ? (
            <Button variant="danger" onClick={() => void handleDelete()} disabled={saving}>
              Delete
            </Button>
          ) : null}
          <div className="arco-cal-modal__footer-right">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSave()} disabled={!canSave || saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create event"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
