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
  const hasSelection = vm.selectedIds.length > 0;

  return (
    <div className="arco-downloads__toolbar">
      <div className="arco-downloads__toolbar-group" role="group" aria-label="Torrent actions">
        <Button variant="ghost" size="icon" aria-label="Add torrent" onClick={vm.addTorrentStub}>
          <Plus size={16} strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Start selected"
          disabled={!hasSelection}
          onClick={vm.resumeSelected}
        >
          <Play size={16} strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Pause selected"
          disabled={!hasSelection}
          onClick={vm.pauseSelected}
        >
          <Pause size={16} strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Stop selected"
          disabled={!hasSelection}
          onClick={vm.stopSelected}
        >
          <Square size={15} strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove selected"
          disabled={!hasSelection}
          onClick={vm.removeSelected}
        >
          <Trash2 size={16} strokeWidth={1.75} />
        </Button>
      </div>

      <div className="arco-downloads__toolbar-group" role="group" aria-label="Priority">
        <Button variant="ghost" size="icon" aria-label="Increase priority" disabled={!hasSelection}>
          <ArrowUp size={16} strokeWidth={1.75} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Decrease priority" disabled={!hasSelection}>
          <ArrowDown size={16} strokeWidth={1.75} />
        </Button>
      </div>

      <div className="arco-downloads__toolbar-spacer" aria-hidden="true" />

      <Button variant="ghost" size="icon" aria-label="Client settings">
        <Settings size={16} strokeWidth={1.75} />
      </Button>
    </div>
  );
}
