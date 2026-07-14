import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { EmptyState } from "../../components/ui";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import {
  MusicLibrarySidebar,
  MusicMainContent,
  MusicNowPlayingPanel,
  MusicPlayerBar,
} from "./MusicParts";
import { useMusicStub } from "./useMusicStub";

export function MusicApp() {
  const { t } = useTranslation();
  const vm = useMusicStub();

  useEffect(() => {
    void vm.refreshLibrary();
  }, [vm.refreshLibrary]);

  if (vm.loading) {
    return (
      <div className="arco-music">
        <EmptyState title={i18n.t(I18nKey.OS_BENTO_LOADING_LIBRARY)}><T k={I18nKey.APPS$MUSIC_IMPORTING_TIRUFM_SEED_TRACKS_AND_BROADCAST_FEEDS} /></EmptyState>
      </div>
    );
  }

  if (vm.error && vm.tracks.length === 0 && vm.rssFeeds.length === 0) {
    return (
      <div className="arco-music">
        <div className="arco-music__body">
          <MusicLibrarySidebar vm={vm} />
          <EmptyState title={i18n.t(I18nKey.APPS$MUSIC_MUSIC_LIBRARY_UNAVAILABLE)}>
            {vm.error}
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="arco-music">
      <div className="arco-music__body">
        <MusicLibrarySidebar vm={vm} />
        {vm.tracks.length === 0 && vm.rssFeeds.length === 0 && !vm.selectedBroadcastFeed ? (
          <EmptyState title="Your library is empty">
            Use + to upload audio, or Import from Downloads after a torrent finishes.
          </EmptyState>
        ) : (
          <MusicMainContent vm={vm} />
        )}
        <MusicNowPlayingPanel
          nowPlaying={vm.nowPlaying}
          onPlayTrack={(id) => {
            vm.playTrack(id, true);
            if (id.startsWith("music-rss-")) vm.openSongDetail(id);
          }}
        />
      </div>
      <MusicPlayerBar vm={vm} />
    </div>
  );
}
