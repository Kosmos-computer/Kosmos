/**
 * MobileStatusBar — compact top chrome for MobileShell: back, title, shell view
 * toggle, and quick actions (settings, search). Shown fixed in desktop view or
 * inside a swipe-reveal tray in app (fullscreen) view.
 */
import { I18nKey } from "../i18n/declaration";
import i18n from "../i18n/index";
import { AppWindow, ChevronLeft, Maximize, Minimize, Monitor, Search, Settings } from "lucide-react";
import { useMemo } from "react";
import { Menu, type MenuItem } from "../components/Menu";
import { Badge } from "../components/ui/Badge";
import { openSettingsApp } from "../apps/settings/settingsStore";
import { visibleSettingsNavGroups } from "../apps/settings/settingsSections";
import { useCan } from "./auth/authStore";
import { useCommandPaletteStore } from "./commandPaletteStore";
import { useDocumentFullscreen } from "./useDocumentFullscreen";
import { useOsStore } from "./osStore";
import type { OsWindow } from "./windowStore";
import { resolveWindowTitle } from "./resolveWindowTitle";

export interface MobileStatusBarProps {
  active: OsWindow | undefined;
  onBack?: () => void;
}

export function MobileStatusBar({ active, onBack }: MobileStatusBarProps) {
  const { shellView, setShellView } = useOsStore();
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const { fullscreen, toggle: toggleFullscreen } = useDocumentFullscreen();
  const canManageUsers = useCan("users:manage");
  const canWriteSettings = useCan("settings:write");

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

  const title = active ? resolveWindowTitle(active) : "Kosmos";

  return (
    <header className="arco-mobile-statusbar">
      <div className="arco-mobile-statusbar__left">
        {active && onBack ? (
          <button
            type="button"
            className="arco-mobile-statusbar__icon-btn"
            onClick={onBack}
            aria-label={i18n.t(I18nKey.OS_MOBILESHELL_BACK_TO_HOME)}
          >
            <ChevronLeft size={20} />
          </button>
        ) : (
          <Menu
            trigger={
              <button
                type="button"
                className="arco-mobile-statusbar__icon-btn"
                aria-label={i18n.t(I18nKey.OS$APP_SETTINGS)}
              >
                <Settings size={18} />
              </button>
            }
            items={settingsMenuItems}
            aria-label={i18n.t(I18nKey.OS$APP_SETTINGS)}
            searchPlaceholder={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_SETTINGS)}
          />
        )}
        <strong className="arco-mobile-statusbar__title">{title}</strong>
      </div>
      <Badge className="arco-mobile-statusbar__beta" aria-label="Beta">
        Beta
      </Badge>
      <div className="arco-mobile-statusbar__right">
        <button
          type="button"
          className="arco-mobile-statusbar__icon-btn"
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-pressed={fullscreen}
          title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
        <button
          type="button"
          className="arco-mobile-statusbar__icon-btn"
          aria-label={i18n.t(I18nKey.COMMON$SEARCH)}
          onClick={openPalette}
        >
          <Search size={18} />
        </button>
        <div
          className="arco-mobile-statusbar__view-toggle"
          role="group"
          aria-label={i18n.t(I18nKey.OS_MENUBAR_SHELL_VIEW)}
        >
          <button
            type="button"
            className={`arco-mobile-statusbar__view-toggle-btn${
              shellView === "desktop" ? " arco-mobile-statusbar__view-toggle-btn--active" : ""
            }`}
            onClick={() => setShellView("desktop")}
            aria-label={i18n.t(I18nKey.OS_MENUBAR_DESKTOP_VIEW)}
            aria-pressed={shellView === "desktop"}
          >
            <Monitor size={16} />
          </button>
          <button
            type="button"
            className={`arco-mobile-statusbar__view-toggle-btn${
              shellView === "app" ? " arco-mobile-statusbar__view-toggle-btn--active" : ""
            }`}
            onClick={() => setShellView("app")}
            aria-label={i18n.t(I18nKey.OS_MENUBAR_APP_VIEW)}
            aria-pressed={shellView === "app"}
          >
            <AppWindow size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
