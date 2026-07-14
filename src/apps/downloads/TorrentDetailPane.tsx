import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Button, EmptyState } from "../../components/ui";
import type { TorrentDetailTab, TorrentItem } from "./types";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  openTorrentFileInDrive,
  openTorrentInDrive,
  revealTorrentFileOnDisk,
  revealTorrentOnDisk,
  addTorrentAudioToMusic,
  addTorrentFileToMusic,
} from "./openTorrentLocation";

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
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="arco-downloads-detail__general">
      <div className="arco-downloads-detail__actions">
        <Button
          disabled={busy}
          onClick={() => void run(() => openTorrentInDrive(torrent))}
        >
          Open in Drive
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void run(() => addTorrentAudioToMusic(torrent))}
        >
          Add to Music
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void run(() => revealTorrentOnDisk(torrent))}
        >
          Show on disk
        </Button>
      </div>
      {actionError ? <p className="arco-downloads-detail__error">{actionError}</p> : null}
      <dl className="arco-downloads-detail__grid">
        <dt><T k={I18nKey.APPS$DOWNLOADS_LOCATION} /></dt>
        <dd className="arco-downloads-detail__mono">{torrent.savePath}</dd>
        <dt><T k={I18nKey.APPS$DOWNLOADS_HASH} /></dt>
        <dd className="arco-downloads-detail__mono">{torrent.id}</dd>
        <dt><T k={I18nKey.APPS$DOWNLOADS_TRACKER} /></dt>
        <dd>{torrent.tracker}</dd>
        <dt><T k={I18nKey.APPS$DOWNLOADS_LAST_ACTIVE} /></dt>
        <dd>{torrent.lastActive}</dd>
        <dt><T k={I18nKey.APPS$DOWNLOADS_ADDED} /></dt>
        <dd>{new Date(torrent.addedAt).toLocaleString()}</dd>
        <dt><T k={I18nKey.APPS$DOWNLOADS_DOWNLOAD_SPEED} /></dt>
        <dd>{torrent.downSpeed}</dd>
        <dt><T k={I18nKey.APPS$DOWNLOADS_UPLOAD_SPEED} /></dt>
        <dd>{torrent.upSpeed}</dd>
        <dt><T k={I18nKey.APPS$DOWNLOADS_DOWNLOADED} /></dt>
        <dd>{torrent.downloaded}</dd>
        <dt><T k={I18nKey.APPS$DOWNLOADS_UPLOADED} /></dt>
        <dd>{torrent.uploaded}</dd>
        <dt><T k={I18nKey.APPS$DOWNLOADS_REMAINING} /></dt>
        <dd>{torrent.remaining}</dd>
        {torrent.driveFolderId || torrent.driveFileIds.length > 0 ? (
          <>
            <dt>Drive</dt>
            <dd>
              {torrent.driveFileIds.length > 0
                ? `${torrent.driveFileIds.length} file(s) imported`
                : "Folder ready"}
            </dd>
          </>
        ) : null}
        {torrent.error ? (
          <>
            <dt><T k={I18nKey.APPS$DOWNLOADS_ERROR} /></dt>
            <dd className="arco-downloads-detail__error">{torrent.error}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

function TrackersTab({ torrent }: { torrent: TorrentItem }) {
  return (
    <table className="arco-downloads-detail__table">
      <thead>
        <tr>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_TRACKER} /></th>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_STATUS} /></th>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_LAST_ANNOUNCE} /></th>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_SEEDS} /></th>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_LEECHERS} /></th>
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
  const { t } = useTranslation();
  if (torrent.peersList.length === 0) {
    return <EmptyState title={i18n.t(I18nKey.APPS$DOWNLOADS_NO_PEERS)}><T k={I18nKey.APPS$DOWNLOADS_CONNECTED_PEERS_WILL_APPEAR_HERE} /></EmptyState>;
  }
  return (
    <table className="arco-downloads-detail__table">
      <thead>
        <tr>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_ADDRESS} /></th>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_CLIENT} /></th>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_PROGRESS} /></th>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_DOWN_2} /></th>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_UP_2} /></th>
          <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_FLAGS} /></th>
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="arco-downloads-detail__files">
      {actionError ? <p className="arco-downloads-detail__error">{actionError}</p> : null}
      <table className="arco-downloads-detail__table">
        <thead>
          <tr>
            <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_NAME} /></th>
            <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_SIZE} /></th>
            <th scope="col"><T k={I18nKey.APPS$DOWNLOADS_PROGRESS} /></th>
            <th scope="col">Open</th>
            <th scope="col">Music</th>
          </tr>
        </thead>
        <tbody>
          {torrent.files.map((file) => (
            <tr key={file.id}>
              <td>{file.name}</td>
              <td>{file.size}</td>
              <td>{Math.round(file.progress * 100)}%</td>
              <td>
                <div className="arco-downloads-detail__file-actions">
                  <Button
                    variant="ghost"
                    disabled={busyId === file.id || file.progress < 1}
                    onClick={() =>
                      void run(file.id, () => openTorrentFileInDrive(torrent, file.name))
                    }
                  >
                    Drive
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busyId === file.id || !file.path}
                    onClick={() =>
                      void run(file.id, () => revealTorrentFileOnDisk(file.path!))
                    }
                  >
                    Disk
                  </Button>
                </div>
              </td>
              <td>
                <Button
                  variant="ghost"
                  disabled={
                    busyId === file.id ||
                    file.progress < 1 ||
                    !/\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(file.name)
                  }
                  onClick={() =>
                    void run(file.id, () => addTorrentFileToMusic(torrent, file.name))
                  }
                >
                  Add
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatisticsTab({ torrent }: { torrent: TorrentItem }) {
  return (
    <dl className="arco-downloads-detail__grid">
      <dt><T k={I18nKey.APPS$DOWNLOADS_RATIO} /></dt>
      <dd>{torrent.ratio.toFixed(2)}</dd>
      <dt><T k={I18nKey.APPS$DOWNLOADS_WASTED} /></dt>
      <dd>{torrent.wasted}</dd>
      <dt><T k={I18nKey.APPS$DOWNLOADS_MAX_PEERS} /></dt>
      <dd>{torrent.maxPeers}</dd>
      <dt><T k={I18nKey.APPS$DOWNLOADS_DOWNLOAD_LIMIT} /></dt>
      <dd>{torrent.downLimit}</dd>
      <dt><T k={I18nKey.APPS$DOWNLOADS_UPLOAD_LIMIT} /></dt>
      <dd>{torrent.upLimit}</dd>
      <dt><T k={I18nKey.APPS$DOWNLOADS_TRACKER_UPDATE} /></dt>
      <dd>{torrent.trackerUpdate}</dd>
    </dl>
  );
}

export function TorrentDetailPane({ torrent, tab, onTabChange }: TorrentDetailPaneProps) {
  const { t } = useTranslation();
  return (
    <section className="arco-downloads-detail" aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_TORRENT_INSPECTOR)}>
      <div className="arco-downloads-detail__tabs" role="tablist" aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_TORRENT_DETAIL)}>
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
          <EmptyState title={i18n.t(I18nKey.APPS$DOWNLOADS_NO_SELECTION)}><T k={I18nKey.APPS$DOWNLOADS_SELECT_A_TORRENT_TO_INSPECT_DETAILS} /></EmptyState>
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
