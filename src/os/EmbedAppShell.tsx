/**
 * Full-viewport app host for Kosmos embed mode (?embed=1&app=…).
 */
import { isEmbedLaunch, parseLaunchAppParam } from "@shared/launchApp";
import { resolveSystemAppId } from "@shared/systemApps";
import { systemApp } from "./systemApps";
import { WindowContent } from "./windowContent";
import type { SystemAppId, WindowKind } from "./windowStore";

function resolveEmbedKind(appId: string): WindowKind | null {
  const systemId = resolveSystemAppId(appId) ?? appId;
  try {
    systemApp(systemId as SystemAppId);
    return { type: "system", app: systemId as SystemAppId };
  } catch {
    // Not a built-in React app — try installed/platform manifest apps.
  }
  if (appId.startsWith("core.") || appId.includes(".")) {
    return { type: "installed", appId };
  }
  return null;
}

export function readEmbedLaunch(): { appId: string; kind: WindowKind } | null {
  const search = window.location.search;
  if (!isEmbedLaunch(search)) return null;
  const appId = parseLaunchAppParam(search);
  if (!appId) return null;
  const kind = resolveEmbedKind(appId);
  if (!kind) return null;
  return { appId, kind };
}

export function EmbedAppShell() {
  const launch = readEmbedLaunch();
  if (!launch) {
    return (
      <div className="arco-embed-app arco-embed-app--error">
        <p>Missing or unknown embed app. Use ?embed=1&amp;app=chat</p>
      </div>
    );
  }

  return (
    <div className="arco-embed-app">
      <WindowContent kind={launch.kind} />
    </div>
  );
}
