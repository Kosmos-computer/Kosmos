import { EmptyState } from "../../components/ui";
import type { TorrentItem } from "./types";

const STATUS_LABELS: Record<TorrentItem["status"], string> = {
  downloading: "Downloading",
  seeding: "Seeding",
  paused: "Paused",
  stopped: "Stopped",
  error: "Error",
  queued: "Queued",
  checking: "Verifying",
};

export interface TorrentTableProps {
  torrents: TorrentItem[];
  selectedIds: string[];
  onSelect: (id: string, options?: { additive?: boolean; range?: boolean }) => void;
}

export function TorrentTable({ torrents, selectedIds, onSelect }: TorrentTableProps) {
  if (torrents.length === 0) {
    return (
      <div className="arco-downloads__table-empty">
        <EmptyState title="No torrents">Add a torrent or change your filters.</EmptyState>
      </div>
    );
  }

  return (
    <div className="arco-downloads__table-wrap arco-scroll" role="region" aria-label="Torrent list">
      <div className="arco-downloads__table-header" aria-hidden="true">
        <span>Name</span>
        <span>Size</span>
        <span>Done</span>
        <span>Status</span>
        <span>Seeds</span>
        <span>Peers</span>
        <span>Up speed</span>
        <span>Ratio</span>
        <span>Uploaded</span>
        <span>Down speed</span>
      </div>
      {torrents.map((torrent) => {
        const selected = selectedIds.includes(torrent.id);
        const percent = Math.round(torrent.progress * 100);
        return (
          <button
            key={torrent.id}
            type="button"
            className={[
              "arco-downloads__row",
              selected ? "arco-downloads__row--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={selected}
            onClick={(event) =>
              onSelect(torrent.id, {
                additive: event.metaKey || event.ctrlKey,
                range: event.shiftKey,
              })
            }
          >
            <span className="arco-downloads__cell arco-downloads__cell--name" title={torrent.name}>
              {torrent.name}
            </span>
            <span className="arco-downloads__cell">{torrent.size}</span>
            <span className="arco-downloads__cell arco-downloads__cell--progress">
              <meter
                className="arco-downloads__meter"
                value={torrent.progress}
                min={0}
                max={1}
                aria-label={`${percent}% complete`}
              />
              <span className="arco-downloads__progress-label">{percent}%</span>
            </span>
            <span className="arco-downloads__cell arco-downloads__cell--status">
              {STATUS_LABELS[torrent.status]}
            </span>
            <span className="arco-downloads__cell">
              {torrent.seeds.connected} ({torrent.seeds.total})
            </span>
            <span className="arco-downloads__cell">
              {torrent.peers.connected} ({torrent.peers.total})
            </span>
            <span className="arco-downloads__cell">{torrent.upSpeed}</span>
            <span className="arco-downloads__cell">{torrent.ratio.toFixed(2)}</span>
            <span className="arco-downloads__cell">{torrent.uploaded}</span>
            <span className="arco-downloads__cell">{torrent.downSpeed}</span>
          </button>
        );
      })}
    </div>
  );
}
