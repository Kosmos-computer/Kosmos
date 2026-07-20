/**
 * app-sdk — the client every platform app talks through.
 *
 * Plain ES module, zero dependencies, no build step: bundle apps import it
 * straight from /app-sdk.js. The SDK never talks to the server itself — it
 * postMessages the AppHost, which attaches the window's bridge token and
 * forwards. The app cannot claim an identity; the host owns it.
 *
 * Everything here is part of the platform boundary, so it is deliberately
 * brand-free: apps written against this SDK survive a product rename.
 *
 * Also handles host `ui.command` messages so the agent cursor can drive this
 * document without each app writing custom snapshot/click glue.
 */

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

const CID_ATTR = "data-arco-cid";
let cidCounter = 0;

function isVisible(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  if (rect.bottom < 0 || rect.right < 0) return false;
  if (rect.top > window.innerHeight || rect.left > window.innerWidth) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
}

function accessibleLabel(el) {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.labels?.[0]?.textContent?.trim()) return el.labels[0].textContent.trim();
    if (el.placeholder) return el.placeholder;
  }
  const title = el.getAttribute("title");
  if (title) return title;
  return (el.textContent?.trim().replace(/\s+/g, " ") ?? "").slice(0, 60);
}

function elementRole(el) {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  if (el.isContentEditable) return "textbox";
  const tag = el.tagName.toLowerCase();
  if (tag === "input") {
    const type = el.type;
    if (type === "checkbox" || type === "radio" || type === "range") return type;
    return "textbox";
  }
  if (tag === "textarea") return "textbox";
  if (tag === "a") return "link";
  if (tag === "select") return "select";
  return tag;
}

function describe(el) {
  let cid = el.getAttribute(CID_ATTR);
  if (!cid) {
    cid = `e${++cidCounter}`;
    el.setAttribute(CID_ATTR, cid);
  }
  const rect = el.getBoundingClientRect();
  const entry = {
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
  if (el.matches(":disabled") || el.getAttribute("aria-disabled") === "true") entry.disabled = true;
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.value) {
    entry.value = el.value.slice(0, 120);
  }
  return entry;
}

function captureSnapshot() {
  const elements = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR))
    .filter(isVisible)
    .map(describe);
  return { elements };
}

function resolveCid(targetId) {
  return document.querySelector(`[${CID_ATTR}="${CSS.escape(targetId)}"]`);
}

function dispatchClick(el) {
  const rect = el.getBoundingClientRect();
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  const base = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
  el.dispatchEvent(new PointerEvent("pointerdown", { ...base, pointerId: 9001, isPrimary: true }));
  el.dispatchEvent(new MouseEvent("mousedown", base));
  el.dispatchEvent(new PointerEvent("pointerup", { ...base, pointerId: 9001, isPrimary: true }));
  el.dispatchEvent(new MouseEvent("mouseup", base));
  el.dispatchEvent(new MouseEvent("click", base));
}

function setNativeValue(el, value) {
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

async function typeInto(el, text, submit) {
  el.focus();
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    setNativeValue(el, text);
  } else if (el.isContentEditable || el.getAttribute("contenteditable") === "true") {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("insertText", false, text);
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
  } else {
    throw new Error("Target is not a text input or contenteditable");
  }
  if (submit) {
    const key = { key: "Enter", code: "Enter", bubbles: true, cancelable: true };
    el.dispatchEvent(new KeyboardEvent("keydown", key));
    el.dispatchEvent(new KeyboardEvent("keyup", key));
    el.form?.requestSubmit?.();
  }
}

async function handleUiCommand(command) {
  if (command.kind === "snapshot") return captureSnapshot();
  const el = resolveCid(command.targetId);
  if (!el) throw new Error(`No element with id "${command.targetId}"`);
  if (command.kind === "click") {
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    dispatchClick(el);
    return { ok: true };
  }
  if (command.kind === "type") {
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    dispatchClick(el);
    await typeInto(el, command.text, command.submit);
    return { ok: true };
  }
  if (command.kind === "select") {
    if (!(el instanceof HTMLSelectElement)) throw new Error("Target is not a <select>");
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    dispatchClick(el);
    setNativeValue(el, command.value);
    return { ok: true };
  }
  throw new Error("Unknown ui command");
}

