/**
 * Menubar tray for agent-adjacent tool health: desktop channel (cursor
 * interactivity), voice, Cursor agent API, MCP, channels, automations.
 */
import { useRef, useState } from "react";
import { Activity } from "lucide-react";
import { useDismiss } from "../components/useDismiss";
import { toolToneDotClass, useToolsStatus } from "./useToolsStatus";

export function MenuBarToolsStatus() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { rows, overall } = useToolsStatus(open);

  useDismiss(open, () => setOpen(false), rootRef);

  const triggerLabel =
    overall === "online"
      ? "Tools online"
      : overall === "offline"
        ? "Some tools offline"
        : overall === "checking"
          ? "Checking tools…"
          : "Tools status";

  return (
    <div className="arco-menu arco-menubar__tools" ref={rootRef}>
      <button
        type="button"
        className="arco-menubar__icon-btn arco-menubar__server-btn"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        title={triggerLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <Activity size={14} />
        <span className={toolToneDotClass(overall)} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Tool status"
          className="arco-menu__panel arco-menu__panel--bottom arco-menu__panel--end arco-menubar-tools__panel"
        >
          <p className="arco-menubar-tools__heading">Agent tools</p>
          <ul className="arco-menubar-tools__list">
            {rows.map((row) => (
              <li key={row.id} className="arco-menubar-tools__row">
                <span
                  className={toolToneDotClass(row.tone)}
                  aria-hidden="true"
                  title={row.status}
                />
                <div className="arco-menubar-tools__meta">
                  <span className="arco-menubar-tools__name">{row.name}</span>
                  <span className="arco-menubar-tools__detail">{row.detail}</span>
                  <span className="arco-menubar-tools__status">{row.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
