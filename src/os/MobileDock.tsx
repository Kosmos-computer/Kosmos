/**
 * MobileDock — bottom row of open app surfaces for MobileShell. Rendered fixed
 * in desktop view or inside a swipe-reveal tray in app (fullscreen) view.
 */
import { I18nKey } from "../i18n/declaration";
import i18n from "../i18n/index";
import { T } from "../i18n/T";
import { Globe } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListSearch } from "../components/patterns";
import { matchesListSearch } from "../lib/listSearch";
import { useShellApps } from "./shellApps";
import { resolveWindowTitle } from "./resolveWindowTitle";
import type { OsWindow } from "./windowStore";

export interface MobileDockProps {
  windows: OsWindow[];
  active: OsWindow | undefined;
  onFocus: (id: string) => void;
  onToggleMinimize: (id: string) => void;
}

export function MobileDock({ windows, active, onFocus, onToggleMinimize }: MobileDockProps) {
  const { i18n } = useTranslation();
  const shellApps = useShellApps();
  const [dockSearch, setDockSearch] = useState("");

  const filteredWindows = useMemo(
    () => windows.filter((w) => matchesListSearch(dockSearch, resolveWindowTitle(w))),
    [windows, dockSearch, i18n.language],
  );

  return (
    <nav className="arco-mobile-shell__dock" aria-label={i18n.t(I18nKey.OS_MOBILESHELL_OPEN_SURFACES)}>
      {windows.length > 3 ? (
        <div className="arco-mobile-shell__dock-search">
          <ListSearch
            value={dockSearch}
            onChange={setDockSearch}
            placeholder={i18n.t(I18nKey.OS_MOBILESHELL_FILTER_OPEN_APPS)}
            ariaLabel="Filter open apps"
            compact
          />
        </div>
      ) : null}
      {filteredWindows.map((w) => {
        const shellEntry = shellApps.find((a) => a.id === w.id);
        const Icon = shellEntry?.icon ?? Globe;
        const isActive = active?.id === w.id;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => (isActive ? onToggleMinimize(w.id) : onFocus(w.id))}
            aria-label={resolveWindowTitle(w)}
            className={`arco-mobile-shell__dock-item${isActive ? " arco-mobile-shell__dock-item--active" : ""}`}
          >
            <Icon size={20} strokeWidth={1.8} />
          </button>
        );
      })}
      {windows.length === 0 && (
        <span className="arco-mobile-shell__dock-empty">
          <T k={I18nKey.OS_MOBILESHELL_OPEN_AN_APP_TO_GET_STARTED} />
        </span>
      )}
    </nav>
  );
}
