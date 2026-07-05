/**
 * The dock — system apps, installed apps, generated apps, web apps
 * (matrix-os dock sections). Running windows get an indicator dot; clicking
 * toggles open/focus. Sections refresh whenever the agent creates an app.
 */
import { Globe, Sparkles } from "lucide-react";
import { useOsStore } from "./osStore";
import { useWindowStore, windowKey } from "./windowStore";
import { SYSTEM_APPS } from "./systemApps";
import { appIcon } from "../apps/appview/appIcon";

export function Dock() {
  const apps = useOsStore((s) => s.apps);
  const webApps = useOsStore((s) => s.webApps);
  const installedApps = useOsStore((s) => s.installedApps.filter((e) => e.enabled));
  const windows = useWindowStore((s) => s.windows);
  const open = useWindowStore((s) => s.open);
  const focus = useWindowStore((s) => s.focus);

  const isOpen = (key: string) => windows.some((w) => w.id === key);

  return (
    <nav className="arco-dock" aria-label="Dock">
      {SYSTEM_APPS.map((def) => {
        const key = windowKey({ type: "system", app: def.id });
        const Icon = def.icon;
        return (
          <button
            key={def.id}
            className="arco-dock__item"
            onClick={() => (isOpen(key) ? focus(key) : open({ type: "system", app: def.id }, def.title))}
            aria-label={def.title}
          >
            <Icon size={22} strokeWidth={1.8} />
            {isOpen(key) && <span className="arco-dock__indicator" />}
            <span className="arco-dock__tooltip">{def.title}</span>
          </button>
        );
      })}

      {installedApps.length > 0 && <span className="arco-dock__separator" aria-hidden="true" />}

      {installedApps.map((entry) => {
        const key = windowKey({ type: "installed", appId: entry.manifest.id });
        const Icon = appIcon(entry.manifest.icon);
        return (
          <button
            key={entry.manifest.id}
            className="arco-dock__item"
            onClick={() =>
              isOpen(key)
                ? focus(key)
                : open({ type: "installed", appId: entry.manifest.id }, entry.manifest.name)
            }
            aria-label={entry.manifest.name}
          >
            <Icon size={22} strokeWidth={1.8} />
            {isOpen(key) && <span className="arco-dock__indicator" />}
            <span className="arco-dock__tooltip">{entry.manifest.name}</span>
          </button>
        );
      })}

      {apps.length > 0 && <span className="arco-dock__separator" aria-hidden="true" />}

      {apps.map((app) => {
        const key = windowKey({ type: "generated", appId: app.id });
        return (
          <button
            key={app.id}
            className="arco-dock__item arco-dock__item--generated"
            onClick={() =>
              isOpen(key) ? focus(key) : open({ type: "generated", appId: app.id }, app.title)
            }
            aria-label={app.title}
          >
            <Sparkles size={22} strokeWidth={1.8} />
            {isOpen(key) && <span className="arco-dock__indicator" />}
            <span className="arco-dock__tooltip">{app.title}</span>
          </button>
        );
      })}

      {webApps.length > 0 && <span className="arco-dock__separator" aria-hidden="true" />}

      {webApps.map((app) => {
        const key = windowKey({ type: "web", webAppId: app.id });
        return (
          <button
            key={app.id}
            className="arco-dock__item arco-dock__item--generated"
            onClick={() =>
              isOpen(key) ? focus(key) : open({ type: "web", webAppId: app.id }, app.name)
            }
            aria-label={app.name}
          >
            <Globe size={22} strokeWidth={1.8} />
            {isOpen(key) && <span className="arco-dock__indicator" />}
            <span className="arco-dock__tooltip">{app.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
