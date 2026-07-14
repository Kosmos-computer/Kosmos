import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { Button, Switch } from "../../components/ui";
import type { DownloadsViewModel } from "./useDownloads";

export interface DownloadsSettingsDialogProps {
  vm: Pick<
    DownloadsViewModel,
    | "settingsOpen"
    | "closeSettings"
    | "seedAfterDownload"
    | "setSeedAfterDownload"
    | "settingsBusy"
    | "settingsError"
  >;
}

export function DownloadsSettingsDialog({ vm }: DownloadsSettingsDialogProps) {
  if (!vm.settingsOpen) return null;

  return (
    <div className="arco-downloads__add-backdrop" role="presentation" onClick={vm.closeSettings}>
      <div
        className="arco-downloads__add-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_CLIENT_SETTINGS)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") vm.closeSettings();
        }}
      >
        <h2 className="arco-downloads__add-title">
          {i18n.t(I18nKey.APPS$DOWNLOADS_CLIENT_SETTINGS)}
        </h2>
        <p className="arco-downloads__add-hint">
          Choose what happens when a torrent finishes downloading.
        </p>

        <div className="arco-downloads__settings-row">
          <div className="arco-downloads__settings-copy">
            <span className="arco-downloads__settings-label">Seed after download</span>
            <span className="arco-downloads__settings-desc">
              Keep uploading to peers after the file is complete. Turn off to pause finished
              torrents automatically.
            </span>
          </div>
          <Switch
            checked={vm.seedAfterDownload}
            disabled={vm.settingsBusy}
            aria-label="Seed after download"
            onChange={(event) => {
              void vm.setSeedAfterDownload(event.target.checked);
            }}
          />
        </div>

        {vm.settingsError ? <p className="arco-downloads__add-error">{vm.settingsError}</p> : null}

        <div className="arco-downloads__add-actions">
          <Button onClick={vm.closeSettings} disabled={vm.settingsBusy}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
