/**
 * Timer — countdown timers and clock-time alarms.
 * Persists entries in localStorage; alerts via os.shell.notify (+ optional beep).
 */
import { createAppClient } from "/app-sdk.js";

const os = createAppClient();

const STORAGE_KEY = "core.timer.v1";
const PRESETS = [
  { label: "1m", ms: 60_000 },
  { label: "5m", ms: 5 * 60_000 },
  { label: "10m", ms: 10 * 60_000 },
  { label: "15m", ms: 15 * 60_000 },
  { label: "30m", ms: 30 * 60_000 },
  { label: "1h", ms: 60 * 60_000 },
];

/** @typedef {"timer" | "alarm"} EntryKind */
/** @typedef {"running" | "paused" | "ringing"} EntryStatus */
/**
 * @typedef {{
 *   id: string,
 *   kind: EntryKind,
 *   label: string,
 *   endsAt: number,
 *   durationMs: number,
 *   remainingMs: number,
 *   status: EntryStatus,
 * }} Entry
 */

/** @type {Entry[]} */
let entries = [];
/** @type {"timer" | "alarm"} */
let mode = "timer";
let soundOn = true;
/** @type {Set<string>} */
const alertedIds = new Set();

const els = {
  clockNow: document.getElementById("clock-now"),
  modeTimer: document.getElementById("mode-timer"),
  modeAlarm: document.getElementById("mode-alarm"),
  soundToggle: document.getElementById("sound-toggle"),
  alertBanner: document.getElementById("alert-banner"),
  labelInput: document.getElementById("label-input"),
  timerForm: document.getElementById("timer-form"),
  alarmForm: document.getElementById("alarm-form"),
  presets: document.getElementById("presets"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
  startTimer: document.getElementById("start-timer"),
  alarmHour: document.getElementById("alarm-hour"),
  alarmMinute: document.getElementById("alarm-minute"),
  setAlarm: document.getElementById("set-alarm"),
  entryList: document.getElementById("entry-list"),
  listEmpty: document.getElementById("list-empty"),
};

function pad2(n) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

function formatClock(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function parseNonNegInt(raw, fallback = 0) {
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function nextId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {Entry} entry @param {number} now */
function remainingFor(entry, now) {
  if (entry.status === "paused") return entry.remainingMs;
  return Math.max(0, entry.endsAt - now);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.entries)) entries = data.entries;
    if (data.mode === "timer" || data.mode === "alarm") mode = data.mode;
    if (typeof data.soundOn === "boolean") soundOn = data.soundOn;
  } catch {
    // Ignore corrupt storage.
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ entries, mode, soundOn }),
  );
}

function playAlertTone() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i % 2 === 0 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, now + i * 0.28);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.28 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.28 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.28);
      osc.stop(now + i * 0.28 + 0.24);
    }
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    // Audio may be blocked until a gesture; notify still fires.
  }
}

function entryTitle(entry) {
  return entry.label.trim() || (entry.kind === "timer" ? "Timer" : "Alarm");
}

async function fireAlert(entry) {
  if (alertedIds.has(entry.id)) return;
  alertedIds.add(entry.id);
  if (soundOn) playAlertTone();
  try {
    await os.shell.notify(`${entryTitle(entry)} finished`);
  } catch {
    // Notification grant may be denied.
  }
}

function startTimer(ms) {
  if (ms <= 0) return;
  const now = Date.now();
  entries = [
    {
      id: nextId(),
      kind: "timer",
      label: els.labelInput.value.trim(),
      endsAt: now + ms,
      durationMs: ms,
      remainingMs: ms,
      status: "running",
    },
    ...entries,
  ];
  els.labelInput.value = "";
  saveState();
  render();
}

function startCustomTimer() {
  const h = parseNonNegInt(els.hours.value);
  const m = parseNonNegInt(els.minutes.value);
  const s = parseNonNegInt(els.seconds.value);
  startTimer((h * 3600 + m * 60 + s) * 1000);
}

function setAlarm() {
  const h = parseNonNegInt(els.alarmHour.value);
  const m = Math.min(59, parseNonNegInt(els.alarmMinute.value));
  if (h > 23) return;

  const target = new Date();
  target.setSeconds(0, 0);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }

  const endsAt = target.getTime();
  const durationMs = endsAt - Date.now();
  entries = [
    {
      id: nextId(),
      kind: "alarm",
      label: els.labelInput.value.trim(),
      endsAt,
      durationMs,
      remainingMs: durationMs,
      status: "running",
    },
    ...entries,
  ];
  els.labelInput.value = "";
  saveState();
  render();
}

function pauseEntry(id) {
  const now = Date.now();
  entries = entries.map((e) => {
    if (e.id !== id || e.status !== "running") return e;
    return {
      ...e,
      status: "paused",
      remainingMs: Math.max(0, e.endsAt - now),
    };
  });
  saveState();
  render();
}

function resumeEntry(id) {
  const now = Date.now();
  entries = entries.map((e) => {
    if (e.id !== id || e.status !== "paused") return e;
    return {
      ...e,
      status: "running",
      endsAt: now + e.remainingMs,
    };
  });
  saveState();
  render();
}

function removeEntry(id) {
  alertedIds.delete(id);
  entries = entries.filter((e) => e.id !== id);
  saveState();
  render();
}

function tickDue() {
  const now = Date.now();
  let changed = false;
  const due = [];
  entries = entries.map((e) => {
    if (e.status === "running" && e.endsAt <= now) {
      changed = true;
      due.push(e);
      return { ...e, status: "ringing", remainingMs: 0 };
    }
    return e;
  });
  if (changed) {
    saveState();
    for (const e of due) void fireAlert(e);
  }
}

