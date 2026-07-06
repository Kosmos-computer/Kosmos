import { create } from "zustand";
import { useWindowStore } from "../../os/windowStore";
import { DEFAULT_SETTINGS_SECTION, type SettingsSectionId } from "./settingsSections";

interface SettingsStore {
  activeSection: SettingsSectionId;
  setActiveSection: (section: SettingsSectionId) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  activeSection: DEFAULT_SETTINGS_SECTION,
  setActiveSection: (activeSection) => set({ activeSection }),
}));

export function openSettingsApp(section?: SettingsSectionId): void {
  if (section) useSettingsStore.getState().setActiveSection(section);
  useWindowStore.getState().open({ type: "system", app: "settings" }, "Settings");
}
