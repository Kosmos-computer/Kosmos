import type { OsWindow } from "./windowStore";
import { useOsStore } from "./osStore";
import { systemAppTitle } from "./systemAppTitles";

/** Resolve a window title for display — system apps track the active locale. */
export function resolveWindowTitle(win: OsWindow): string {
  if (win.kind.type === "system") {
    return systemAppTitle(win.kind.app);
  }

  // Document launches and similar set a custom title (file name, etc.) — keep it.
  // Only rewrite when the stored title is still the raw id from route sync.
  if (win.kind.type === "installed" && win.title === win.kind.appId) {
    return (
      useOsStore
        .getState()
        .installedApps.find((entry) => entry.manifest.id === win.kind.appId)?.manifest.name ??
      win.title
    );
  }
  if (win.kind.type === "generated" && win.title === win.kind.appId) {
    return useOsStore.getState().apps.find((app) => app.id === win.kind.appId)?.title ?? win.title;
  }
  if (win.kind.type === "web" && win.title === win.kind.webAppId) {
    return (
      useOsStore.getState().webApps.find((app) => app.id === win.kind.webAppId)?.name ?? win.title
    );
  }

  return win.title;
}
