/**
 * Unified, flat list of every launchable app across the shell — system,
 * installed, generated, and web — keyed by the same stable id windows use
 * (windowKey). NavRail and Dock each project this list through their own
 * pinned-id order (see pinnedApps.ts) instead of hardcoding sections.
 */
import { useMemo } from "react";
import { Globe, type LucideIcon } from "lucide-react";
import { useOsStore } from "./osStore";
import { windowKey, type WindowKind } from "./windowStore";
import { SYSTEM_APPS } from "./systemApps";
import { appIcon } from "../apps/appview/appIcon";

export interface ShellAppEntry {
  id: string;
  title: string;
  icon: LucideIcon;
  kind: WindowKind;
  generated: boolean;
}

export function useShellApps(): ShellAppEntry[] {
  const apps = useOsStore((s) => s.apps);
  const webApps = useOsStore((s) => s.webApps);
  // Select the raw (store-stable) array and filter inside the memo below —
  // filtering inline in the selector would return a new array every render,
  // which would defeat the memo and re-trigger effects that key off it.
  const installedAppsRaw = useOsStore((s) => s.installedApps);

  return useMemo(() => {
    const entries: ShellAppEntry[] = [];
    const installedApps = installedAppsRaw.filter((e) => e.enabled);

    for (const def of SYSTEM_APPS) {
      const kind: WindowKind = { type: "system", app: def.id };
      entries.push({ id: windowKey(kind), title: def.title, icon: def.icon, kind, generated: false });
    }
    for (const entry of installedApps) {
      const kind: WindowKind = { type: "installed", appId: entry.manifest.id };
      entries.push({
        id: windowKey(kind),
        title: entry.manifest.name,
        icon: appIcon(entry.manifest.icon),
        kind,
        generated: false,
      });
    }
    for (const app of apps) {
      const kind: WindowKind = { type: "generated", appId: app.id };
      entries.push({ id: windowKey(kind), title: app.title, icon: appIcon(app.icon), kind, generated: true });
    }
    for (const app of webApps) {
      const kind: WindowKind = { type: "web", webAppId: app.id };
      entries.push({ id: windowKey(kind), title: app.name, icon: Globe, kind, generated: true });
    }

    return entries;
  }, [apps, webApps, installedAppsRaw]);
}
