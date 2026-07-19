/**
 * Agent-driven shell actions — the agent-canvas `canvas_ui` pattern: the
 * server tool emits typed events; the client dispatches them onto the shell
 * stores. Chat streams route their AgentEvents through here.
 *
 * When `os_ui` carries a `requestId`, we settle the DOM and POST an OsUiResult
 * so the agent never races a follow-up ui_snapshot against a still-mounting window.
 */
import type { AgentEvent, AppControlMode, OsUiAction, OsUiResult, OsUiWindowSummary } from "@shared/types";
import {
  controlForGeneratedApp,
  controlForInstalledManifest,
  controlForSystemApp,
  controlForWebApp,
} from "@shared/agentAppCatalog";
import { resolveSystemAppId } from "@shared/systemApps";
import { api } from "../lib/api";
import { useOsStore } from "./osStore";
import { useWindowStore, windowKey, type WindowKind } from "./windowStore";
import { SYSTEM_APPS } from "./systemApps";
import { executeCursorCommand } from "./cursor/uiDriver";
import { publishAppEvent } from "./appEventBus";
import { focusShellWindow, openShellWindow } from "./shellNavigation";
import { useStudioStore } from "../apps/studio/studioStore";
import { executeBrowserCommand } from "../apps/studio/browser/browserAutomation";
import { executeComputerCommand } from "./computerUse";
import { systemAppTitle } from "./systemAppTitles";
import { installedLaunchKey, systemLaunchKey, useDocumentLaunchStore } from "./documentLaunchStore";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Queue a Drive file so the target editor opens it on mount / reload. */
function requestDocumentLaunch(_appId: string, fileId: string | undefined, kind: WindowKind) {
  if (!fileId) return;
  const launch = useDocumentLaunchStore.getState();
  if (kind.type === "installed") {
    launch.requestOpen(installedLaunchKey(kind.appId), fileId);
    return;
  }
  if (kind.type === "system") {
    launch.requestOpen(systemLaunchKey(kind.app), fileId);
  }
}

/** Wait for paint + AppHost/iframe mount before answering the agent. */
async function settleUi(ms = 220): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  await sleep(ms);
}

function controlMetaForKind(kind: WindowKind): { control: AppControlMode; toolHint?: string } {
  const os = useOsStore.getState();
  switch (kind.type) {
    case "system":
      return controlForSystemApp(kind.app);
    case "generated":
      return controlForGeneratedApp();
    case "web":
      return controlForWebApp();
    case "installed": {
      const installed = os.installedApps.find((a) => a.manifest.id === kind.appId);
      if (installed) return controlForInstalledManifest(installed.manifest);
      return { control: "open_only" };
    }
  }
}

function windowSummaries(): OsUiWindowSummary[] {
  const wm = useWindowStore.getState();
  const focusedId = wm.focusedId();
  return wm.windows.map((w) => ({
    id: w.id,
    title: w.title,
    focused: w.id === focusedId,
    minimized: w.minimized,
  }));
}

function findWindowKeysForAppId(appId: string): string[] {
  const keys = [
    `system:${appId}`,
    `generated:${appId}`,
    `installed:${appId}`,
    `web:${appId}`,
  ];
  const systemId = resolveSystemAppId(appId);
  if (systemId && systemId !== appId) keys.push(`system:${systemId}`);
  return keys;
}

function findOpenWindow(appId: string) {
  const wm = useWindowStore.getState();
  for (const key of findWindowKeysForAppId(appId)) {
    const exact = wm.windows.find((w) => w.id === key);
    if (exact) return exact;
    // Multi-instance apps (Drive) use `system:files:<instanceId>`.
    const instance = [...wm.windows]
      .filter((w) => w.id.startsWith(`${key}:`))
      .sort((a, b) => b.z - a.z)[0];
    if (instance) return instance;
  }
  return undefined;
}

