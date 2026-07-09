import { buildPlatformConfig } from "./config";
import type { DesktopWindowBridge, PlatformBridge } from "./types";

interface ElectronPreloadDesktop {
  isDesktop: true;
  platform: string;
  version: string;
  openAppWindow: DesktopWindowBridge["openAppWindow"];
  closeAppWindow: DesktopWindowBridge["closeAppWindow"];
  focusAppWindow: DesktopWindowBridge["focusAppWindow"];
  closeAllAppWindows: DesktopWindowBridge["closeAllAppWindows"];
  setTitleBarTheme: DesktopWindowBridge["setTitleBarTheme"];
  minimizeWindow: DesktopWindowBridge["minimizeWindow"];
  maximizeWindow: DesktopWindowBridge["maximizeWindow"];
  closeWindow: DesktopWindowBridge["closeWindow"];
  onAppWindowClosed: DesktopWindowBridge["onAppWindowClosed"];
}

function desktopBridgeFromPreload(): DesktopWindowBridge | null {
  const desktop = (window as Window & { arcoDesktop?: ElectronPreloadDesktop }).arcoDesktop;
  if (!desktop?.isDesktop) return null;
  return {
    openAppWindow: (payload) => desktop.openAppWindow(payload),
    closeAppWindow: (id) => desktop.closeAppWindow(id),
    focusAppWindow: (id) => desktop.focusAppWindow(id),
    closeAllAppWindows: () => desktop.closeAllAppWindows(),
    setTitleBarTheme: (theme) => desktop.setTitleBarTheme(theme),
    minimizeWindow: () => desktop.minimizeWindow(),
    maximizeWindow: () => desktop.maximizeWindow(),
    closeWindow: () => desktop.closeWindow(),
    onAppWindowClosed: (handler) => desktop.onAppWindowClosed(handler),
  };
}

export function createElectronBridge(): PlatformBridge | null {
  const desktop = (window as Window & { arcoDesktop?: ElectronPreloadDesktop }).arcoDesktop;
  if (!desktop?.isDesktop) return null;
  const desktopApi = desktopBridgeFromPreload();
  return {
    config: buildPlatformConfig({
      kind: "desktop",
      os: desktop.platform,
      version: desktop.version,
      shellProfile: "desktop",
    }),
    desktop: desktopApi,
    openExternal: async (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };
}
