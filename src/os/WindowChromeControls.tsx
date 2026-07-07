/**
 * Minimize / maximize / close buttons for frameless Electron windows (Windows & Linux).
 * macOS uses native traffic lights — this renders nothing there.
 */
import { X, Minus, Maximize2 } from "lucide-react";
import { getArcoDesktop } from "../lib/desktopBridge";

export function WindowChromeControls() {
  const desktop = getArcoDesktop();
  if (!desktop || desktop.platform === "darwin") return null;

  return (
    <div className="arco-electron-window-chrome__controls">
      <button
        type="button"
        className="arco-electron-window-chrome__control"
        aria-label="Minimize window"
        onClick={() => void desktop.minimizeWindow()}
      >
        <Minus strokeWidth={2.5} />
      </button>
      <button
        type="button"
        className="arco-electron-window-chrome__control"
        aria-label="Maximize window"
        onClick={() => void desktop.maximizeWindow()}
      >
        <Maximize2 strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className="arco-electron-window-chrome__control arco-electron-window-chrome__control--close"
        aria-label="Close window"
        onClick={() => void desktop.closeWindow()}
      >
        <X strokeWidth={2.5} />
      </button>
    </div>
  );
}
