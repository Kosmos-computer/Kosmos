/**
 * Left nav rail — ported from the UI Experiments NavRail: a far-left column
 * for switching between apps. Collapsed it is a 56px icon strip with hover
 * tooltips; expanded it shows icon + label rows. The expand toggle hides
 * behind the brand mark on hover (collapsed) or sits beside it (expanded).
 *
 * Sections mirror the dock: system apps, then generated apps, then web apps.
 * Clicking opens the app or focuses its window; the focused window's item
 * gets an accent indicator.
 */
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOsStore } from "./osStore";
import { useWindowStore, windowKey, type WindowKind } from "./windowStore";
import { SYSTEM_APPS } from "./systemApps";
import { appIcon } from "../apps/appview/appIcon";

interface RailEntry {
  key: string;
  title: string;
  icon: LucideIcon;
  kind: WindowKind;
  generated: boolean;
}

/**
 * One nav row. Collapsed mode renders a square icon button with a CSS
 * tooltip (same pattern as the dock); expanded mode renders a full-width
 * icon + label row. `active` marks the currently focused window.
 */
function NavItem({
  entry,
  active,
  open,
  expanded,
  onSelect,
}: {
  entry: RailEntry;
  active: boolean;
  open: boolean;
  expanded: boolean;
  onSelect: () => void;
}) {
  const Icon = entry.icon;
  return (
    <button
      className={[
        "arco-navrail__item",
        active && "arco-navrail__item--active",
        entry.generated && "arco-navrail__item--generated",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onSelect}
      aria-label={entry.title}
      aria-current={active ? "true" : undefined}
    >
      <span className="arco-navrail__item-icon">
        <Icon size={18} strokeWidth={1.8} />
        {open && !expanded && <span className="arco-navrail__indicator" />}
      </span>
      {expanded ? (
        <>
          <span className="arco-navrail__item-label">{entry.title}</span>
          {open && <span className="arco-navrail__indicator arco-navrail__indicator--inline" />}
        </>
      ) : (
        <span className="arco-navrail__tooltip">{entry.title}</span>
      )}
    </button>
  );
}

export function NavRail() {
  const apps = useOsStore((s) => s.apps);
  const webApps = useOsStore((s) => s.webApps);
  const installedApps = useOsStore((s) => s.installedApps.filter((e) => e.enabled));
  const expanded = useOsStore((s) => s.navExpanded);
  const setExpanded = useOsStore((s) => s.setNavExpanded);
  const windows = useWindowStore((s) => s.windows);
  const open = useWindowStore((s) => s.open);
  const focus = useWindowStore((s) => s.focus);

  // The focused (topmost visible) window drives the active highlight, so the
  // rail always reflects what the user is actually looking at.
  const focusedId = [...windows.filter((w) => !w.minimized)].sort((a, b) => b.z - a.z)[0]?.id;
  const isOpen = (key: string) => windows.some((w) => w.id === key);

  const sections: RailEntry[][] = [
    SYSTEM_APPS.map((def) => ({
      key: windowKey({ type: "system", app: def.id }),
      title: def.title,
      icon: def.icon,
      kind: { type: "system", app: def.id } as WindowKind,
      generated: false,
    })),
    installedApps.map((entry) => ({
      key: windowKey({ type: "installed", appId: entry.manifest.id }),
      title: entry.manifest.name,
      icon: appIcon(entry.manifest.icon),
      kind: { type: "installed", appId: entry.manifest.id } as WindowKind,
      generated: false,
    })),
    apps.map((app) => ({
      key: windowKey({ type: "generated", appId: app.id }),
      title: app.title,
      icon: appIcon(app.icon),
      kind: { type: "generated", appId: app.id } as WindowKind,
      generated: true,
    })),
    webApps.map((app) => ({
      key: windowKey({ type: "web", webAppId: app.id }),
      title: app.name,
      icon: Globe,
      kind: { type: "web", webAppId: app.id } as WindowKind,
      generated: true,
    })),
  ].filter((section) => section.length > 0);

  return (
    <nav className={`arco-navrail ${expanded ? "arco-navrail--expanded" : ""}`} aria-label="Apps">
      <div className="arco-navrail__brand-row">
        <span className="arco-navrail__brand" aria-hidden="true">
          A
        </span>
        <button
          className="arco-navrail__toggle"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-pressed={expanded}
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <div className="arco-navrail__items">
        {sections.map((section, i) => (
          <div key={i} className="arco-navrail__section">
            {i > 0 && <span className="arco-navrail__separator" aria-hidden="true" />}
            {section.map((entry) => (
              <NavItem
                key={entry.key}
                entry={entry}
                active={focusedId === entry.key}
                open={isOpen(entry.key)}
                expanded={expanded}
                onSelect={() => (isOpen(entry.key) ? focus(entry.key) : open(entry.kind, entry.title))}
              />
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
