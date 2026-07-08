/** Desktop auto-update contract — shared between Electron main and the shell renderer. */

export const UPDATE_IPC = {
  getState: "arco:update-get-state",
  check: "arco:update-check",
  install: "arco:update-install",
  remindLater: "arco:update-remind-later",
  skip: "arco:update-skip",
  stateChanged: "arco:update-state-changed",
} as const;

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "ready"
  | "error";

export type UpdateSuppressed = "none" | "snooze" | "skip";

export interface DesktopUpdateState {
  status: UpdateStatus;
  currentVersion: string;
  version?: string;
  releaseNotes?: string;
  progress?: number;
  error?: string;
  /** True when the update package is downloaded and can be installed. */
  downloaded?: boolean;
  /** Why the update modal is hidden, if applicable. */
  suppressed?: UpdateSuppressed;
  /** Epoch ms when a snoozed update should prompt again. */
  remindAfter?: number;
}

export function hasPendingUpdate(state: DesktopUpdateState | null | undefined): boolean {
  if (!state?.version) return false;
  return state.downloaded === true || state.status === "ready" || state.status === "downloading" || state.status === "available";
}

export function canInstallUpdate(state: DesktopUpdateState | null | undefined): boolean {
  return Boolean(state?.version && (state.downloaded === true || state.status === "ready"));
}
