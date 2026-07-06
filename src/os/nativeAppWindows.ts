/**
 * Sync in-shell window state with native Electron BrowserWindows when the user
 * chooses "Separate windows" in Settings (desktop view only).
 */
import { getArcoDesktop, isArcoDesktop } from "../lib/desktopBridge";
import { useOsStore, type AppWindowHost } from "./osStore";
import { useWindowStore } from "./windowStore";

export function shouldUseNativeAppWindows(): boolean {
  if (!isArcoDesktop()) return false;
  const { shellView, appWindowHost } = useOsStore.getState();
  return shellView === "desktop" && appWindowHost === "native";
}

export function syncNativeOpen(id: string, title: string): void {
  if (!shouldUseNativeAppWindows()) return;
  void getArcoDesktop()?.openAppWindow({ id, title });
}

export function syncNativeClose(id: string): void {
  if (!isArcoDesktop()) return;
  void getArcoDesktop()?.closeAppWindow(id);
}

export function syncNativeFocus(id: string): void {
  if (!shouldUseNativeAppWindows()) return;
  void getArcoDesktop()?.focusAppWindow(id);
}

export function closeAllNativeAppWindows(): void {
  if (!isArcoDesktop()) return;
  void getArcoDesktop()?.closeAllAppWindows();
}

/** Main shell listens for OS close events from child windows. */
export function initNativeAppWindowBridge(): () => void {
  const desktop = getArcoDesktop();
  if (!desktop) return () => {};
  return desktop.onAppWindowClosed((id) => {
    useWindowStore.getState().close(id, { fromNative: true });
  });
}

/** Reconcile open windows when the host mode or shell view changes. */
export function migrateAppWindowHost(nextHost: AppWindowHost, shellView: "desktop" | "app"): void {
  if (!isArcoDesktop()) return;

  const windows = useWindowStore.getState().windows;

  if (shellView !== "desktop" || nextHost !== "native") {
    closeAllNativeAppWindows();
    return;
  }

  for (const win of windows) {
    syncNativeOpen(win.id, win.title);
  }
}

export function getStandaloneWindowKey(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("arcoWindow");
}

export function isStandaloneAppWindow(): boolean {
  return getStandaloneWindowKey() !== null;
}
