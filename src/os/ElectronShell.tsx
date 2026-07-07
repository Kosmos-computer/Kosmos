/**
 * Electron shell chrome: renders the custom titlebar above the app (the
 * native frame is disabled in the desktop main process), and keeps the
 * Electron window background in sync with Arco theme tokens. A no-op
 * pass-through in the browser.
 */
import { useEffect, type ReactNode } from "react";
import { getArcoDesktop, isArcoDesktop } from "../lib/desktopBridge";
import { ElectronTitleBar } from "./ElectronTitleBar";
import { useOsStore } from "./osStore";

export function useElectronTitleBarThemeSync(): void {
  const theme = useOsStore((s) => s.theme);

  useEffect(() => {
    const desktop = getArcoDesktop();
    if (!desktop) return;
    void desktop.setTitleBarTheme(theme);
  }, [theme]);
}

export function ElectronShell({ children, windowKey }: { children: ReactNode; windowKey?: string }) {
  useElectronTitleBarThemeSync();

  useEffect(() => {
    if (!isArcoDesktop()) return;
    const desktop = getArcoDesktop();
    if (!desktop) return;
    void desktop.setTitleBarTheme(useOsStore.getState().theme);
  }, []);

  if (!isArcoDesktop()) return <>{children}</>;

  return (
    <div className="arco-electron-shell">
      <ElectronTitleBar windowKey={windowKey} />
      <div className="arco-electron-shell__content">{children}</div>
    </div>
  );
}
