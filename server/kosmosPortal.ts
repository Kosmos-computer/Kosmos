/**
 * What the Kosmos iframe is aimed at.
 *
 * One window, one stream. The target is either the engine (a loop of
 * `screenshot` frames, with the agent driving the sim through
 * `portal_control`) or another app installed on this computer, shown in
 * the same iframe. The page polls {@link currentPortal} and follows. The
 * choice lives in memory and resets to the engine when the process restarts.
 */
import type { AppEntry } from "../shared/manifest.js";
import { installedAppStore } from "./platform/installedAppStore.js";

export interface PortalTarget {
  id: string;
  kind: "engine" | "app";
  label: string;
  /** Set for an app page. The engine target uses the protocol socket. */
  url?: string;
}

export interface PortalView {
  target: PortalTarget;
  targets: PortalTarget[];
}

const ENGINE: PortalTarget = { id: "engine", kind: "engine", label: "Engine" };

let activeId = "engine";

/**
 * An installed app the iframe can show. Remote http(s) URLs are left out so
 * the portal cannot be pointed at an arbitrary site. Disabled apps are skipped.
 */
export function targetForApp(
  id: string,
  name: string,
  enabled: boolean,
  entry: AppEntry,
): PortalTarget | null {
  if (!enabled || id === ENGINE.id) return null;
  if (entry.kind === "bundle") {
    return { id, kind: "app", label: name, url: `/apps/${entry.path}/index.html` };
  }
  if (entry.kind === "url" && entry.url.startsWith("/") && !entry.url.startsWith("//")) {
    return { id, kind: "app", label: name, url: entry.url };
  }
  return null;
}

/** Engine first, then each showable app, in the order they were given. */
export function buildPortalTargets(
  apps: { id: string; name: string; enabled: boolean; entry: AppEntry }[],
): PortalTarget[] {
  const targets: PortalTarget[] = [ENGINE];
  for (const app of apps) {
    const target = targetForApp(app.id, app.name, app.enabled, app.entry);
    if (target) targets.push(target);
  }
  return targets;
}

function catalog(): PortalTarget[] {
  return buildPortalTargets(
    installedAppStore.list().map((app) => ({
      id: app.manifest.id,
      name: app.manifest.name,
      enabled: app.enabled,
      entry: app.manifest.entry,
    })),
  );
}

/** The target the iframe should be showing right now. */
export function currentPortal(): PortalView {
  const targets = catalog();
  const target = targets.find((item) => item.id === activeId) ?? ENGINE;
  activeId = target.id;
  return { target, targets };
}

/** Point the iframe at `id`. Unknown ids are refused and the current target stays. */
export function connectPortal(id: string): PortalView | null {
  const targets = catalog();
  const target = targets.find((item) => item.id === id);
  if (!target) return null;
  activeId = target.id;
  return { target, targets };
}
