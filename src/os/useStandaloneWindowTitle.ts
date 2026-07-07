import { useMemo } from "react";
import { parseWindowKey } from "./windowStore";
import { SYSTEM_APPS } from "./systemApps";
import { useOsStore } from "./osStore";

/** Resolve a human title for standalone Electron app windows. */
export function useStandaloneWindowTitle(windowKey: string): string {
  const apps = useOsStore((s) => s.apps);
  const webApps = useOsStore((s) => s.webApps);
  const installedApps = useOsStore((s) => s.installedApps);

  return useMemo(() => {
    const kind = parseWindowKey(windowKey);
    if (!kind) return "Arco OS";

    switch (kind.type) {
      case "system":
        return SYSTEM_APPS.find((app) => app.id === kind.app)?.title ?? kind.app;
      case "generated":
        return apps.find((app) => app.id === kind.appId)?.title ?? "App";
      case "web":
        return webApps.find((app) => app.id === kind.webAppId)?.name ?? "Web App";
      case "installed":
        return (
          installedApps.find((entry) => entry.manifest.id === kind.appId)?.manifest.name ?? "App"
        );
    }
  }, [windowKey, apps, webApps, installedApps]);
}
