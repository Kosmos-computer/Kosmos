/** Top chrome: settings menu, focused window title, shell view toggle, bento drawer, clock, theme toggle, lock. */
import { useEffect, useMemo, useState } from "react";
import { AppWindow, LayoutGrid, Lock, Monitor, Moon, Settings, Sun } from "lucide-react";
import { Menu, type MenuItem } from "../components/Menu";
import { openSettingsApp } from "../apps/settings/settingsStore";
import { visibleSettingsNavGroups } from "../apps/settings/settingsSections";
import { useCan, useAuthStore } from "./auth/authStore";
import { useBentoStore } from "./bento/bentoStore";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MenuBar() {
  const { theme, setTheme, shellView, setShellView } = useOsStore();
  const bentoOpen = useBentoStore((s) => s.open);
  const toggleBento = useBentoStore((s) => s.toggleOpen);
  const user = useAuthStore((s) => s.user);
  const lock = useAuthStore((s) => s.lock);
  const canManageUsers = useCan("users:manage");
  const canWriteSettings = useCan("settings:write");
  const windows = useWindowStore((s) => s.windows);
  const clock = useClock();

  const settingsMenuItems = useMemo<MenuItem[]>(() => {
    const groups = visibleSettingsNavGroups({ canWriteSettings, canManageUsers });
    return groups.flatMap((group, groupIndex) =>
      group.items.map((item, itemIndex) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        separatorAbove: groupIndex > 0 && itemIndex === 0,
        onSelect: () => openSettingsApp(item.id),
      })),
    );
  }, [canWriteSettings, canManageUsers]);

  const focused = windows
    .filter((w) => !w.minimized)
    .sort((a, b) => b.z - a.z)[0];

  return (
    <header className="arco-menubar">
      <Menu
        trigger={
          <button
            type="button"
            className="arco-menubar__icon-btn"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        }
        items={settingsMenuItems}
        aria-label="Settings"
      />
      <span className="arco-menubar__title">{focused?.title ?? ""}</span>
      <div className="arco-menubar__right">
        <button
          type="button"
          className={`arco-menubar__icon-btn${bentoOpen ? " arco-menubar__icon-btn--active" : ""}`}
          onClick={toggleBento}
          aria-label={bentoOpen ? "Close bento drawer" : "Open bento drawer"}
          aria-pressed={bentoOpen}
          title="Bento widgets"
        >
          <LayoutGrid size={14} />
        </button>
        <div
          className="arco-menubar__view-toggle"
          role="group"
          aria-label="Shell view"
        >
          <button
            type="button"
            className={`arco-menubar__view-toggle-btn${shellView === "desktop" ? " arco-menubar__view-toggle-btn--active" : ""}`}
            onClick={() => setShellView("desktop")}
            aria-label="Desktop view"
            aria-pressed={shellView === "desktop"}
            title="Desktop view"
          >
            <Monitor size={14} />
          </button>
          <button
            type="button"
            className={`arco-menubar__view-toggle-btn${shellView === "app" ? " arco-menubar__view-toggle-btn--active" : ""}`}
            onClick={() => setShellView("app")}
            aria-label="App view"
            aria-pressed={shellView === "app"}
            title="App view"
          >
            <AppWindow size={14} />
          </button>
        </div>
        {user && <span title={`Signed in as ${user.username} (${user.role})`}>{user.displayName}</span>}
        <button
          className="arco-menubar__icon-btn"
          onClick={() => void lock()}
          aria-label="Lock Arco"
          title="Lock"
        >
          <Lock size={14} />
        </button>
        <button
          className="arco-menubar__icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <span>{clock}</span>
      </div>
    </header>
  );
}
