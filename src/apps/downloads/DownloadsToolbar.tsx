import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Pause,
  Play,
  Plus,
  Settings,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui";
import type { DownloadsViewModel } from "./useDownloadsStub";

export interface DownloadsToolbarProps {
  vm: Pick<
    DownloadsViewModel,
    | "selectedIds"
    | "addTorrentStub"
    | "resumeSelected"
    | "pauseSelected"
    | "stopSelected"
    | "removeSelected"
  >;
}

export function DownloadsToolbar({ vm }: DownloadsToolbarProps) {
  const { t } = useTranslation();
  const hasSelection = vm.selectedIds.length > 0;

  return (
    <div className="arco-downloads__toolbar">
      <div className="arco-downloads__toolbar-group" role="group" aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_TORRENT_ACTIONS)}>
        <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_ADD_TORRENT)} onClick={vm.addTorrentStub}>
          <Plus size={16} strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_START_SELECTED)}
          disabled={!hasSelection}
          onClick={vm.resumeSelected}
        >
          <Play size={16} strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_PAUSE_SELECTED)}
          disabled={!hasSelection}
          onClick={vm.pauseSelected}
        >
          <Pause size={16} strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_STOP_SELECTED)}
          disabled={!hasSelection}
          onClick={vm.stopSelected}
        >
          <Square size={15} strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_REMOVE_SELECTED)}
          disabled={!hasSelection}
          onClick={vm.removeSelected}
        >
          <Trash2 size={16} strokeWidth={1.75} />
        </Button>
      </div>

      <div className="arco-downloads__toolbar-group" role="group" aria-label={i18n.t(I18nKey.APPS$TASKS_PRIORITY)}>
        <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_INCREASE_PRIORITY)} disabled={!hasSelection}>
          <ArrowUp size={16} strokeWidth={1.75} />
        </Button>
        <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_DECREASE_PRIORITY)} disabled={!hasSelection}>
          <ArrowDown size={16} strokeWidth={1.75} />
        </Button>
      </div>

      <div className="arco-downloads__toolbar-spacer" aria-hidden="true" />

      <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_CLIENT_SETTINGS)}>
        <Settings size={16} strokeWidth={1.75} />
      </Button>
    </div>
  );
}
