import { EmptyState } from "../../components/ui";
import type { TorrentDetailTab, TorrentItem } from "./types";

const TABS: { id: TorrentDetailTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "trackers", label: "Trackers" },
  { id: "peers", label: "Peers" },
  { id: "files", label: "Files" },
  { id: "statistics", label: "Statistics" },
];

export interface TorrentDetailPaneProps {
  torrent: TorrentItem | null;
  tab: TorrentDetailTab;
  onTabChange: (tab: TorrentDetailTab) => void;
}

function GeneralTab({ torrent }: { torrent: TorrentItem }) {
  return (
    <dl className="arco-downloads-detail__grid">
      <dt>Location</dt>
      <dd>~/Downloads/Complete</dd>
      <dt>Hash</dt>
      <dd className="arco-downloads-detail__mono">a3f2…9c01 (stub)</dd>
      <dt>Tracker</dt>
      <dd>{torrent.tracker}</dd>
      <dt>Last active</dt>
      <dd>{torrent.lastActive}</dd>
      <dt>Added</dt>
      <dd>{new Date(torrent.addedAt).toLocaleString()}</dd>
      <dt>Download speed</dt>
      <dd>{torrent.downSpeed}</dd>
      <dt>Upload speed</dt>
      <dd>{torrent.upSpeed}</dd>
      <dt>Downloaded</dt>
      <dd>{torrent.downloaded}</dd>
      <dt>Uploaded</dt>
      <dd>{torrent.uploaded}</dd>
      <dt>Remaining</dt>
      <dd>{torrent.remaining}</dd>
      {torrent.error ? (
        <>
          <dt>Error</dt>
          <dd className="arco-downloads-detail__error">{torrent.error}</dd>
        </>
      ) : null}
    </dl>
  );
}

function TrackersTab({ torrent }: { torrent: TorrentItem }) {
  return (
    <table className="arco-downloads-detail__table">
      <thead>
        <tr>
          <th scope="col">Tracker</th>
          <th scope="col">Status</th>
          <th scope="col">Last announce</th>
          <th scope="col">Seeds</th>
          <th scope="col">Leechers</th>
        </tr>
      </thead>
      <tbody>
        {torrent.trackers.map((tracker) => (
          <tr key={tracker.id}>
            <td className="arco-downloads-detail__mono">{tracker.url}</td>
            <td>{tracker.status}</td>
            <td>{tracker.lastAnnounce}</td>
            <td>{tracker.seeders}</td>
            <td>{tracker.leechers}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PeersTab({ torrent }: { torrent: TorrentItem }) {
  if (torrent.peersList.length === 0) {
    return <EmptyState title="No peers">Connected peers will appear here.</EmptyState>;
  }
  return (
    <table className="arco-downloads-detail__table">
      <thead>
        <tr>
          <th scope="col">Address</th>
          <th scope="col">Client</th>
          <th scope="col">Progress</th>
          <th scope="col">Down</th>
          <th scope="col">Up</th>
          <th scope="col">Flags</th>
        </tr>
      </thead>
      <tbody>
        {torrent.peersList.map((peer) => (
          <tr key={peer.id}>
            <td className="arco-downloads-detail__mono">{peer.address}</td>
            <td>{peer.client}</td>
            <td>{Math.round(peer.progress * 100)}%</td>
            <td>{peer.downSpeed}</td>
            <td>{peer.upSpeed}</td>
            <td>{peer.flags}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FilesTab({ torrent }: { torrent: TorrentItem }) {
  return (
    <table className="arco-downloads-detail__table">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Size</th>
          <th scope="col">Progress</th>
          <th scope="col">Priority</th>
          <th scope="col">Wanted</th>
        </tr>
      </thead>
      <tbody>
        {torrent.files.map((file) => (
          <tr key={file.id}>
            <td>{file.name}</td>
            <td>{file.size}</td>
            <td>{Math.round(file.progress * 100)}%</td>
            <td>{file.priority}</td>
            <td>{file.wanted ? "Yes" : "No"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatisticsTab({ torrent }: { torrent: TorrentItem }) {
  return (
    <dl className="arco-downloads-detail__grid">
      <dt>Ratio</dt>
      <dd>{torrent.ratio.toFixed(2)}</dd>
      <dt>Wasted</dt>
      <dd>{torrent.wasted}</dd>
      <dt>Max peers</dt>
      <dd>{torrent.maxPeers}</dd>
      <dt>Download limit</dt>
      <dd>{torrent.downLimit}</dd>
      <dt>Upload limit</dt>
      <dd>{torrent.upLimit}</dd>
      <dt>Tracker update</dt>
      <dd>{torrent.trackerUpdate}</dd>
    </dl>
  );
}

export function TorrentDetailPane({ torrent, tab, onTabChange }: TorrentDetailPaneProps) {
  return (
    <section className="arco-downloads-detail" aria-label="Torrent inspector">
      <div className="arco-downloads-detail__tabs" role="tablist" aria-label="Torrent detail">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={[
              "arco-downloads-detail__tab",
              tab === entry.id ? "arco-downloads-detail__tab--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onTabChange(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="arco-downloads-detail__body arco-scroll" role="tabpanel">
        {!torrent ? (
          <EmptyState title="No selection">Select a torrent to inspect details.</EmptyState>
        ) : tab === "general" ? (
          <GeneralTab torrent={torrent} />
        ) : tab === "trackers" ? (
          <TrackersTab torrent={torrent} />
        ) : tab === "peers" ? (
          <PeersTab torrent={torrent} />
        ) : tab === "files" ? (
          <FilesTab torrent={torrent} />
        ) : (
          <StatisticsTab torrent={torrent} />
        )}
      </div>
    </section>
  );
}
