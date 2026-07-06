/**
 * Calendar — the first core app built on the app platform.
 *
 * Everything goes through the SDK: events are read/written via the
 * os.calendar@1 intents (never a private API), so any other app or the
 * agent sees exactly the same data, and this app can be swapped for any
 * other implementation of the contract without losing anything.
 */
import { createAppClient } from "/app-sdk.js";

const os = createAppClient();

// ── State ─────────────────────────────────────────────────────────────────────

let viewYear, viewMonth; // month being displayed (0-based month)
let events = []; // events overlapping the visible grid
let editingId = null; // event id when the dialog edits, null when creating

const grid = document.getElementById("grid");
const monthTitle = document.getElementById("month-title");
const errorBox = document.getElementById("error");
const dialog = document.getElementById("event-dialog");
const form = document.getElementById("event-form");
const dialogTitle = document.getElementById("dialog-title");
const deleteBtn = document.getElementById("delete-event");

// ── Date helpers (all local time; storage is ISO/UTC) ───────────────────────

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function hm(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(date.getHours())}:${p(date.getMinutes())}`;
}

/** The 42 cells of a Monday-first month grid. */
function gridDays(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function occursOn(event, day) {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return new Date(event.start) < dayEnd && new Date(event.end) >= dayStart;
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function loadEvents() {
  const days = gridDays(viewYear, viewMonth);
  try {
    events = await os.intents.invoke("calendar.events.list", {
      from: days[0].toISOString(),
      to: new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate() + 1).toISOString(),
    });
    showError(null);
  } catch (err) {
    events = [];
    showError(err.message);
  }
  render();
}

function showError(message) {
  errorBox.hidden = !message;
  errorBox.textContent = message ?? "";
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function render() {
  monthTitle.textContent = new Date(viewYear, viewMonth).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const todayKey = ymd(new Date());
  grid.replaceChildren();

  for (const day of gridDays(viewYear, viewMonth)) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-day";
    if (day.getMonth() !== viewMonth) cell.classList.add("cal-day--outside");
    if (ymd(day) === todayKey) cell.classList.add("cal-day--today");
    cell.addEventListener("click", () => openDialog(null, day));

    const num = document.createElement("span");
    num.className = "cal-day__num";
    num.textContent = String(day.getDate());
    cell.appendChild(num);

    const dayEvents = events.filter((e) => occursOn(e, day));
    for (const event of dayEvents.slice(0, 3)) {
      const chip = document.createElement("span");
      chip.className = "cal-event";
      chip.textContent = event.allDay
        ? event.title
        : `${hm(new Date(event.start))} ${event.title}`;
      chip.title = event.title;
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        openDialog(event);
      });
      cell.appendChild(chip);
    }
    if (dayEvents.length > 3) {
      const more = document.createElement("span");
      more.className = "cal-more";
      more.textContent = `+${dayEvents.length - 3} more`;
      cell.appendChild(more);
    }

    grid.appendChild(cell);
  }
}

// ── Dialog ────────────────────────────────────────────────────────────────────

function openDialog(event, day) {
  editingId = event?.id ?? null;
  dialogTitle.textContent = event ? "Edit event" : "New event";
  deleteBtn.hidden = !event;
  form.reset();

  if (event) {
    const start = new Date(event.start);
    const end = new Date(event.end);
    form.title.value = event.title;
    form.allDay.checked = event.allDay;
    form.startDate.value = ymd(start);
    form.startTime.value = event.allDay ? "" : hm(start);
    form.endDate.value = ymd(end);
    form.endTime.value = event.allDay ? "" : hm(end);
    form.location.value = event.location ?? "";
    form.notes.value = event.notes ?? "";
  } else {
    const base = day ?? new Date();
    form.startDate.value = ymd(base);
    form.endDate.value = ymd(base);
    form.startTime.value = "09:00";
    form.endTime.value = "10:00";
  }
  dialog.showModal();
}

function readForm() {
  const allDay = form.allDay.checked;
  const start = allDay
    ? new Date(`${form.startDate.value}T00:00`)
    : new Date(`${form.startDate.value}T${form.startTime.value || "00:00"}`);
  const endBase = allDay
    ? new Date(`${form.endDate.value}T00:00`)
    : new Date(`${form.endDate.value}T${form.endTime.value || "23:59"}`);
  // All-day events span to the following midnight so range queries include them.
  const end = allDay ? new Date(endBase.getTime() + 24 * 60 * 60 * 1000) : endBase;
  return {
    title: form.title.value,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay,
    location: form.location.value || undefined,
    notes: form.notes.value || undefined,
  };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = readForm();
  try {
    if (editingId) {
      await os.intents.invoke("calendar.event.update", { id: editingId, ...input });
    } else {
      await os.intents.invoke("calendar.event.create", input);
    }
    dialog.close();
    await loadEvents();
  } catch (err) {
    showError(err.message);
    dialog.close();
  }
});

deleteBtn.addEventListener("click", async () => {
  if (!editingId) return;
  try {
    await os.intents.invoke("calendar.event.delete", { id: editingId });
    dialog.close();
    await loadEvents();
  } catch (err) {
    showError(err.message);
    dialog.close();
  }
});

document.getElementById("cancel-dialog").addEventListener("click", () => dialog.close());

// ── Navigation ────────────────────────────────────────────────────────────────

function setMonth(year, month) {
  const d = new Date(year, month, 1);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
  void loadEvents();
}

document.getElementById("prev").addEventListener("click", () => setMonth(viewYear, viewMonth - 1));
document.getElementById("next").addEventListener("click", () => setMonth(viewYear, viewMonth + 1));
document.getElementById("today").addEventListener("click", () => {
  const now = new Date();
  setMonth(now.getFullYear(), now.getMonth());
});
document.getElementById("new-event").addEventListener("click", () => openDialog(null));

// ── Live updates ──────────────────────────────────────────────────────────────

// Agent- or app-made changes announce calendar.changed; re-query so the
// grid reflects events created outside this window (chat, automations).
os.events.on("calendar.changed", () => void loadEvents());

// ── Boot ──────────────────────────────────────────────────────────────────────

const weekdaysRow = document.getElementById("weekdays");
for (const name of WEEKDAYS) {
  const span = document.createElement("span");
  span.textContent = name;
  weekdaysRow.appendChild(span);
}

const now = new Date();
setMonth(now.getFullYear(), now.getMonth());
