/**
 * UI snapshot — the agent's eyes. Walks the live DOM and returns a compact,
 * text-only description of every interactive element, grouped by window, so
 * any LLM (no vision required) can decide what to click.
 *
 * Addressing invariant: each element found gets a stable id stamped as
 * `data-arco-cid`. Later commands target that id and the driver re-resolves
 * the node's live rect at execution time, so clicks land even if the window
 * moved between snapshot and action.
 *
 * This is a DOM inventory of interactive controls — not a screen reader.
 */
import type {
  UiElement,
  UiHostMode,
  UiSnapshot,
  UiWindowControl,
  UiWindowSnapshot,
} from "@shared/types";
import { shouldUseNativeAppWindows } from "../nativeAppWindows";
import { useWindowStore } from "../windowStore";
import { getIframeUiDriver, guestElementId } from "./iframeUiBridge";

export const CID_ATTR = "data-arco-cid";

let cidCounter = 0;

/** Selector for elements the agent may plausibly want to interact with. */
const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "textarea",
  "select",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="option"]',
  '[role="combobox"]',
  '[contenteditable="true"]',
].join(", ");

/** Surfaces the cursor cannot see into or drive with DOM events. */
const OPAQUE_SELECTOR = "iframe, .monaco-editor, .xterm";

// ---------------------------------------------------------------------------
// Element description
// ---------------------------------------------------------------------------

/**
 * Best-effort accessible name, in decreasing order of intent: explicit ARIA,
 * form labels, placeholder, tooltip title, then visible text.
 */
function accessibleLabel(el: HTMLElement): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const label = el.labels?.[0]?.textContent?.trim();
    if (label) return label;
    if (el.placeholder) return el.placeholder;
  }

  const title = el.getAttribute("title");
  if (title) return title;

  const text = el.textContent?.trim().replace(/\s+/g, " ") ?? "";
  return text.slice(0, 60);
}

/** ARIA role if set, otherwise a role derived from the tag/input type. */
function elementRole(el: HTMLElement): string {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  if (el.isContentEditable) return "textbox";
  const tag = el.tagName.toLowerCase();
  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    if (type === "checkbox" || type === "radio" || type === "range") return type;
    return "textbox";
  }
  if (tag === "textarea") return "textbox";
  if (tag === "a") return "link";
  if (tag === "select") return "select";
  return tag;
}

/**
 * Visible and on-screen: rendered (has a box), inside the viewport, and not
 * hidden by CSS. Occlusion by other windows is checked at click time, not
 * here — a covered element is still worth listing (the agent can focus its
 * window first).
 */
function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  if (rect.bottom < 0 || rect.right < 0) return false;
  if (rect.top > window.innerHeight || rect.left > window.innerWidth) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
}

/** Stamp (or reuse) the stable cid and describe one element. */
function describe(el: HTMLElement): UiElement {
  let cid = el.getAttribute(CID_ATTR);
  if (!cid) {
    cid = `e${++cidCounter}`;
    el.setAttribute(CID_ATTR, cid);
  }
  const rect = el.getBoundingClientRect();
  const entry: UiElement = {
    id: cid,
    role: elementRole(el),
    label: accessibleLabel(el),
    rect: {
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    },
  };
  if (el.matches(":disabled") || el.getAttribute("aria-disabled") === "true") {
    entry.disabled = true;
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.value) entry.value = el.value.slice(0, 120);
  }
  return entry;
}

function collectIn(root: Element): UiElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR))
    .filter(isVisible)
    .map(describe);
}

function detectHostMode(): UiHostMode {
  if (document.querySelector(".arco-mobile-shell")) return "mobile";
  if (shouldUseNativeAppWindows()) return "native";
  return "embedded";
}

function classifyWindow(
  winEl: HTMLElement | null,
  hasOpaque: boolean,
  bridged: boolean,
): {
  control: UiWindowControl;
  reason?: string;
} {
  if (!winEl) return { control: "cursor" };
  if (bridged) return { control: "cursor", reason: "iframe_bridge" };
  if (hasOpaque) {
    const iframe = winEl.querySelector("iframe");
    if (iframe) return { control: "opaque", reason: "iframe" };
    if (winEl.querySelector(".monaco-editor")) return { control: "partial", reason: "monaco" };
    if (winEl.querySelector(".xterm")) return { control: "partial", reason: "xterm" };
    return { control: "opaque", reason: "opaque_surface" };
  }
  return { control: "cursor" };
}

