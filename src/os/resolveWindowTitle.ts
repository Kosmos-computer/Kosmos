import type { OsWindow } from "./windowStore";
import { systemAppTitle } from "./systemAppTitles";

/** Resolve a window title for display — system apps track the active locale. */
export function resolveWindowTitle(win: OsWindow): string {
  if (win.kind.type === "system") {
    return systemAppTitle(win.kind.app);
  }
  return win.title;
}
