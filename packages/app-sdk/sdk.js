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
 */

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
