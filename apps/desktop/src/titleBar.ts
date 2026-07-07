import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";

/** Matches `.arco-electron-window-chrome` height in the shell. */
export const TITLE_BAR_HEIGHT = 34;

export type TitleBarTheme = "dark" | "light";

/** Solid fills derived from `--arco-bg-surface-solid` in tokens.css. */
export const TITLE_BAR_THEME: Record<TitleBarTheme, { color: string; symbolColor: string }> = {
  dark: { color: "#181b22", symbolColor: "#a8b0bf" },
  light: { color: "#fcfdff", symbolColor: "#4e5665" },
};

export function titleBarWindowOptions(
  theme: TitleBarTheme = "dark",
): Pick<
  BrowserWindowConstructorOptions,
  "autoHideMenuBar" | "titleBarStyle" | "titleBarOverlay" | "trafficLightPosition" | "backgroundColor" | "frame"
> {
  const colors = TITLE_BAR_THEME[theme];

  if (process.platform === "darwin") {
    return {
      autoHideMenuBar: true,
      titleBarStyle: "hidden",
      titleBarOverlay: {
        color: colors.color,
        symbolColor: colors.symbolColor,
        height: TITLE_BAR_HEIGHT,
      },
      backgroundColor: colors.color,
      trafficLightPosition: { x: 16, y: 11 },
    };
  }

  // Frameless on Windows/Linux — the shell renders themed controls in ElectronWindowChrome.
  return {
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: colors.color,
  };
}

export function applyTitleBarTheme(win: BrowserWindow, theme: TitleBarTheme): void {
  const colors = TITLE_BAR_THEME[theme];
  win.setBackgroundColor(colors.color);
  if (process.platform === "darwin") {
    win.setTitleBarOverlay({
      color: colors.color,
      symbolColor: colors.symbolColor,
      height: TITLE_BAR_HEIGHT,
    });
  }
}
