/**
 * apisNavStore — deep-link the APIs app to Installed vs Marketplace.
 * Composer "Browse connectors" / "Add plugins" open marketplace.
 */
import { create } from "zustand";
import { openShellWindow } from "../../os/shellNavigation";
import { systemAppTitle } from "../../os/systemAppTitles";
import type { ApiCatalogTab } from "./types";

interface ApisNavStore {
  initialTab: ApiCatalogTab | null;
  consumeInitialTab: () => ApiCatalogTab | null;
  setInitialTab: (tab: ApiCatalogTab) => void;
}

export const useApisNavStore = create<ApisNavStore>((set, get) => ({
  initialTab: null,
  setInitialTab: (initialTab) => set({ initialTab }),
  consumeInitialTab: () => {
    const tab = get().initialTab;
    set({ initialTab: null });
    return tab;
  },
}));

export function openApisApp(tab: ApiCatalogTab = "marketplace"): void {
  useApisNavStore.getState().setInitialTab(tab);
  openShellWindow({ type: "system", app: "apis" }, systemAppTitle("apis"));
}
