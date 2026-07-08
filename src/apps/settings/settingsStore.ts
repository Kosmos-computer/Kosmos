import { create } from "zustand";
import { openShellWindow } from "../../os/shellNavigation";
import { systemAppTitle } from "../../os/systemAppTitles";
import { DEFAULT_SETTINGS_SECTION, type SettingsSectionId } from "./settingsSections";

interface SettingsStore {
  activeSection: SettingsSectionId;
  setActiveSection: (section: SettingsSectionId) => void;
  /** Bumped when settings are saved so composer pickers reload. */
  settingsRevision: number;
  bumpSettingsRevision: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  activeSection: DEFAULT_SETTINGS_SECTION,
  setActiveSection: (activeSection) => set({ activeSection }),
  settingsRevision: 0,
  bumpSettingsRevision: () => set((s) => ({ settingsRevision: s.settingsRevision + 1 })),
}));

export function openSettingsApp(section?: SettingsSectionId): void {
  openShellWindow({ type: "system", app: "settings" }, systemAppTitle("settings"), { section });
}
