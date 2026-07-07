/**
 * Custom Electron window chrome — replaces the native OS titlebar. The macOS
 * variant puts traffic lights on the left; the Windows/Linux variant puts
 * glyph controls on the right. Styling reuses the themed window-titlebar
 * classes so the chrome always matches the shell theme. The bar itself is a
 * drag region; the controls opt out so they stay clickable.
 */
import { getArcoDesktop } from "../lib/desktopBridge";
import { useStandaloneWindowTitle } from "./useStandaloneWindowTitle";
import { WindowControls } from "./WindowControls";
import type { WindowControlAlign, WindowControlStyle } from "./themeTokens";

export function ElectronTitleBar({ windowKey }: { windowKey?: string }) {
  const title = useStandaloneWindowTitle(windowKey ?? "");
  const desktop = getArcoDesktop();
  if (!desktop) return null;

  const mac = desktop.platform === "darwin";
  const controlStyle: WindowControlStyle = mac ? "traffic" : "glyph";
  const align: WindowControlAlign = mac ? "left" : "right";

  return (
    <header
      className={[
        "arco-electron-titlebar",
        "arco-window__titlebar",
        `arco-window__titlebar--style-${controlStyle}`,
        `arco-window__titlebar--align-${align}`,
      ].join(" ")}
    >
      {/* Title first: glyph-right relies on margin-left auto, glyph-left on order -1. */}
      <span className="arco-window__title">{title}</span>
      <WindowControls
        controlStyle={controlStyle}
        onClose={() => void desktop.closeWindow()}
        onMinimize={() => void desktop.minimizeWindow()}
        onMaximize={() => void desktop.maximizeWindow()}
      />
    </header>
  );
}
