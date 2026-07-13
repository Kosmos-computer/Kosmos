import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { Button, Input } from "../../components/ui";
import type { DownloadsViewModel } from "./useDownloads";

export interface AddTorrentDialogProps {
  vm: Pick<
    DownloadsViewModel,
    | "addOpen"
    | "addSource"
    | "setAddSource"
    | "addError"
    | "busy"
    | "closeAddTorrent"
    | "submitAddTorrent"
  >;
}

export function AddTorrentDialog({ vm }: AddTorrentDialogProps) {
  if (!vm.addOpen) return null;

  return (
    <div className="arco-downloads__add-backdrop" role="presentation" onClick={vm.closeAddTorrent}>
      <div
        className="arco-downloads__add-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_ADD_TORRENT)}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="arco-downloads__add-title">{i18n.t(I18nKey.APPS$DOWNLOADS_ADD_TORRENT)}</h2>
        <p className="arco-downloads__add-hint">
          Paste a magnet URI or an http(s) link to a .torrent file.
        </p>
        <Input
          value={vm.addSource}
          onChange={(event) => vm.setAddSource(event.target.value)}
          placeholder="magnet:?xt=urn:btih:… or https://…/file.torrent"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void vm.submitAddTorrent();
            }
            if (event.key === "Escape") vm.closeAddTorrent();
          }}
        />
        {vm.addError ? <p className="arco-downloads__add-error">{vm.addError}</p> : null}
        <div className="arco-downloads__add-actions">
          <Button variant="ghost" onClick={vm.closeAddTorrent} disabled={vm.busy}>
            Cancel
          </Button>
          <Button onClick={() => void vm.submitAddTorrent()} disabled={vm.busy}>
            {vm.busy ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
