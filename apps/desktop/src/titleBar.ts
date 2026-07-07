import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";

export type TitleBarTheme = "dark" | "light";

/** Solid fills derived from `--arco-bg-surface-solid` in tokens.css. */
export const TITLE_BAR_THEME: Record<TitleBarTheme, { color: string; symbolColor: string }> = {
  dark: { color: "#181b22", symbolColor: "#a8b0bf" },
  light: { color: "#fcfdff", symbolColor: "#4e5665" },
};

/**
 * Frameless window — the renderer draws its own titlebar and window controls
 * (ElectronTitleBar in the shell). Resize borders stay native on all platforms.
 */
export function titleBarWindowOptions(
  theme: TitleBarTheme = "dark",
): Pick<BrowserWindowConstructorOptions, "frame" | "autoHideMenuBar" | "backgroundColor"> {
  return {
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: TITLE_BAR_THEME[theme].color,
  };
}

export function applyTitleBarTheme(win: BrowserWindow, theme: TitleBarTheme): void {
  win.setBackgroundColor(TITLE_BAR_THEME[theme].color);
}