/**
 * Create the SDK client. Call once at app startup:
 *
 *   import { createAppClient } from "/app-sdk.js";
 *   const os = createAppClient();
 *   const events = await os.intents.invoke("calendar.events.list", {});
 */
export function createAppClient() {
  const pending = new Map();
  let seq = 0;
  let theme = { theme: "dark", tokens: {} };
  const themeListeners = new Set();
  const eventListeners = new Map(); // topic → Set<fn>
  const toolbarInputListeners = new Map(); // slot id → Set<fn>

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || msg.appBridge !== true) return;
    if (msg.type === "response") {
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.ok) entry.resolve(msg.result);
      else entry.reject(new Error(msg.error || "Bridge call failed"));
    } else if (msg.type === "theme") {
      theme = { theme: msg.theme, tokens: msg.tokens || {} };
      applyTheme(theme);
      for (const fn of themeListeners) fn(theme);
    } else if (msg.type === "event") {
      for (const fn of eventListeners.get(msg.topic) ?? []) fn();
    } else if (msg.type === "toolbar-input") {
      for (const fn of toolbarInputListeners.get(msg.id) ?? []) fn(msg.value);
    } else if (msg.type === "ui.command") {
      // Agent cursor path #2 — automatic; apps don't opt in beyond createAppClient().
      void Promise.resolve()
        .then(() => handleUiCommand(msg.command))
        .then((result) => {
          window.parent.postMessage(
            { appBridge: true, type: "ui.result", id: msg.id, ok: true, result },
            "*",
          );
        })
        .catch((err) => {
          window.parent.postMessage(
            {
              appBridge: true,
              type: "ui.result",
              id: msg.id,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            "*",
          );
        });
    }
  });

  /**
   * Apply forwarded shell design tokens (--os-*) so the app inherits the OS
   * look. Apps style against var(--os-…) and never see shell-internal names.
   */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t.theme;
    for (const [name, value] of Object.entries(t.tokens)) {
      document.documentElement.style.setProperty(name, value);
    }
  }

  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      window.parent.postMessage({ appBridge: true, type: "request", id, method, params }, "*");
    });
  }

  // Announce boot — the host answers with the current theme.
  window.parent.postMessage({ appBridge: true, type: "ready" }, "*");

  return {
    /** Capability intents — the permissioned way to reach OS data services. */
    intents: {
      invoke: (intent, params = {}) => call("intent.invoke", { intent, params }),
    },
    /** The app's private namespaced SQLite (requires the storage:own grant). */
    storage: {
      query: (sql, params) => call("storage.query", { sql, params }),
      execute: (sql, params) => call("storage.execute", { sql, params }),
    },
    /** Shell affordances, checked against grants in the host. */
    shell: {
      notify: (message) => call("shell.notify", { message }),
      /**
       * Open Chat and seed the composer (iframe apps can't reach the shell
       * composer bus directly — this routes through AppHost).
       */
      askAgent: (text = "", submit = false) => call("shell.askAgent", { text, submit }),
      /**
       * Lock this window’s aspect ratio (and optionally reshape it). Only
       * affects the host window for this iframe — apps cannot resize others.
       */
      setWindowGeometry: (params = {}) => call("shell.setWindowGeometry", params),
      /**
       * Mount controls in the AppHost toolbar (search fields, etc.). The host
       * owns the DOM; apps receive edits through toolbar.onInput.
       */
      toolbar: {
        set(slots) {
          window.parent.postMessage({ appBridge: true, type: "toolbar-set", slots }, "*");
        },
        onInput(id, fn) {
          if (!toolbarInputListeners.has(id)) toolbarInputListeners.set(id, new Set());
          toolbarInputListeners.get(id).add(fn);
          return () => toolbarInputListeners.get(id)?.delete(fn);
        },
      },
    },
    /**
     * Platform events. Only topics declared in the manifest's
     * events.subscribes ever arrive; handlers get no payload — re-query
     * through intents instead (grants stay the single permission gate).
     */
    events: {
      on(topic, fn) {
        if (!eventListeners.has(topic)) eventListeners.set(topic, new Set());
        eventListeners.get(topic).add(fn);
        return () => eventListeners.get(topic)?.delete(fn);
      },
    },
    /** Current shell theme + change subscription. */
    theme: {
      get current() {
        return theme;
      },
      onChange(fn) {
        themeListeners.add(fn);
        return () => themeListeners.delete(fn);
      },
    },
  };
}
