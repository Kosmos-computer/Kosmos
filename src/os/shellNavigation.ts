/**
 * Imperative shell navigation — opens/focuses windows and keeps the URL in sync.
 * Router code registers navigate() via registerShellNavigate; callers outside
 * React (osActions, settingsStore) use the helpers here.
 */
import type { NavigateFunction } from "react-router-dom";
import {
  shellPathFromTarget,
  type ShellRouteTarget,
} from "@shared/shellRoutes";
import type { SettingsSectionId } from "../apps/settings/settingsSections";
import { systemAppTitle } from "./systemAppTitles";
import { useWindowStore, windowKey, type SystemAppId, type WindowKind } from "./windowStore";

let navigateFn: NavigateFunction | null = null;

type SettingsSectionBridge = {
  getSection: () => SettingsSectionId;
  setSection: (section: SettingsSectionId) => void;
};

let settingsSectionBridge: SettingsSectionBridge | null = null;

export function registerSettingsSectionBridge(bridge: SettingsSectionBridge): void {
  settingsSectionBridge = bridge;
}

function readSettingsSection(): SettingsSectionId | undefined {
  return settingsSectionBridge?.getSection();
}

function writeSettingsSection(section: SettingsSectionId): void {
  settingsSectionBridge?.setSection(section);
}

export function registerShellNavigate(navigate: NavigateFunction): void {
  navigateFn = navigate;
}

function navigateToPath(path: string, replace = false): void {
  if (navigateFn) {
    navigateFn(path, { replace });
    return;
  }
  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", path);
}

export function windowKindToTarget(kind: WindowKind, section?: string): ShellRouteTarget {
  switch (kind.type) {
    case "system":
      return { type: "system", appId: kind.app, section };
    case "generated":
      return { type: "generated", appId: kind.appId };
    case "installed":
      return { type: "installed", appId: kind.appId };
    case "web":
      return { type: "web", webAppId: kind.webAppId };
  }
}

export function shellTargetToWindowKind(target: ShellRouteTarget): WindowKind {
  switch (target.type) {
    case "system":
      return { type: "system", app: target.appId as SystemAppId };
    case "generated":
      return { type: "generated", appId: target.appId };
    case "installed":
      return { type: "installed", appId: target.appId };
    case "web":
      return { type: "web", webAppId: target.webAppId };
  }
}

export function resolveTitleForKind(kind: WindowKind, title?: string): string {
  if (title) return title;
  if (kind.type === "system") return systemAppTitle(kind.app);
  if (kind.type === "generated") return kind.appId;
  if (kind.type === "installed") return kind.appId;
  return kind.webAppId;
}

export function syncUrlToWindowKind(kind: WindowKind, section?: string, replace = true): void {
  const path = shellPathFromTarget(windowKindToTarget(kind, section));
  if (window.location.pathname === path) return;
  navigateToPath(path, replace);
}

export function openShellWindow(
  kind: WindowKind,
  title: string,
  options?: { section?: SettingsSectionId; replace?: boolean },
): void {
  const resolvedTitle = resolveTitleForKind(kind, title);
  useWindowStore.getState().open(kind, resolvedTitle);

  if (options?.section && kind.type === "system" && kind.app === "settings") {
    writeSettingsSection(options.section);
  }

  const section =
    options?.section ??
    (kind.type === "system" && kind.app === "settings" ? readSettingsSection() : undefined);

  syncUrlToWindowKind(kind, section, options?.replace ?? false);
}

export function focusShellWindow(windowId: string): void {
  const state = useWindowStore.getState();
  state.focus(windowId);
  const win = state.windows.find((w) => w.id === windowId);
  if (!win) return;

  const section =
    win.kind.type === "system" && win.kind.app === "settings" ? readSettingsSection() : undefined;
  syncUrlToWindowKind(win.kind, section);
}

export function navigateSettingsSection(section: SettingsSectionId): void {
  writeSettingsSection(section);
  syncUrlToWindowKind({ type: "system", app: "settings" }, section, false);
}

/** Open or focus a window keyed the same way as NavRail/Dock entries. */
export function activateShellWindow(kind: WindowKind, title: string, isOpen: boolean): void {
  const id = windowKey(kind);
  if (isOpen) {
    focusShellWindow(id);
  } else {
    openShellWindow(kind, title);
  }
}
