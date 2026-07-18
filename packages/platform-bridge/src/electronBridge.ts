import { buildPlatformConfig } from "./config";
import type { DesktopBrowserGrabBridge, DesktopWindowBridge, PlatformBridge } from "./types";

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
  browserSetGrabMode?: DesktopBrowserGrabBridge["setGrabMode"];
  browserAwaitGrab?: DesktopBrowserGrabBridge["awaitGrab"];
  browserCaptureCrop?: DesktopBrowserGrabBridge["captureCrop"];
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

function browserGrabFromPreload(): DesktopBrowserGrabBridge | null {
  const desktop = (window as Window & { arcoDesktop?: ElectronPreloadDesktop }).arcoDesktop;
  if (!desktop?.isDesktop) return null;
  if (!desktop.browserSetGrabMode || !desktop.browserAwaitGrab || !desktop.browserCaptureCrop) {
    return null;
  }
  return {
    setGrabMode: (id, enabled) => desktop.browserSetGrabMode!(id, enabled),
    awaitGrab: (id) => desktop.browserAwaitGrab!(id),
    captureCrop: (id, rect) => desktop.browserCaptureCrop!(id, rect),
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
    browserGrab: browserGrabFromPreload(),
    openExternal: async (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };
}
