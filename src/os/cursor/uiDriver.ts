/**
 * UI driver — the agent's hands. Executes CursorCommands from the server:
 * animates the overlay cursor to a target, then dispatches *real* bubbling
 * DOM events at that point. React ≥17 listens at the root, so bubbled
 * synthetic events fire the same handlers a human click would — including
 * WindowFrame's focus-on-pointerdown, so clicking a background window raises
 * it exactly like a real click.
 *
 * Every command returns a CursorResult with a human-readable outcome (or a
 * precise error) so the agent can self-correct instead of flailing.
 */
import type { CursorCommand, CursorResult, UiElement } from "@shared/types";
import { useCursorStore } from "./cursorStore";
import { captureUiSnapshot, resolveCid } from "./uiSnapshot";

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------

/** Scroll the target into view (inside app content), then return its live center. */
function centerOf(el: HTMLElement): { x: number; y: number } {
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" as ScrollBehavior });
  const rect = el.getBoundingClientRect();
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * Occlusion check: whatever elementFromPoint returns must be the target or
 * share ancestry with it. If another window covers the point, the agent gets
 * told what's actually on top instead of silently clicking the wrong thing.
 */
function topElementAt(x: number, y: number, target: HTMLElement): HTMLElement | { occludedBy: string } {
  const hit = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!hit) return { occludedBy: "nothing (point is outside the viewport)" };
  if (hit === target || target.contains(hit) || hit.contains(target)) return hit;
  const win = hit.closest(".arco-window");
  return {
    occludedBy: win
      ? `window "${win.getAttribute("aria-label") ?? "Untitled"}"`
      : hit.tagName.toLowerCase(),
  };
}

// ---------------------------------------------------------------------------
// Synthetic events
// ---------------------------------------------------------------------------

/** Full pointer+mouse click sequence at a point, dispatched on the target. */
function dispatchClick(el: HTMLElement, x: number, y: number): void {
  const base = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
  el.dispatchEvent(new PointerEvent("pointerdown", { ...base, pointerId: 9001, isPrimary: true }));
  el.dispatchEvent(new MouseEvent("mousedown", base));
  el.dispatchEvent(new PointerEvent("pointerup", { ...base, pointerId: 9001, isPrimary: true }));
  el.dispatchEvent(new MouseEvent("mouseup", base));
  el.dispatchEvent(new MouseEvent("click", base));
}

/**
 * Set a form control's value through the *native* setter. React caches the
 * value property on the prototype chain to dedupe its own updates; writing
 * via the native descriptor and then firing `input` is the only way a
 * programmatic change reaches controlled-component state.
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Per-character delay — fast enough to not bore, slow enough to watch. */
const TYPE_INTERVAL_MS = 35;

// ---------------------------------------------------------------------------
// Command executors
// ---------------------------------------------------------------------------

/** Describe an element for outcome messages: `button "Save" in "Settings"`. */
function describeTarget(el: HTMLElement): string {
  const label =
    el.getAttribute("aria-label") ?? el.textContent?.trim().replace(/\s+/g, " ").slice(0, 40) ?? "";
  const win = el.closest(".arco-window")?.getAttribute("aria-label");
  return `${el.tagName.toLowerCase()}${label ? ` "${label}"` : ""}${win ? ` in window "${win}"` : ""}`;
}

async function moveAndPress(el: HTMLElement): Promise<CursorResult | { x: number; y: number }> {
  const cursor = useCursorStore.getState();
  const { x, y } = centerOf(el);
  await cursor.moveTo(x, y);

  const hit = topElementAt(x, y, el);
  if ("occludedBy" in hit) {
    return { ok: false, error: `Target is covered by ${hit.occludedBy}. Click that window first to focus it, or take a fresh ui_snapshot.` };
  }

  cursor.setPressed(true);
  cursor.ripple();
  dispatchClick(el, x, y);
  await sleep(110); // hold the press long enough to read as a click
  cursor.setPressed(false);
  return { x, y };
}

async function executeClick(cmd: Extract<CursorCommand, { kind: "click" }>): Promise<CursorResult> {
  let el: HTMLElement | null = null;
  if (cmd.targetId) {
    el = resolveCid(cmd.targetId);
    if (!el) {
      return { ok: false, error: `No element with id "${cmd.targetId}" — the UI changed. Take a fresh ui_snapshot.` };
    }
  } else if (typeof cmd.x === "number" && typeof cmd.y === "number") {
    // Coordinate escape hatch: click whatever is at the point.
    await useCursorStore.getState().moveTo(cmd.x, cmd.y);
    el = document.elementFromPoint(cmd.x, cmd.y) as HTMLElement | null;
    if (!el) return { ok: false, error: "Nothing at that point." };
  } else {
    return { ok: false, error: "click needs targetId or x/y." };
  }

  const pressed = await moveAndPress(el);
  if ("ok" in pressed) return pressed;

  if (el instanceof HTMLElement && "focus" in el) el.focus();
  return { ok: true, outcome: `Clicked ${describeTarget(el)}.` };
}

async function executeType(cmd: Extract<CursorCommand, { kind: "type" }>): Promise<CursorResult> {
  const el = resolveCid(cmd.targetId);
  if (!el) {
    return { ok: false, error: `No element with id "${cmd.targetId}" — the UI changed. Take a fresh ui_snapshot.` };
  }
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    return { ok: false, error: `Element ${describeTarget(el)} is not a text input.` };
  }

  const pressed = await moveAndPress(el);
  if ("ok" in pressed) return pressed;
  el.focus();

  // Character-by-character so the user watches the text appear — the visual
  // is the point of the cursor; instant fills read as glitches.
  for (let i = 1; i <= cmd.text.length; i++) {
    setNativeValue(el, cmd.text.slice(0, i));
    await sleep(TYPE_INTERVAL_MS);
  }

  if (cmd.submit) {
    const key = { key: "Enter", code: "Enter", bubbles: true, cancelable: true };
    el.dispatchEvent(new KeyboardEvent("keydown", key));
    el.dispatchEvent(new KeyboardEvent("keyup", key));
    el.form?.requestSubmit?.();
  }

  return {
    ok: true,
    outcome: `Typed "${cmd.text}" into ${describeTarget(el)}${cmd.submit ? " and pressed Enter" : ""}.`,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Execute one cursor command from the agent. Never throws — every failure
 * becomes a structured error the LLM can reason about. Click/type results
 * carry a fresh snapshot so the agent sees the consequences of its action
 * without a second round trip.
 */
export async function executeCursorCommand(command: CursorCommand): Promise<CursorResult> {
  try {
    switch (command.kind) {
      case "snapshot":
        return { ok: true, snapshot: captureUiSnapshot() };
      case "click": {
        const result = await executeClick(command);
        // Give React a beat to re-render before observing the aftermath.
        await sleep(80);
        return result.ok ? { ...result, snapshot: captureUiSnapshot() } : result;
      }
      case "type": {
        const result = await executeType(command);
        await sleep(80);
        return result.ok ? { ...result, snapshot: captureUiSnapshot() } : result;
      }
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Cursor command failed" };
  }
}

/** Console/dev handle for driving the cursor without an agent turn. */
declare global {
  interface Window {
    __arcoCursor?: { execute: typeof executeCursorCommand; element?: UiElement };
  }
}
if (import.meta.env.DEV) {
  window.__arcoCursor = { execute: executeCursorCommand };
}
