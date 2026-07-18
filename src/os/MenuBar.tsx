import { I18nKey } from "../i18n/declaration";
import i18n from "../i18n/index";
/** Top chrome: left-nav visibility toggle, search, focused window title, status tray, clock, settings. */
import { useEffect, useMemo, useState } from "react";
import { AppWindow, LayoutGrid, Lock, LogOut, Monitor, Moon, PanelLeft, Search, Settings, Sun } from "lucide-react";
import { Menu, type MenuItem } from "../components/Menu";
import { openSettingsApp } from "../apps/settings/settingsStore";
import { visibleSettingsNavGroups } from "../apps/settings/settingsSections";
import { useCan, useAuthStore } from "./auth/authStore";
import { useBentoStore } from "./bento/bentoStore";
import { useCommandPaletteStore } from "./commandPaletteStore";
import { MenuBarBackendStatus } from "./MenuBarBackendStatus";
import { MenuBarKeyboardControl } from "./MenuBarKeyboardControl";
import { MenuBarLanguageSwitcher } from "./MenuBarLanguageSwitcher";
import { MenuBarToolsStatus } from "./MenuBarToolsStatus";
import { MenuBarVolumeControl } from "./MenuBarVolumeControl";
import { useOsStore } from "./osStore";
import { resolveWindowTitle } from "./resolveWindowTitle";
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
  const { theme, setTheme, shellView, setShellView, navVisible, setNavVisible } = useOsStore();
  const bentoOpen = useBentoStore((s) => s.open);
  const toggleBento = useBentoStore((s) => s.toggleOpen);
  const user = useAuthStore((s) => s.user);
  const lock = useAuthStore((s) => s.lock);
  const logout = useAuthStore((s) => s.logout);
  const canManageUsers = useCan("users:manage");
  const canWriteSettings = useCan("settings:write");
  const windows = useWindowStore((s) => s.windows);
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const clock = useClock();

  const settingsMenuItems = useMemo<MenuItem[]>(() => {
    const groups = visibleSettingsNavGroups({ canWriteSettings, canManageUsers });
    return groups.flatMap((group, groupIndex) =>
      group.items.map((item, itemIndex) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        keywords: [item.label, group.title, item.id],
        separatorAbove: groupIndex > 0 && itemIndex === 0,
        onSelect: () => openSettingsApp(item.id),
      })),
    );
  }, [canWriteSettings, canManageUsers]);

  const settingsFooterItems = useMemo<MenuItem[]>(
    () => [
      {
        id: "lock-screen",
        label: "Lock screen",
        icon: Lock,
        onSelect: () => void lock(),
      },
      {
        id: "sign-out",
        label: "Sign out",
        icon: LogOut,
        danger: true,
        onSelect: () => void logout(),
      },
    ],
    [lock, logout],
  );

  const focused = windows
    .filter((w) => !w.minimized)
    .sort((a, b) => b.z - a.z)[0];

  return (
    <header className="arco-menubar">
      <div className="arco-menubar__left">
        <button
          type="button"
          className={`arco-menubar__icon-btn${navVisible ? " arco-menubar__icon-btn--active" : ""}`}
          onClick={() => setNavVisible(!navVisible)}
          aria-label={navVisible ? "Hide left navigation" : "Show left navigation"}
          aria-pressed={navVisible}
          title={navVisible ? "Hide left navigation" : "Show left navigation"}
        >
          <PanelLeft size={14} />
        </button>
        <button
          type="button"
          className="arco-menubar__icon-btn"
          aria-label={i18n.t(I18nKey.COMMON$SEARCH)}
          title={i18n.t(I18nKey.OS_MENUBAR_SEARCH_K)}
          onClick={openPalette}
        >
          <Search size={14} />
        </button>
      </div>
      <span className="arco-menubar__title">{focused ? resolveWindowTitle(focused) : ""}</span>
      <div className="arco-menubar__right">
        <button
          type="button"
          className={`arco-menubar__icon-btn${bentoOpen ? " arco-menubar__icon-btn--active" : ""}`}
          onClick={toggleBento}
          aria-label={bentoOpen ? "Close bento drawer" : "Open bento drawer"}
          aria-pressed={bentoOpen}
          title={i18n.t(I18nKey.OS_MENUBAR_BENTO_WIDGETS)}
        >
          <LayoutGrid size={14} />
        </button>
        <div
          className="arco-menubar__view-toggle"
          role="group"
          aria-label={i18n.t(I18nKey.OS_MENUBAR_SHELL_VIEW)}
        >
          <button
            type="button"
            className={`arco-menubar__view-toggle-btn${shellView === "desktop" ? " arco-menubar__view-toggle-btn--active" : ""}`}
            onClick={() => setShellView("desktop")}
            aria-label={i18n.t(I18nKey.OS_MENUBAR_DESKTOP_VIEW)}
            aria-pressed={shellView === "desktop"}
            title={i18n.t(I18nKey.OS_MENUBAR_DESKTOP_VIEW)}
          >
            <Monitor size={14} />
          </button>
          <button
            type="button"
            className={`arco-menubar__view-toggle-btn${shellView === "app" ? " arco-menubar__view-toggle-btn--active" : ""}`}
            onClick={() => setShellView("app")}
            aria-label={i18n.t(I18nKey.OS_MENUBAR_APP_VIEW)}
            aria-pressed={shellView === "app"}
            title={i18n.t(I18nKey.OS_MENUBAR_APP_VIEW)}
          >
            <AppWindow size={14} />
          </button>
        </div>
        <button
          className="arco-menubar__icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <MenuBarLanguageSwitcher />
        <MenuBarKeyboardControl />
        <MenuBarVolumeControl />
        <MenuBarToolsStatus />
        <MenuBarBackendStatus />
        <span>{clock}</span>
        <Menu
          align="end"
          trigger={
            <button
              type="button"
              className="arco-menubar__icon-btn"
              aria-label={i18n.t(I18nKey.OS$APP_SETTINGS)}
              title={i18n.t(I18nKey.OS$APP_SETTINGS)}
            >
              <Settings size={14} />
            </button>
          }
          items={settingsMenuItems}
          footerHeader={
            user ? (
              <div className="arco-menu__user" title={`Signed in as ${user.username} (${user.role})`}>
                <span className="arco-menu__user-name">{user.displayName}</span>
                <span className="arco-menu__user-meta">{user.role}</span>
              </div>
            ) : null
          }
          footerItems={settingsFooterItems}
          aria-label={i18n.t(I18nKey.OS$APP_SETTINGS)}
          searchPlaceholder={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_SETTINGS)}
        />
      </div>
    </header>
  );
}
