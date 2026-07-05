/**
 * The dock — system apps section, then generated apps (matrix-os dock
 * sections). Running windows get an indicator dot; clicking toggles
 * open/focus. Generated apps refresh whenever the agent creates one.
 */
import { Globe, Sparkles } from "lucide-react";
import { useOsStore } from "./osStore";
import { useWindowStore, windowKey } from "./windowStore";
import { SYSTEM_APPS } from "./systemApps";

export function Dock() {
  const apps = useOsStore((s) => s.apps);
  const webApps = useOsStore((s) => s.webApps);
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

      {apps.length > 0 && <span className="arco-dock__separator" aria-hidden="true" />}

      {apps.map((app) => {
        const key = windowKey({ type: "app", appId: app.id });
        return (
          <button
            key={app.id}
            className="arco-dock__item arco-dock__item--generated"
            onClick={() =>
              isOpen(key) ? focus(key) : open({ type: "app", appId: app.id }, app.title)
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