function opaqueNotesFor(winEl: HTMLElement, title: string, bridged: boolean): string[] {
  return Array.from(winEl.querySelectorAll<HTMLElement>(OPAQUE_SELECTOR))
    .filter(isVisible)
    .map((el) => {
      if (el.tagName === "IFRAME") {
        if (bridged) {
          return `iframe inside "${title}" — driveable via AppHost UI bridge (element ids prefixed g:…)`;
        }
        return `iframe inside "${title}" — no UI bridge yet; prefer domain tools (calendar_*/mail_*/… ) or open_only — do not retry mouse_click`;
      }
      return `code/terminal editor inside "${title}" — not typeable via cursor tools; do not retry type_text here`;
    });
}

// ---------------------------------------------------------------------------
// Snapshot assembly
// ---------------------------------------------------------------------------

export interface CaptureUiSnapshotOptions {
  windowTitle?: string;
}

/** Capture the visible shell as the agent's view of the screen. */
export async function captureUiSnapshot(options?: CaptureUiSnapshotOptions): Promise<UiSnapshot> {
  const hostMode = detectHostMode();
  const windows: UiWindowSnapshot[] = [];
  const opaqueRegions: string[] = [];
  const filter = options?.windowTitle?.trim().toLowerCase();

  if (hostMode === "native") {
    // App content lives in separate Electron windows — only metadata from the store.
    const wm = useWindowStore.getState();
    const focusedId = wm.focusedId();
    for (const win of wm.windows) {
      if (filter && !win.title.toLowerCase().includes(filter)) continue;
      windows.push({
        title: win.title,
        windowId: win.id,
        focused: win.id === focusedId,
        minimized: win.minimized,
        control: "opaque",
        reason: "native_host",
        elements: [],
      });
      opaqueRegions.push(
        `window "${win.title}" runs in a separate OS window — cursor tools require embedded app windows. Use os_ui to open/focus only, or ask the user to switch to embedded windows.`,
      );
    }
  } else {
    const wm = useWindowStore.getState();
    const focusedId = wm.focusedId();
    const rendered = new Set<string>();

    // Live DOM windows (not minimized — those unmount from WindowFrame).
    for (const winEl of Array.from(document.querySelectorAll<HTMLElement>(".arco-window"))) {
      const title = winEl.getAttribute("aria-label") ?? "Untitled window";
      if (filter && !title.toLowerCase().includes(filter)) continue;
      const storeWin =
        wm.windows.find((w) => w.id && w.title === title && !w.minimized) ??
        wm.windows.find((w) => !w.minimized && w.title === title);
      const windowId = storeWin?.id;
      const driver = windowId ? getIframeUiDriver(windowId) : undefined;
      const bridged = Boolean(driver);
      const opaque = opaqueNotesFor(winEl, title, bridged);
      opaqueRegions.push(...opaque);
      const { control, reason } = classifyWindow(winEl, opaque.length > 0, bridged);
      if (storeWin) rendered.add(storeWin.id);

      const hostElements = collectIn(winEl);
      let guestElements: UiElement[] = [];
      if (driver && windowId) {
        const result = await driver({ kind: "snapshot" });
        if ("elements" in result) {
          guestElements = result.elements.map((el) => ({
            ...el,
            id: guestElementId(windowId, el.id),
          }));
        } else if ("error" in result) {
          opaqueRegions.push(`iframe bridge for "${title}" failed: ${result.error}`);
        }
      }

      windows.push({
        title,
        windowId,
        focused: winEl.classList.contains("arco-window--focused"),
        elements: [...hostElements, ...guestElements],
        control: guestElements.length > 0 ? "cursor" : control,
        reason: guestElements.length > 0 ? "iframe_bridge" : reason,
      });
    }

    // Minimized windows: metadata only so the agent can restore_app.
    for (const win of wm.windows) {
      if (!win.minimized) continue;
      if (filter && !win.title.toLowerCase().includes(filter)) continue;
      if (rendered.has(win.id)) continue;
      windows.push({
        title: win.title,
        windowId: win.id,
        focused: win.id === focusedId,
        minimized: true,
        control: "opaque",
        reason: "minimized",
        elements: [],
      });
      opaqueRegions.push(
        `window "${win.title}" is minimized — call os_ui restore_app / focus_app before interacting`,
      );
    }
  }

  const shell: UiElement[] =
    hostMode === "mobile"
      ? []
      : [
          ...Array.from(document.querySelectorAll<HTMLElement>(".arco-menubar, .arco-dock")).flatMap(
            collectIn,
          ),
        ];

  if (hostMode === "mobile") {
    opaqueRegions.push(
      "Mobile shell — agent cursor overlay is desktop-only; cursor tools will not work here",
    );
  }

  return {
    screen: { w: window.innerWidth, h: window.innerHeight },
    hostMode,
    windows,
    shell,
    opaqueRegions: [...new Set(opaqueRegions)],
  };
}

/** Resolve a previously stamped cid back to its live DOM node. */
export function resolveCid(targetId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${CID_ATTR}="${CSS.escape(targetId)}"]`);
}