/** Open any resolved app id — system, generated, installed, or web. */
async function openAppById(
  appId: string,
  fileId?: string,
): Promise<{ kind: WindowKind; title: string } | { error: string }> {
  const os = useOsStore.getState();
  const wanted = appId.trim();
  const lower = wanted.toLowerCase();

  const systemId = resolveSystemAppId(wanted);
  const sys = systemId ? SYSTEM_APPS.find((a) => a.id === systemId) : undefined;
  if (sys) {
    const kind: WindowKind = { type: "system", app: sys.id };
    const title = systemAppTitle(sys.id);
    requestDocumentLaunch(sys.id, fileId, kind);
    openShellWindow(kind, title);
    return { kind, title };
  }

  await os.refreshApps();
  const state = useOsStore.getState();

  const generated =
    state.apps.find((a) => a.id === wanted) ??
    state.apps.find((a) => a.title.toLowerCase() === lower) ??
    state.apps.find((a) => a.title.toLowerCase().includes(lower));
  if (generated) {
    const kind: WindowKind = { type: "generated", appId: generated.id };
    openShellWindow(kind, generated.title);
    return { kind, title: generated.title };
  }

  const installed =
    state.installedApps.find((a) => a.manifest.id === wanted) ??
    state.installedApps.find((a) => a.manifest.name.toLowerCase() === lower) ??
    state.installedApps.find((a) => a.manifest.name.toLowerCase().includes(lower));
  if (installed?.enabled) {
    const kind: WindowKind = { type: "installed", appId: installed.manifest.id };
    requestDocumentLaunch(installed.manifest.id, fileId, kind);
    openShellWindow(kind, installed.manifest.name);
    return { kind, title: installed.manifest.name };
  }

  const web =
    state.webApps.find((a) => a.id === wanted) ??
    state.webApps.find((a) => a.name.toLowerCase() === lower) ??
    state.webApps.find((a) => a.name.toLowerCase().includes(lower));
  if (web) {
    const kind: WindowKind = { type: "web", webAppId: web.id };
    openShellWindow(kind, web.name);
    return { kind, title: web.name };
  }

  return { error: `No app matches "${appId}".` };
}

function resultForWindow(
  win: { id: string; title: string; minimized: boolean } | undefined,
  meta: { control: AppControlMode; toolHint?: string },
  note?: string,
): OsUiResult {
  const focusedId = useWindowStore.getState().focusedId();
  return {
    ok: true,
    windowId: win?.id,
    title: win?.title,
    focused: win ? win.id === focusedId : undefined,
    minimized: win?.minimized,
    control: meta.control,
    toolHint: meta.toolHint,
    note,
    windows: windowSummaries(),
  };
}

