/**
 * Settings — check, install, defer, or skip desktop app updates.
 */
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { useDesktopUpdateController } from "../../os/useDesktopUpdate";
import {
  canInstallUpdate,
  hasPendingUpdate,
  type DesktopUpdateState,
} from "@shared/desktopUpdate";

function formatRemindAfter(remindAfter?: number): string | null {
  if (!remindAfter) return null;
  const date = new Date(remindAfter);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusMessage(state: DesktopUpdateState | null): string {
  if (!state) return "Updates are available in the packaged desktop app.";
  if (state.suppressed === "skip" && state.version) {
    return `Version ${state.version} was skipped. Check for updates to find newer releases.`;
  }
  if (state.suppressed === "snooze" && state.version) {
    const when = formatRemindAfter(state.remindAfter);
    return when
      ? `Update to ${state.version} is downloaded. We'll remind you again around ${when}.`
      : `Update to ${state.version} is downloaded. Reminder scheduled for later.`;
  }
  switch (state.status) {
    case "checking":
      return "Checking for updates…";
    case "available":
    case "downloading":
      return state.version
        ? `Downloading Arco OS ${state.version}…`
        : "Downloading update…";
    case "ready":
      return state.version
        ? `Arco OS ${state.version} is ready — restart to install.`
        : "An update is ready — restart to install.";
    case "not-available":
      return `You're on the latest version (${state.currentVersion}).`;
    case "error":
      return state.error ?? "Could not check for updates.";
    default:
      if (canInstallUpdate(state)) {
        return `Arco OS ${state.version} is ready to install.`;
      }
      return `Current version: ${state.currentVersion}`;
  }
}

export function DesktopUpdatesSection() {
  const { state, checkForUpdates, installUpdate, remindLaterUpdate, skipUpdate } = useDesktopUpdateController();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await checkForUpdates();
    } finally {
      setChecking(false);
    }
  };

  const version = state?.version;
  const installReady = canInstallUpdate(state);
  const pending = hasPendingUpdate(state);
  const showDeferActions = Boolean(version && pending && state?.suppressed !== "skip");

  return (
    <div className="arco-settings-panel__stack arco-settings-updates">
      <p className="arco-settings-panel__meta">
        Installed: <strong>{state?.currentVersion ?? "—"}</strong>
        {version ? (
          <>
            {" "}
            · Available: <strong>{version}</strong>
          </>
        ) : null}
      </p>
      <p className="arco-settings-panel__hint">{statusMessage(state)}</p>
      {state?.releaseNotes && pending ? (
        <div className="arco-settings-updates__notes">
          <p className="arco-settings-updates__notes-label">What&apos;s new</p>
          <p className="arco-settings-updates__notes-body">{state.releaseNotes}</p>
        </div>
      ) : null}
      {state?.progress != null && pending && !installReady ? (
        <div className="arco-settings-updates__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.progress}>
          <div className="arco-settings-updates__progress-track">
            <div className="arco-settings-updates__progress-fill" style={{ width: `${Math.max(4, state.progress)}%` }} />
          </div>
          <span className="arco-settings-updates__progress-label">{Math.round(state.progress)}%</span>
        </div>
      ) : null}
      <div className="arco-settings-panel__row-actions">
        <Button onClick={() => void handleCheck()} disabled={checking || state?.status === "checking"}>
          {checking || state?.status === "checking" ? "Checking…" : "Check for updates"}
        </Button>
        {installReady ? (
          <Button variant="primary" onClick={() => void installUpdate()}>
            Restart to update
          </Button>
        ) : null}
      </div>
      {showDeferActions ? (
        <div className="arco-settings-updates__defer">
          <button type="button" className="arco-settings-updates__link" onClick={() => void remindLaterUpdate(version)}>
            Remind me later
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" className="arco-settings-updates__link" onClick={() => void skipUpdate(version)}>
            Skip this version
          </button>
        </div>
      ) : null}
    </div>
  );
}
