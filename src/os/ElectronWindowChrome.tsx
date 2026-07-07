/**
 * Always-visible native window chrome — solid themed strip with drag region and
 * platform insets for traffic lights / overlay controls.
 */
import { createPortal } from "react-dom";
import { getArcoDesktop, isArcoDesktop } from "../lib/desktopBridge";
import { WindowChromeControls } from "./WindowChromeControls";

interface Props {
  /** Centered app title — always shown in the native title-bar row. */
  title: string;
}

export function ElectronWindowChrome({ title }: Props) {
  if (!isArcoDesktop()) return null;

  const platform = getArcoDesktop()?.platform ?? "";

  return createPortal(
    <header
      className={[
        "arco-electron-window-chrome",
        platform && `arco-electron-window-chrome--${platform}`,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Window title bar"
    >
      <span className="arco-electron-window-chrome__title">{title}</span>
      <WindowChromeControls />
    </header>,
    document.body,
  );
}
