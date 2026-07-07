import { EmptyState } from "../../components/ui";
import {
  MusicLibrarySidebar,
  MusicMainContent,
  MusicNowPlayingPanel,
  MusicPlayerBar,
} from "./MusicParts";
import { useMusicStub } from "./useMusicStub";

export function MusicApp() {
  const vm = useMusicStub();

  if (vm.loading) {
    return (
      <div className="arco-music">
        <EmptyState title="Loading library…">Importing tirufm seed tracks and broadcast feeds</EmptyState>
      </div>
    );
  }

  if ((vm.error || vm.tracks.length === 0) && vm.rssFeeds.length === 0) {
    return (
      <div className="arco-music">
        <EmptyState title="Music library unavailable">
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
