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
import { shouldUseNativeAppWindows } from "../nativeAppWindows";
import { useWindowStore } from "../windowStore";
import { getIframeUiDriver, parseGuestElementId } from "./iframeUiBridge";

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
 * told what's actually on top — and which appId to focus — instead of silently
 * clicking the wrong thing.
 */
function topElementAt(
  x: number,
  y: number,
  target: HTMLElement,
): HTMLElement | { occludedBy: string; focusAppId?: string; focusTitle?: string } {
  const hit = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!hit) return { occludedBy: "nothing (point is outside the viewport)" };
  if (hit === target || target.contains(hit) || hit.contains(target)) return hit;
  const win = hit.closest(".arco-window");
  const title = win?.getAttribute("aria-label") ?? undefined;
  const storeWin = title
    ? useWindowStore.getState().windows.find((w) => w.title === title && !w.minimized)
    : undefined;
  // Prefer bare app id for os_ui (notes, core.docs, …) over window keys.
  let focusAppId: string | undefined;
  if (storeWin) {
    switch (storeWin.kind.type) {
      case "system":
        focusAppId = storeWin.kind.app;
        break;
      case "generated":
        focusAppId = storeWin.kind.appId;
        break;
      case "installed":
        focusAppId = storeWin.kind.appId;
        break;
      case "web":
        focusAppId = storeWin.kind.webAppId;
        break;
    }
  }
  return {
    occludedBy: win ? `window "${title ?? "Untitled"}"` : hit.tagName.toLowerCase(),
    focusTitle: title,
    focusAppId,
  };
}

function nativeHostBlock(): CursorResult | null {
  if (!shouldUseNativeAppWindows()) return null;
  return {
    ok: false,
    error:
      "Cursor control requires embedded app windows. The shell is in native/separate-window mode — use os_ui to open/focus only, or ask the user to switch Settings → embedded windows.",
  };
}

function mobileBlock(): CursorResult | null {
  if (!document.querySelector(".arco-mobile-shell")) return null;
  return {
    ok: false,
    error: "Cursor tools are desktop-only. The mobile shell has no agent cursor overlay.",
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
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const proto =
    el instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLSelectElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Per-character delay — fast enough to not bore, slow enough to watch. */
const TYPE_INTERVAL_MS = 35;

function isContentEditable(el: HTMLElement): boolean {
  return el.isContentEditable || el.getAttribute("contenteditable") === "true";
}

/** Type into TipTap / ProseMirror / contenteditable via insertText. */
async function typeIntoContentEditable(el: HTMLElement, text: string, submit?: boolean): Promise<void> {
  el.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);

  for (const ch of text) {
    document.execCommand("insertText", false, ch);
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, inputType: "insertText" }));
    await sleep(TYPE_INTERVAL_MS);
  }

  if (submit) {
    const key = { key: "Enter", code: "Enter", bubbles: true, cancelable: true };
    el.dispatchEvent(new KeyboardEvent("keydown", key));
    el.dispatchEvent(new KeyboardEvent("keyup", key));
  }
}

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
    return {
      ok: false,
      error: `Target is covered by ${hit.occludedBy}. Call os_ui focus_app (or restore_app if minimized) for that window, then take a fresh ui_snapshot.`,
      focusAppId: hit.focusAppId,
      focusTitle: hit.focusTitle,
    };
  }

  cursor.setPressed(true);
  cursor.ripple();
  dispatchClick(el, x, y);
  await sleep(110);
  cursor.setPressed(false);
  return { x, y };
}

