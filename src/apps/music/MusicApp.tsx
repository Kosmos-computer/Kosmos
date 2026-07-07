import { EmptyState } from "../../components/ui";
import {
  MusicHomeContent,
  MusicLibrarySidebar,
  MusicNowPlayingPanel,
  MusicPlayerBar,
} from "./MusicParts";
import { useMusicStub } from "./useMusicStub";

export function MusicApp() {
  const vm = useMusicStub();

  if (vm.loading) {
    return (
      <div className="arco-music">
        <EmptyState title="Loading library…">Importing tirufm seed tracks</EmptyState>
      </div>
    );
  }

  if (vm.error || vm.tracks.length === 0) {
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
        <MusicLibrarySidebar
          items={vm.libraryItems}
          activeItemId={vm.activeLibraryItemId}
          onSelectItem={vm.setActiveLibraryItemId}
          libraryFilter={vm.libraryFilter}
          onLibraryFilterChange={vm.setLibraryFilter}
          searchQuery={vm.searchQuery}
          onSearchChange={vm.setSearchQuery}
        />

        <MusicHomeContent
          userName={vm.user.name}
          quickAccess={vm.quickAccess}
          featured={vm.featured}
          mixes={vm.mixes}
          contentFilter={vm.contentFilter}
          onContentFilterChange={vm.setContentFilter}
          onPlayFeatured={() => vm.playTrack(vm.featured.id, true)}
          onPlayTrack={(id) => vm.playTrack(id, true)}
        />

        <MusicNowPlayingPanel nowPlaying={vm.nowPlaying} onPlayTrack={(id) => vm.playTrack(id, true)} />
      </div>

      <MusicPlayerBar vm={vm} />
    </div>
  );
}
