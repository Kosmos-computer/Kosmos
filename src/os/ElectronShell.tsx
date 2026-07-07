/**
 * Sync Electron window background with Arco theme tokens and mark the document
 * for electron-specific shell CSS.
 */
import { useEffect, type ReactNode } from "react";
import { getArcoDesktop, isArcoDesktop } from "../lib/desktopBridge";
import { useOsStore } from "./osStore";

export function useElectronTitleBarThemeSync(): void {
  const theme = useOsStore((s) => s.theme);

  useEffect(() => {
    const desktop = getArcoDesktop();
    if (!desktop) return;
    void desktop.setTitleBarTheme(theme);
  }, [theme]);
}

export function ElectronShell({ children }: { children: ReactNode }) {
  useElectronTitleBarThemeSync();

  useEffect(() => {
    if (!isArcoDesktop()) return;
    const desktop = getArcoDesktop();
    if (!desktop) return;
    void desktop.setTitleBarTheme(useOsStore.getState().theme);
  }, []);

  return <>{children}</>;
}
