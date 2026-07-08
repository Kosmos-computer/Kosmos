/**
 * Keeps the window manager aligned with the current URL — handles refresh,
 * deep links, and browser back/forward.
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { shellTargetFromPathname } from "@shared/shellRoutes";
import type { SettingsSectionId } from "../apps/settings/settingsSections";
import { useSettingsStore } from "../apps/settings/settingsStore";
import {
  registerShellNavigate,
  registerSettingsSectionBridge,
  resolveTitleForKind,
  shellTargetToWindowKind,
} from "./shellNavigation";
import { useWindowStore } from "./windowStore";

export function ShellRouteSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const open = useWindowStore((s) => s.open);

  useEffect(() => {
    registerShellNavigate(navigate);
    registerSettingsSectionBridge({
      getSection: () => useSettingsStore.getState().activeSection,
      setSection: (section) => useSettingsStore.getState().setActiveSection(section),
    });
  }, [navigate]);

  useEffect(() => {
    const target = shellTargetFromPathname(location.pathname);
    if (!target) return;

    const kind = shellTargetToWindowKind(target);
    open(kind, resolveTitleForKind(kind));

    if (target.type === "system" && target.appId === "settings" && target.section) {
      useSettingsStore.getState().setActiveSection(target.section as SettingsSectionId);
    }
  }, [location.pathname, open]);

  return null;
}