async function executeGuestCommand(
  targetId: string,
  command:
    | { kind: "click" }
    | { kind: "type"; text: string; submit?: boolean }
    | { kind: "select"; value: string },
): Promise<CursorResult> {
  const parsed = parseGuestElementId(targetId);
  if (!parsed) return { ok: false, error: `Invalid guest element id "${targetId}"` };
  const driver = getIframeUiDriver(parsed.windowId);
  if (!driver) {
    return {
      ok: false,
      error: `No UI bridge for window ${parsed.windowId}. Re-open the app, or use domain tools if this surface is open_only.`,
    };
  }

  // Move the visible cursor to the iframe center so the user sees intent.
  const win = useWindowStore.getState().windows.find((w) => w.id === parsed.windowId);
  const frame = document
    .querySelector(`.arco-window[aria-label="${CSS.escape(win?.title ?? "")}"] iframe`)
    ?.getBoundingClientRect();
  if (frame) {
    await useCursorStore.getState().moveTo(frame.x + frame.width / 2, frame.y + frame.height / 2);
    useCursorStore.getState().setPressed(true);
    useCursorStore.getState().ripple();
  }

  const result = await driver(
    command.kind === "click"
      ? { kind: "click", targetId: parsed.localId }
      : command.kind === "type"
        ? { kind: "type", targetId: parsed.localId, text: command.text, submit: command.submit }
        : { kind: "select", targetId: parsed.localId, value: command.value },
  );

  useCursorStore.getState().setPressed(false);

  if ("error" in result) return { ok: false, error: result.error };
  return {
    ok: true,
    outcome:
      command.kind === "click"
        ? `Clicked bridged element ${parsed.localId} in ${parsed.windowId}.`
        : command.kind === "type"
          ? `Typed into bridged element ${parsed.localId} in ${parsed.windowId}.`
          : `Selected on bridged element ${parsed.localId} in ${parsed.windowId}.`,
  };
}

async function executeClick(cmd: Extract<CursorCommand, { kind: "click" }>): Promise<CursorResult> {
  if (cmd.targetId && parseGuestElementId(cmd.targetId)) {
    return executeGuestCommand(cmd.targetId, { kind: "click" });
  }

  let el: HTMLElement | null = null;
  if (cmd.targetId) {
    el = resolveCid(cmd.targetId);
    if (!el) {
      return { ok: false, error: `No element with id "${cmd.targetId}" — the UI changed. Take a fresh ui_snapshot.` };
    }
  } else if (typeof cmd.x === "number" && typeof cmd.y === "number") {
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
  if (parseGuestElementId(cmd.targetId)) {
    return executeGuestCommand(cmd.targetId, {
      kind: "type",
      text: cmd.text,
      submit: cmd.submit,
    });
  }

  const el = resolveCid(cmd.targetId);
  if (!el) {
    return { ok: false, error: `No element with id "${cmd.targetId}" — the UI changed. Take a fresh ui_snapshot.` };
  }

  const pressed = await moveAndPress(el);
  if ("ok" in pressed) return pressed;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
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

  if (isContentEditable(el)) {
    await typeIntoContentEditable(el, cmd.text, cmd.submit);
    return {
      ok: true,
      outcome: `Typed "${cmd.text}" into contenteditable ${describeTarget(el)}${cmd.submit ? " and pressed Enter" : ""}.`,
    };
  }

  return {
    ok: false,
    error: `Element ${describeTarget(el)} is not a text input or contenteditable.`,
  };
}

async function executeSelect(cmd: Extract<CursorCommand, { kind: "select" }>): Promise<CursorResult> {
  if (parseGuestElementId(cmd.targetId)) {
    return executeGuestCommand(cmd.targetId, { kind: "select", value: cmd.value });
  }

  const el = resolveCid(cmd.targetId);
  if (!el) {
    return { ok: false, error: `No element with id "${cmd.targetId}" — the UI changed. Take a fresh ui_snapshot.` };
  }
  if (!(el instanceof HTMLSelectElement)) {
    return { ok: false, error: `Element ${describeTarget(el)} is not a <select>.` };
  }

  const pressed = await moveAndPress(el);
  if ("ok" in pressed) return pressed;

  el.focus();
  setNativeValue(el, cmd.value);
  return { ok: true, outcome: `Selected value "${cmd.value}" on ${describeTarget(el)}.` };
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
    const blocked = nativeHostBlock() ?? mobileBlock();
    if (blocked && command.kind !== "snapshot") return blocked;

    switch (command.kind) {
      case "snapshot":
        return {
          ok: true,
          snapshot: await captureUiSnapshot(
            command.windowTitle ? { windowTitle: command.windowTitle } : undefined,
          ),
        };
      case "click": {
        const result = await executeClick(command);
        await sleep(160);
        return result.ok ? { ...result, snapshot: await captureUiSnapshot() } : result;
      }
      case "type": {
        const result = await executeType(command);
        await sleep(160);
        return result.ok ? { ...result, snapshot: await captureUiSnapshot() } : result;
      }
      case "select": {
        const result = await executeSelect(command);
        await sleep(160);
        return result.ok ? { ...result, snapshot: await captureUiSnapshot() } : result;
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
