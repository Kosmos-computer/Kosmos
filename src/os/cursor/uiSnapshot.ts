/**
 * UI snapshot — the agent's eyes. Walks the live DOM and returns a compact,
 * text-only description of every interactive element, grouped by window, so
 * any LLM (no vision required) can decide what to click.
 *
 * Addressing invariant: each element found gets a stable id stamped as
 * `data-arco-cid`. Later commands target that id and the driver re-resolves
 * the node's live rect at execution time, so clicks land even if the window
 * moved between snapshot and action.
 */
import type { UiElement, UiSnapshot, UiWindowSnapshot } from "@shared/types";

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

// ---------------------------------------------------------------------------
// Snapshot assembly
//
// Grouping mirrors how the shell is actually structured: `.arco-window`
// sections (WindowFrame renders role="dialog" with the title as aria-label),
// plus the dock and menu bar as window-less "shell" targets.
// ---------------------------------------------------------------------------

/** Capture the visible shell as the agent's view of the screen. */
export function captureUiSnapshot(): UiSnapshot {
  const windows: UiWindowSnapshot[] = [];
  const windowNodes = Array.from(document.querySelectorAll<HTMLElement>(".arco-window"));

  for (const winEl of windowNodes) {
    windows.push({
      title: winEl.getAttribute("aria-label") ?? "Untitled window",
      focused: winEl.classList.contains("arco-window--focused"),
      elements: collectIn(winEl),
    });
  }

  // Dock + menu bar targets let the agent launch apps and use shell chrome.
  const shell: UiElement[] = [
    ...Array.from(document.querySelectorAll<HTMLElement>(".arco-menubar, .arco-dock")).flatMap(
      collectIn,
    ),
  ];

  // Report embedded surfaces the agent must not try to drive, by nearest
  // window title, so it understands *why* a region has no targets.
  const opaqueRegions = Array.from(document.querySelectorAll<HTMLElement>(OPAQUE_SELECTOR))
    .filter(isVisible)
    .map((el) => {
      const win = el.closest(".arco-window");
      const host = win?.getAttribute("aria-label") ?? "desktop";
      const kind = el.tagName === "IFRAME" ? "embedded page (iframe)" : "code/terminal editor";
      return `${kind} inside "${host}" — not inspectable or clickable via cursor tools`;
    });

  return {
    screen: { w: window.innerWidth, h: window.innerHeight },
    windows,
    shell,
    opaqueRegions: [...new Set(opaqueRegions)],
  };
}

/** Resolve a previously stamped cid back to its live DOM node. */
export function resolveCid(targetId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${CID_ATTR}="${CSS.escape(targetId)}"]`);
}
