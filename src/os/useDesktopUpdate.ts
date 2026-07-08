/**
 * Subscribe to desktop auto-update state from the Electron main process.
 */
import { useCallback, useEffect, useState } from "react";
import { getArcoDesktop } from "../lib/desktopBridge";
import type { DesktopUpdateState } from "@shared/desktopUpdate";

export function useDesktopUpdate(): DesktopUpdateState | null {
  const [state, setState] = useState<DesktopUpdateState | null>(null);

  useEffect(() => {
    const desktop = getArcoDesktop();
    if (!desktop?.getUpdateState) return;

    let active = true;
    void desktop.getUpdateState().then((initial) => {
      if (active) setState(initial);
    });

    const unsubscribe = desktop.onUpdateStateChanged?.((next) => {
      if (active) setState(next);
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return state;
}

export function useDesktopUpdateActions() {
  const desktop = getArcoDesktop();

  const checkForUpdates = useCallback(async () => {
    if (!desktop?.checkForUpdates) return null;
    return desktop.checkForUpdates();
  }, [desktop]);

  const installUpdate = useCallback(async () => {
    await desktop?.installUpdate?.();
  }, [desktop]);

  const remindLaterUpdate = useCallback(async (version?: string) => {
    await desktop?.remindLaterUpdate?.(version);
  }, [desktop]);

  const skipUpdate = useCallback(async (version?: string) => {
    await desktop?.skipUpdate?.(version);
  }, [desktop]);

  return { checkForUpdates, installUpdate, remindLaterUpdate, skipUpdate };
}
