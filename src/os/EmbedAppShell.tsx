import { I18nKey } from "../i18n/declaration";
import { T } from "../i18n/T";
/**
 * Full-viewport app host for Kosmos embed mode (?embed=1&app=…).
 */
import { isEmbedLaunch, parseLaunchAppParam } from "@shared/launchApp";
import { resolveSystemAppId } from "@shared/systemApps";
import { MusicShell } from "../apps/music/MusicShell";
import { PodcastShell } from "../apps/podcast/PodcastShell";
import { VideoShell } from "../apps/video/VideoShell";
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
        <p><T k={I18nKey.OS_EMBEDAPPSHELL_MISSING_OR_UNKNOWN_EMBED_APP_USE_EMBED_1_AMP_APP_CHAT} /></p>
      </div>
    );
  }

  return (
    <div className="arco-embed-app">
      <WindowContent kind={launch.kind} />
      {/* Shell-level media engines — same as Desktop/MobileShell so embed playback works. */}
      <MusicShell />
      <VideoShell />
      <PodcastShell />
    </div>
  );
}
