/**
 * Modal shown when a desktop build has downloaded an update (Figma-style restart prompt).
 */
import { Download, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/Button";
import { shouldShowUpdateModal, type DesktopUpdateState } from "@shared/desktopUpdate";
import { useDesktopUpdateController } from "./useDesktopUpdate";

function formatProgress(progress?: number): string {
  if (progress == null || Number.isNaN(progress)) return "";
  return `${Math.round(progress)}%`;
}

function UpdateModalBody({
  state,
  onInstall,
  onRemindLater,
  onSkip,
}: {
  state: DesktopUpdateState;
  onInstall: () => void;
  onRemindLater: () => void;
  onSkip: () => void;
}) {
  const { status, version, currentVersion, releaseNotes, progress } = state;

  if (status === "ready") {
    return (
      <>
        <header className="arco-update-modal__header">
          <div className="arco-update-modal__icon" aria-hidden="true">
            <RefreshCw size={20} />
          </div>
          <div>
            <h2 className="arco-update-modal__title">Update ready</h2>
            <p className="arco-update-modal__subtitle">
              Arco OS {version ?? "update"} is downloaded and ready to install.
            </p>
          </div>
        </header>
        {releaseNotes ? (
          <div className="arco-update-modal__notes">
            <p className="arco-update-modal__notes-label">What&apos;s new</p>
            <p className="arco-update-modal__notes-body">{releaseNotes}</p>
          </div>
        ) : null}
        <footer className="arco-update-modal__actions arco-update-modal__actions--stacked">
          <div className="arco-update-modal__actions-primary">
            <Button variant="primary" onClick={onInstall}>
              Restart to update
            </Button>
            <Button variant="ghost" onClick={onRemindLater}>
              Remind me later
            </Button>
          </div>
          <button type="button" className="arco-update-modal__skip" onClick={onSkip}>
            Skip this version
          </button>
        </footer>
      </>
    );
  }

  if (status === "downloading" || status === "available") {
    return (
      <>
        <header className="arco-update-modal__header">
          <div className="arco-update-modal__icon" aria-hidden="true">
            <Download size={20} />
          </div>
          <div>
            <h2 className="arco-update-modal__title">Downloading update</h2>
            <p className="arco-update-modal__subtitle">
              {version
                ? `Arco OS ${version} will install after download (${currentVersion} → ${version}).`
                : "Fetching the latest Arco OS release."}
            </p>
          </div>
        </header>
        <div className="arco-update-modal__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? 0}>
          <div className="arco-update-modal__progress-track">
            <div
              className="arco-update-modal__progress-fill"
              style={{ width: `${Math.max(4, progress ?? 4)}%` }}
            />
          </div>
          <span className="arco-update-modal__progress-label">{formatProgress(progress) || "Starting…"}</span>
        </div>
        <footer className="arco-update-modal__actions arco-update-modal__actions--stacked">
          <div className="arco-update-modal__actions-primary">
            <Button variant="ghost" onClick={onRemindLater}>
              Remind me later
            </Button>
          </div>
          {version ? (
            <button type="button" className="arco-update-modal__skip" onClick={onSkip}>
              Skip version {version}
            </button>
          ) : null}
        </footer>
      </>
    );
  }

  return null;
}

export function UpdateModal() {
  const { state, installUpdate, remindLaterUpdate, skipUpdate } = useDesktopUpdateController();

  if (!shouldShowUpdateModal(state)) return null;

  const version = state!.version;

  return (
    <div className="arco-update-modal__backdrop" role="presentation">
      <div
        className="arco-update-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arco-update-modal-title"
      >
        <UpdateModalBody
          state={state!}
          onInstall={() => void installUpdate()}
          onRemindLater={() => void remindLaterUpdate(version)}
          onSkip={() => void skipUpdate(version)}
        />
      </div>
    </div>
  );
}