async function executeOsUiAction(action: OsUiAction): Promise<OsUiResult> {
  const os = useOsStore.getState();
  const wm = useWindowStore.getState();

  switch (action.action) {
    case "open_app": {
      const opened = await openAppById(action.appId, action.fileId);
      if ("error" in opened) return { ok: false, error: opened.error, windows: windowSummaries() };
      // If the window was already open, re-queue + focus so AppHost can pick up fileId.
      if (action.fileId) {
        requestDocumentLaunch(action.appId, action.fileId, opened.kind);
        openShellWindow(opened.kind, opened.title);
      }
      await settleUi(opened.kind.type === "installed" || opened.kind.type === "web" ? 320 : 220);
      const win = useWindowStore.getState().windows.find((w) => w.id === windowKey(opened.kind));
      const meta = controlMetaForKind(opened.kind);
      let note: string | undefined;
      if (action.fileId) {
        note = `Opened "${opened.title}" with file ${action.fileId}.`;
      } else if (meta.control === "tools") {
        note = `Opened "${opened.title}". Prefer domain tools${meta.toolHint ? ` (${meta.toolHint})` : ""} over the cursor.`;
      } else if (meta.control === "open_only") {
        note = `Opened "${opened.title}" but its content is opaque to the cursor (iframe/web). Do not retry mouse_click.`;
      }
      return resultForWindow(win, meta, note);
    }

    case "open_system": {
      const def = SYSTEM_APPS.find((a) => a.id === action.app);
      if (def) {
        const kind: WindowKind = { type: "system", app: def.id };
        const title = systemAppTitle(def.id);
        if (action.fileId) requestDocumentLaunch(def.id, action.fileId, kind);
        openShellWindow(kind, title);
        await settleUi();
        const win = useWindowStore.getState().windows.find((w) => w.id === windowKey(kind));
        const meta = controlMetaForKind(kind);
        return resultForWindow(
          win,
          meta,
          action.fileId ? `Opened "${title}" with file ${action.fileId}.` : undefined,
        );
      }
      return executeOsUiAction({ action: "open_app", appId: action.app, fileId: action.fileId });
    }

    case "close_app": {
      for (const key of findWindowKeysForAppId(action.appId)) wm.close(key);
      await settleUi(80);
      return { ok: true, windows: windowSummaries() };
    }

    case "focus_app":
    case "restore_app": {
      const win = findOpenWindow(action.appId);
      if (!win) {
        return {
          ok: false,
          error: `No open window for "${action.appId}". Use open_app first.`,
          windows: windowSummaries(),
        };
      }
      focusShellWindow(win.id);
      await settleUi(120);
      const after = useWindowStore.getState().windows.find((w) => w.id === win.id);
      return resultForWindow(after, controlMetaForKind(win.kind));
    }

    case "minimize_app": {
      const win = findOpenWindow(action.appId);
      if (!win) {
        return {
          ok: false,
          error: `No open window for "${action.appId}".`,
          windows: windowSummaries(),
        };
      }
      if (!win.minimized) wm.toggleMinimize(win.id);
      await settleUi(80);
      const after = useWindowStore.getState().windows.find((w) => w.id === win.id);
      return resultForWindow(after, controlMetaForKind(win.kind));
    }

    case "notify": {
      os.notify(action.message);
      return { ok: true, windows: windowSummaries() };
    }

    case "open_workspace_tab": {
      const kind: WindowKind = { type: "system", app: "studio" };
      openShellWindow(kind, systemAppTitle("studio"));
      await settleUi();
      const win = useWindowStore.getState().windows.find((w) => w.id === windowKey(kind));
      return resultForWindow(win, controlForSystemApp("studio"));
    }
  }
}

/** Handle the shell-relevant subset of AgentEvents (chat handles the rest). */
export function handleShellEvent(event: AgentEvent, sessionKey?: string | null): void {
  const os = useOsStore.getState();

  useStudioStore.getState().ingestAgentEvent(event, sessionKey);

  // Mark unread when an agent turn ends / needs confirm while another session is active.
  if (
    sessionKey &&
    (event.type === "done" || event.type === "error" || event.type === "confirm_required")
  ) {
    const active = useStudioStore.getState().activeSessionKey;
    if (active && active !== sessionKey) {
      void import("../apps/studio/unreadSessionsStore").then(({ useUnreadSessionsStore }) => {
        useUnreadSessionsStore.getState().markUnread(sessionKey);
      });
      os.notify("Agent needs attention");
    }
  }

  switch (event.type) {
    case "apps_changed":
      void os.refreshApps();
      break;

    case "automations_changed":
      break;

    case "automation_run_finished": {
      const statusLabel = event.status === "ok" ? "completed" : "failed";
      os.notify(`Automation "${event.automationName}" ${statusLabel}`);
      break;
    }

    case "app_event":
      publishAppEvent({ topic: event.topic });
      break;

    case "cursor_request":
      void executeCursorCommand(event.command).then((result) =>
        api.answerClientRequest(event.requestId, result),
      );
      break;

    case "browser_request":
      void executeBrowserCommand(event.command).then((result) =>
        api.answerClientRequest(event.requestId, result),
      );
      break;

    case "computer_request":
      void executeComputerCommand(event.command).then((result) =>
        api.answerClientRequest(event.requestId, result),
      );
      break;

    case "os_ui": {
      const requestId = event.requestId;
      if (requestId) {
        void executeOsUiAction(event.action).then((result) =>
          api.answerClientRequest(requestId, result),
        );
      } else {
        // Legacy / fire-and-forget emitters (e.g. app_create) — still run the action.
        void executeOsUiAction(event.action);
      }
      break;
    }

    default:
      break;
  }
}
