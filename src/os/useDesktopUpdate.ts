/**
 * Subscribe to desktop auto-update state from the Electron main process.
 */
import { useCallback, useEffect, useState } from "react";
import { getArcoDesktop } from "../lib/desktopBridge";
import type { DesktopUpdateState } from "@shared/desktopUpdate";

function applyUpdateState(
  setState: (state: DesktopUpdateState | null) => void,
  next: DesktopUpdateState | null | undefined,
): void {
  if (next) setState(next);
}

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

export function useDesktopUpdateActions(
  setState?: (state: DesktopUpdateState | null) => void,
) {
  const desktop = getArcoDesktop();

  const refreshUpdateState = useCallback(async () => {
    if (!desktop?.getUpdateState) return null;
    const next = await desktop.getUpdateState();
    if (setState) setState(next);
    return next;
  }, [desktop, setState]);

  const checkForUpdates = useCallback(async () => {
    if (!desktop?.checkForUpdates) return refreshUpdateState();
    const next = await desktop.checkForUpdates();
    if (setState) applyUpdateState(setState, next);
    return next;
  }, [desktop, refreshUpdateState, setState]);

  const installUpdate = useCallback(async () => {
    if (!desktop?.installUpdate) return refreshUpdateState();
    const next = await desktop.installUpdate();
    if (setState) applyUpdateState(setState, next);
    return next;
  }, [desktop, refreshUpdateState, setState]);

  const remindLaterUpdate = useCallback(async (version?: string) => {
    if (!desktop?.remindLaterUpdate) return refreshUpdateState();
    const next = await desktop.remindLaterUpdate(version);
    if (setState) applyUpdateState(setState, next);
    return next;
  }, [desktop, refreshUpdateState, setState]);

  const skipUpdate = useCallback(async (version?: string) => {
    if (!desktop?.skipUpdate) return refreshUpdateState();
    const next = await desktop.skipUpdate(version);
    if (setState) applyUpdateState(setState, next);
    return next;
  }, [desktop, refreshUpdateState, setState]);

  return { checkForUpdates, installUpdate, remindLaterUpdate, skipUpdate, refreshUpdateState };
}

/** State subscription + actions that keep the renderer in sync after user choices. */
export function useDesktopUpdateController() {
  const [state, setState] = useState<DesktopUpdateState | null>(null);
  const actions = useDesktopUpdateActions(setState);

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

  return { state, ...actions };
}
