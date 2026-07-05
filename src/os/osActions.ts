/**
 * Agent-driven shell actions — the agent-canvas `canvas_ui` pattern: the
 * server tool emits typed events; the client dispatches them onto the shell
 * stores. Chat streams route their AgentEvents through here.
 */
import type { AgentEvent } from "@shared/types";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";
import { SYSTEM_APPS } from "./systemApps";
import { useStudioStore } from "../apps/studio/studioStore";
import { STUDIO_TITLE } from "../apps/studio/studioMeta";

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

    case "os_ui": {
      const action = event.action;
      if (action.action === "open_app") {
        // The app may have been created milliseconds ago — refresh, then open
        // with the fresh title.
        void os.refreshApps().then(() => {
          const app = useOsStore.getState().apps.find((a) => a.id === action.appId);
          wm.open({ type: "app", appId: action.appId }, app?.title ?? "App");
        });
      } else if (action.action === "open_system") {
        // Look up lazily: resolving SYSTEM_APPS at module scope creates a
        // circular-import TDZ crash (systemApps → app components → osActions).
        const def = SYSTEM_APPS.find((a) => a.id === action.app);
        if (def) {
          wm.open({ type: "system", app: def.id }, def.title);
        }
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
