/**
 * Sync the native Electron title-bar overlay with Arco theme tokens and mark
 * the document for electron-specific shell CSS (drag regions, control insets).
 */
import { useEffect, type ReactNode } from "react";
import { getArcoDesktop, isArcoDesktop } from "../lib/desktopBridge";
import { useOsStore } from "./osStore";
import { ElectronWindowChrome } from "./ElectronWindowChrome";

function useWindowChromeTitle(explicit?: string): string {
  return explicit ?? "Arco OS";
}

export function useElectronTitleBarThemeSync(): void {
  const theme = useOsStore((s) => s.theme);

  useEffect(() => {
    const desktop = getArcoDesktop();
    if (!desktop) return;
    void desktop.setTitleBarTheme(theme);
  }, [theme]);
}

export function ElectronShell({
  children,
  windowChromeTitle,
}: {
  children: ReactNode;
  /** Standalone app windows pass their window title; the main shell defaults to Arco OS. */
  windowChromeTitle?: string;
}) {
  const chromeTitle = useWindowChromeTitle(windowChromeTitle);
  useElectronTitleBarThemeSync();

  useEffect(() => {
    if (!isArcoDesktop()) return;
    const desktop = getArcoDesktop();
    if (!desktop) return;
    void desktop.setTitleBarTheme(useOsStore.getState().theme);
  }, []);

  return (
    <>
      {children}
      {isArcoDesktop() && <ElectronWindowChrome title={chromeTitle} />}
    </>
  );
}