function setMode(next) {
  mode = next;
  saveState();
  renderChrome();
}

function renderChrome() {
  els.modeTimer.classList.toggle("timer-chip--active", mode === "timer");
  els.modeAlarm.classList.toggle("timer-chip--active", mode === "alarm");
  els.modeTimer.setAttribute("aria-pressed", String(mode === "timer"));
  els.modeAlarm.setAttribute("aria-pressed", String(mode === "alarm"));
  els.timerForm.hidden = mode !== "timer";
  els.alarmForm.hidden = mode !== "alarm";
  els.labelInput.placeholder = mode === "timer" ? "Focus block" : "Standup";

  els.soundToggle.classList.toggle("timer-chip--active", soundOn);
  els.soundToggle.setAttribute("aria-pressed", String(soundOn));
  els.soundToggle.textContent = soundOn ? "Sound on" : "Sound off";
}

function renderAlertBanner() {
  const ringing = entries.filter((e) => e.status === "ringing");
  if (ringing.length === 0) {
    els.alertBanner.hidden = true;
    els.alertBanner.replaceChildren();
    return;
  }
  els.alertBanner.hidden = false;
  const title =
    ringing.length === 1
      ? `${entryTitle(ringing[0])} finished`
      : `${ringing.length} alerts`;
  const actions = ringing
    .map(
      (e) =>
        `<button type="button" class="timer-btn timer-btn--primary" data-dismiss="${e.id}">Dismiss ${escapeHtml(entryTitle(e))}</button>`,
    )
    .join("");
  els.alertBanner.innerHTML = `<strong>${escapeHtml(title)}</strong><div class="timer-alert__actions">${actions}</div>`;
}

function renderList(now) {
  els.entryList.replaceChildren();
  els.listEmpty.hidden = entries.length > 0;

  for (const entry of entries) {
    const remaining = remainingFor(entry, now);
    const ringing = entry.status === "ringing";
    const progress =
      entry.kind === "timer" && entry.durationMs > 0
        ? Math.min(1, Math.max(0, remaining / entry.durationMs))
        : entry.durationMs > 0
          ? Math.min(1, Math.max(0, remaining / entry.durationMs))
          : 0;

    const meta =
      entry.kind === "alarm"
        ? `At ${formatClock(new Date(entry.endsAt))}`
        : entry.status === "paused"
          ? "Paused"
          : `Ends ${formatClock(new Date(entry.endsAt))}`;

    const badge =
      ringing
        ? "Done"
        : entry.status === "paused"
          ? "Paused"
          : entry.kind === "timer"
            ? "Timer"
            : "Alarm";

    const li = document.createElement("li");
    li.className = `timer-card${ringing ? " timer-card--ringing" : ""}`;
    li.innerHTML = `
      <div class="timer-card__top">
        <div>
          <div class="timer-card__title">${escapeHtml(entryTitle(entry))}</div>
          <div class="timer-card__meta">${escapeHtml(meta)}</div>
        </div>
        <span class="timer-card__badge${ringing ? " timer-card__badge--ringing" : ""}">${badge}</span>
      </div>
      <div class="timer-card__time${ringing ? " timer-card__time--ringing" : ""}">${ringing ? "00:00" : formatDuration(remaining)}</div>
      <div class="timer-progress" aria-hidden="true"><div class="timer-progress__bar" style="width:${progress * 100}%"></div></div>
      <div class="timer-card__actions"></div>
    `;

    const actions = li.querySelector(".timer-card__actions");
    if (ringing) {
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "timer-btn timer-btn--primary";
      dismiss.textContent = "Dismiss";
      dismiss.addEventListener("click", () => removeEntry(entry.id));
      actions.appendChild(dismiss);
    } else if (entry.kind === "timer") {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "timer-btn";
      if (entry.status === "paused") {
        toggle.classList.add("timer-btn--primary");
        toggle.textContent = "Resume";
        toggle.addEventListener("click", () => resumeEntry(entry.id));
      } else {
        toggle.textContent = "Pause";
        toggle.addEventListener("click", () => pauseEntry(entry.id));
      }
      actions.appendChild(toggle);
    }

    const del = document.createElement("button");
    del.type = "button";
    del.className = "timer-btn timer-btn--danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => removeEntry(entry.id));
    actions.appendChild(del);

    els.entryList.appendChild(li);
  }
}

function render() {
  const now = Date.now();
  els.clockNow.textContent = formatClock(new Date(now));
  renderChrome();
  renderAlertBanner();
  renderList(now);
}

function renderPresets() {
  els.presets.replaceChildren();
  for (const preset of PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "timer-btn";
    btn.textContent = preset.label;
    btn.addEventListener("click", () => startTimer(preset.ms));
    els.presets.appendChild(btn);
  }
}

function seedAlarmDefaults() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  if (els.alarmHour.value === "") els.alarmHour.value = String(d.getHours());
  if (els.alarmMinute.value === "") els.alarmMinute.value = String(d.getMinutes());
}

els.modeTimer.addEventListener("click", () => setMode("timer"));
els.modeAlarm.addEventListener("click", () => setMode("alarm"));
els.soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  saveState();
  renderChrome();
});
els.startTimer.addEventListener("click", startCustomTimer);
els.setAlarm.addEventListener("click", setAlarm);
els.alertBanner.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.getAttribute("data-dismiss");
  if (id) removeEntry(id);
});

loadState();
seedAlarmDefaults();
renderPresets();
render();

window.setInterval(() => {
  tickDue();
  render();
}, 250);
