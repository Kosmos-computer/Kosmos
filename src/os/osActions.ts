/**
 * Agent-driven shell actions — the agent-canvas `canvas_ui` pattern: the
 * server tool emits typed events; the client dispatches them onto the shell
 * stores. Chat streams route their AgentEvents through here.
 */
import type { AgentEvent } from "@shared/types";
import { api } from "../lib/api";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";
import { SYSTEM_APPS } from "./systemApps";
import { executeCursorCommand } from "./cursor/uiDriver";
import { publishAppEvent } from "./appEventBus";
import { useStudioStore } from "../apps/studio/studioStore";
import { STUDIO_TITLE } from "../apps/studio/studioMeta";

/** Open any resolved app id — system, generated, or installed. */
function openAppById(appId: string): void {
  const os = useOsStore.getState();
  const wm = useWindowStore.getState();
  const wanted = appId.trim();
  const lower = wanted.toLowerCase();
  const tail = lower.split(".").pop() ?? lower;

  const sys = SYSTEM_APPS.find((a) => a.id === wanted || a.id === tail);
  if (sys) {
    wm.open({ type: "system", app: sys.id }, sys.title);
    return;
  }

  void os.refreshApps().then(() => {
    const state = useOsStore.getState();
    const generated =
      state.apps.find((a) => a.id === wanted) ??
      state.apps.find((a) => a.title.toLowerCase() === lower) ??
      state.apps.find((a) => a.title.toLowerCase().includes(lower));
    if (generated) {
      wm.open({ type: "generated", appId: generated.id }, generated.title);
      return;
    }
    const installed =
      state.installedApps.find((a) => a.manifest.id === wanted) ??
      state.installedApps.find((a) => a.manifest.name.toLowerCase() === lower) ??
      state.installedApps.find((a) => a.manifest.name.toLowerCase().includes(lower));
    if (installed?.enabled) {
      wm.open({ type: "installed", appId: installed.manifest.id }, installed.manifest.name);
    }
  });
}

/** Handle the shell-relevant subset of AgentEvents (chat handles the rest). */
export function handleShellEvent(event: AgentEvent): void {
  const os = useOsStore.getState();
  const wm = useWindowStore.getState();

  // The Studio's workspace drawer mirrors all agent activity (commands, file
  // edits, app builds) no matter which chat surface ran the turn.
  useStudioStore.getState().ingestAgentEvent(event);

  switch (event.type) {
    case "apps_changed":
      void os.refreshApps();
      break;

    case "automations_changed":
      // The Automations app polls; nothing shell-global to do.
      break;

    case "app_event":
      // Platform topic (files.changed, calendar.changed, …) — fan out to
      // open AppHost windows, which forward to subscribing app iframes.
      publishAppEvent({ topic: event.topic });
      break;

    case "cursor_request":
      // The server parked a tool mid-turn waiting for this. Execute the
      // cursor command (animation included) and answer; the driver never
      // throws, so a reply is guaranteed before the server-side timeout.
      void executeCursorCommand(event.command).then((result) =>
        api.answerClientRequest(event.requestId, result),
      );
      break;

    case "os_ui": {
      const action = event.action;
      if (action.action === "open_app") {
        openAppById(action.appId);
      } else if (action.action === "open_system") {
        // Look up lazily: resolving SYSTEM_APPS at module scope creates a
        // circular-import TDZ crash (systemApps → app components → osActions).
        const def = SYSTEM_APPS.find((a) => a.id === action.app);
        if (def) {
          wm.open({ type: "system", app: def.id }, def.title);
        } else {
          // Older callers may still send open_system for installed apps like
          // "docs" — treat the id as an open_app target instead of no-op'ing.
          openAppById(action.app);
        }
      } else if (action.action === "close_app") {
        // The agent addresses apps by id, not window key — try every kind.
        // wm.close on a key with no open window is a no-op.
        const keys = [
          `system:${action.appId}`,
          `generated:${action.appId}`,
          `installed:${action.appId}`,
          `web:${action.appId}`,
        ];
        // Models sometimes qualify system ids ("core.settings") — fall back
        // to the last dot-segment when it names a system app.
        const tail = action.appId.split(".").pop();
        if (tail && tail !== action.appId && SYSTEM_APPS.some((a) => a.id === tail)) {
          keys.push(`system:${tail}`);
        }
        for (const key of keys) wm.close(key);
      } else if (action.action === "notify") {
        os.notify(action.message);
      } else if (action.action === "open_workspace_tab") {
        // Tab/path state was already set by the studio store's ingest above;
        // here we just make sure the Studio window is visible.
        wm.open({ type: "system", app: "studio" }, STUDIO_TITLE);
      }
      break;
    }

    default:
      break;
  }
}
