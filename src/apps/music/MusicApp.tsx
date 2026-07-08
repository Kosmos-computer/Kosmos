import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { EmptyState } from "../../components/ui";
import { useTranslation } from "react-i18next";
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

  if (vm.loading) {
    return (
      <div className="arco-music">
        <EmptyState title={i18n.t(I18nKey.OS_BENTO_LOADING_LIBRARY)}><T k={I18nKey.APPS$MUSIC_IMPORTING_TIRUFM_SEED_TRACKS_AND_BROADCAST_FEEDS} /></EmptyState>
      </div>
    );
  }

  if ((vm.error || vm.tracks.length === 0) && vm.rssFeeds.length === 0) {
    return (
      <div className="arco-music">
        <EmptyState title={i18n.t(I18nKey.APPS$MUSIC_MUSIC_LIBRARY_UNAVAILABLE)}>
          {vm.error ??
            "No seed tracks found. Check that MP3s exist in ~/Music/.../tirufm/Unknown Album or set MUSIC_SEED_DIR."}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="arco-music">
      <div className="arco-music__body">
        <MusicLibrarySidebar vm={vm} />
        <MusicMainContent vm={vm} />
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
