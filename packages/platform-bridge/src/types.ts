/** Which native shell wraps the shared web UI. */
export type PlatformKind = "desktop" | "mobile" | "web";

/** OS family — aligned with Node/Electron naming where possible. */
export type PlatformOs = "darwin" | "win32" | "linux" | "android" | "ios" | "web";

/**
 * How the shell chooses Desktop vs MobileShell.
 * - desktop / mobile: force that chrome profile
 * - auto: responsive breakpoint (browser + Tauri desktop dev)
 */
export type ShellProfile = "desktop" | "mobile" | "auto";

export interface PlatformConfig {
  kind: PlatformKind;
  os: PlatformOs;
  /** Human-readable shell version (Electron/Tauri app version). */
  version: string;
  shellProfile: ShellProfile;
  /**
   * Optional API origin for remote backends (e.g. Tauri mobile prototype).
   * When set, relative /api/* requests are prefixed with this base.
   */
  apiBase: string | null;
}

export interface OpenAppWindowPayload {
  id: string;
  title: string;
}

export type TitleBarTheme = "dark" | "light";

/** Desktop-only window chrome — no-ops on mobile/web. */
export interface DesktopWindowBridge {
  openAppWindow(payload: OpenAppWindowPayload): Promise<void>;
  closeAppWindow(id: string): Promise<void>;
  focusAppWindow(id: string): Promise<void>;
  closeAllAppWindows(): Promise<void>;
  setTitleBarTheme(theme: TitleBarTheme): Promise<void>;
  minimizeWindow(): Promise<void>;
  maximizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  onAppWindowClosed(handler: (id: string) => void): () => void;
}

export interface PlatformBridge {
  config: PlatformConfig;
  desktop: DesktopWindowBridge | null;
  openExternal(url: string): Promise<void>;
}

declare global {
  interface Window {
    /** Injected at boot by bootstrapPlatformShell (optional override). */
    __ARCO_PLATFORM__?: Partial<PlatformConfig>;
    __TAURI_INTERNALS__?: unknown;
  }
}
