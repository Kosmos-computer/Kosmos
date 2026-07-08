import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SidebarPane } from "../../components/patterns";
import { DownloadsSidebar } from "./DownloadsSidebar";
import { DownloadsToolbar } from "./DownloadsToolbar";
import { TorrentDetailPane } from "./TorrentDetailPane";
import { TorrentTable } from "./TorrentTable";
import type { DownloadsViewModel } from "./useDownloadsStub";

export interface DownloadsWorkspaceProps {
  vm: DownloadsViewModel;
}

export function DownloadsWorkspace({ vm }: DownloadsWorkspaceProps) {
  const splitRef = useRef<HTMLDivElement>(null);
  const [isResizingDetail, setIsResizingDetail] = useState(false);

  const onDetailResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const container = splitRef.current;
      if (!container) return;
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      const startY = event.clientY;
      const startHeight = vm.detailHeight;
      setIsResizingDetail(true);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const delta = startY - ev.clientY;
        const next = Math.min(420, Math.max(140, startHeight + delta));
        vm.setDetailHeight(next);
      };

      const onUp = (ev: PointerEvent) => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setIsResizingDetail(false);
        target.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [vm],
  );

  return (
    <div className="arco-downloads">
      <SidebarPane
        width={vm.sidebarWidth}
        onWidthChange={vm.setSidebarWidth}
        handleLabel={i18n.t(I18nKey.APPS$DOWNLOADS_RESIZE_DOWNLOADS_SIDEBAR)}
      >
        <DownloadsSidebar
          categories={vm.categories}
          category={vm.category}
          onCategoryChange={vm.setCategory}
          trackers={vm.trackers}
          trackerFilter={vm.trackerFilter}
          onTrackerFilterChange={vm.setTrackerFilter}
          searchQuery={vm.searchQuery}
          onSearchChange={vm.setSearchQuery}
        />
      </SidebarPane>

      <div className="arco-downloads__main">
        <DownloadsToolbar vm={vm} />

        <div
          className="arco-downloads__split"
          ref={splitRef}
          style={{ ["--arco-downloads-detail-h" as string]: `${vm.detailHeight}px` }}
        >
          <div className="arco-downloads__table-pane">
            <TorrentTable
              torrents={vm.torrents}
              selectedIds={vm.selectedIds}
              onSelect={vm.selectTorrent}
            />
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_RESIZE_DETAIL_PANE)}
            tabIndex={0}
            className={[
              "arco-downloads__split-handle",
              isResizingDetail ? "arco-downloads__split-handle--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onPointerDown={onDetailResizePointerDown}
          >
            <span className="arco-downloads__split-grip" aria-hidden="true" />
          </div>

          <div className="arco-downloads__detail-pane">
            <TorrentDetailPane
              torrent={vm.selectedTorrent}
              tab={vm.detailTab}
              onTabChange={vm.setDetailTab}
            />
          </div>
        </div>

        <footer className="arco-downloads__status-bar" aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_TRANSFER_STATUS)}>
          <span>{vm.globalStats.globalDownSpeed}<T k={I18nKey.APPS$DOWNLOADS_DOWN} /></span>
          <span aria-hidden="true">·</span>
          <span>{vm.globalStats.globalUpSpeed}<T k={I18nKey.APPS$DOWNLOADS_UP} /></span>
          <span aria-hidden="true">·</span>
          <span>{vm.allTorrents.length}<T k={I18nKey.APPS$DOWNLOADS_TORRENTS} /></span>
          <span className="arco-downloads__status-bar-spacer" aria-hidden="true" />
          <span>{vm.globalStats.freeSpace}<T k={I18nKey.APPS$DOWNLOADS_FREE} /></span>
          <span aria-hidden="true">·</span>
          <span>{vm.globalStats.clientVersion}</span>
        </footer>
      </div>
    </div>
  );
}
