import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { parseWindowKey } from "./windowStore";
import { systemAppTitle } from "./systemAppTitles";
import { useOsStore } from "./osStore";

/** Resolve a human title for standalone Electron app windows. */
export function useStandaloneWindowTitle(windowKey: string): string {
  const { i18n } = useTranslation();
  const apps = useOsStore((s) => s.apps);
  const webApps = useOsStore((s) => s.webApps);
  const installedApps = useOsStore((s) => s.installedApps);

  return useMemo(() => {
    const kind = parseWindowKey(windowKey);
    if (!kind) return "Arco OS";

    switch (kind.type) {
      case "system":
        return systemAppTitle(kind.app);
      case "generated":
        return apps.find((app) => app.id === kind.appId)?.title ?? "App";
      case "web":
        return webApps.find((app) => app.id === kind.webAppId)?.name ?? "Web App";
      case "installed":
        return (
          installedApps.find((entry) => entry.manifest.id === kind.appId)?.manifest.name ?? "App"
        );
    }
  }, [windowKey, apps, webApps, installedApps, i18n.language]);
}
