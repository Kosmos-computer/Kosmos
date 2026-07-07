import {
  Heart,
  List,
  Maximize2,
  Mic,
  Monitor,
  PanelRight,
  Pause,
  Play,
  Plus,
  Repeat,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";
import { AlbumArt } from "./AlbumArt";
import { MusicProgressScrubber } from "./MusicProgressScrubber";
import { ListItem, NavSidebar, NavSidebarSectionHeader } from "../../components/patterns";
import type {
  MusicContentFilter,
  MusicFeaturedCard,
  MusicLibraryFilter,
  MusicLibraryItem,
  MusicMixCard,
  MusicNowPlaying,
  MusicQuickAccess,
} from "./types";
import type { MusicViewModel } from "./useMusicStub";

const LIBRARY_FILTERS: { id: MusicLibraryFilter; label: string }[] = [
  { id: "playlists", label: "Playlists" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
  { id: "podcasts", label: "Podcasts" },
];

const CONTENT_FILTERS: { id: MusicContentFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "podcasts", label: "Podcasts" },
  { id: "audiobooks", label: "Audiobooks" },
];

export interface MusicLibrarySidebarProps {
  items: MusicLibraryItem[];
  activeItemId?: string;
  onSelectItem: (id: string) => void;
  libraryFilter: MusicLibraryFilter;
  onLibraryFilterChange: (filter: MusicLibraryFilter) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function MusicLibrarySidebar({
  items,
  activeItemId,
  onSelectItem,
  libraryFilter,
  onLibraryFilterChange,
  searchQuery,
  onSearchChange,
}: MusicLibrarySidebarProps) {
  const filteredItems = items.filter((item) => {
    if (libraryFilter === "playlists") return item.kind === "playlist";
    if (libraryFilter === "artists") return item.kind === "artist";
    if (libraryFilter === "albums") return item.kind === "album";
    return item.kind === "podcast";
  });

  return (
    <aside className="arco-music__library" aria-label="Your Library">
      <NavSidebar
        className="arco-music-library-nav"
        header={
          <>
            <div className="arco-music-library-nav__header">
              <h2 className="arco-music-library-nav__title">Your Library</h2>
              <div className="arco-music-library-nav__header-actions">
                <button type="button" className="arco-music__icon-btn" aria-label="Create">
                  <Plus size={18} />
                </button>
                <button type="button" className="arco-music__icon-btn" aria-label="Expand library">
                  <PanelRight size={18} />
                </button>
              </div>
            </div>

            <label className="arco-music-library-nav__search">
              <Search size={16} aria-hidden="true" />
              <input
                className="arco-music-library-nav__search-input"
                type="search"
                placeholder="What do you want to play?"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                aria-label="Search library"
              />
            </label>
          </>
        }
        sections={[]}
        scrollContent={
          <div className="arco-nav-sidebar__sections">
            <div>
              <NavSidebarSectionHeader title="Browse" />
              <div className="arco-nav-sidebar__section-items">
                {LIBRARY_FILTERS.map((filter) => (
                  <ListItem
                    key={filter.id}
                    className="arco-nav-sidebar__nav-item"
                    label={filter.label}
                    active={libraryFilter === filter.id}
                    onClick={() => onLibraryFilterChange(filter.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <NavSidebarSectionHeader title="Library" />
              <div className="arco-nav-sidebar__section-items">
                {filteredItems.map((item) => (
                  <ListItem
                    key={item.id}
                    className="arco-nav-sidebar__nav-item"
                    leading={
                      <AlbumArt
                        trackId={item.coverTrackId ?? item.id}
                        tone={item.imageTone}
                        size="sm"
                        alt={item.title}
                      />
                    }
                    label={item.title}
                    description={item.subtitle}
                    active={activeItemId === item.id}
                    onClick={() => onSelectItem(item.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        }
      />
    </aside>
  );
}

export interface MusicHomeContentProps {
  userName: string;
  quickAccess: MusicQuickAccess[];
  featured: MusicFeaturedCard;
  mixes: MusicMixCard[];
  contentFilter: MusicContentFilter;
  onContentFilterChange: (filter: MusicContentFilter) => void;
  onPlayFeatured: () => void;
  onPlayTrack: (trackId: string) => void;
}

export function MusicHomeContent({
  userName,
  quickAccess,
  featured,
  mixes,
  contentFilter,
  onContentFilterChange,
  onPlayFeatured,
  onPlayTrack,
}: MusicHomeContentProps) {
  return (
    <main className="arco-music__main">
      <div className="arco-music__main-scroll arco-music__scrollable">
        <div className="arco-music__content-filters">
          {CONTENT_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`arco-music__filter-chip${contentFilter === filter.id ? " arco-music__filter-chip--active" : ""}`}
              onClick={() => onContentFilterChange(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="arco-music__quick-grid">
          {quickAccess.map((item) => (
            <button
              key={item.id}
              type="button"
              className="arco-music__quick-card"
              onClick={() => onPlayTrack(item.id)}
            >
              <AlbumArt trackId={item.id} tone={item.imageTone} size="md" alt={item.title} />
              <span className="arco-music__quick-card-title">{item.title}</span>
            </button>
          ))}
        </div>

        <section className="arco-music__section" aria-labelledby="featured-heading">
          <div className="arco-music__section-header">
            <h2 id="featured-heading" className="arco-music__section-title">
              {featured.sectionTitle}
            </h2>
          </div>
          <article className="arco-music__featured-card">
            <AlbumArt trackId={featured.id} tone={featured.imageTone} size="lg" alt={featured.title} />
            <div className="arco-music__featured-meta">
              <p className="arco-music__featured-label">{featured.label}</p>
              <h3 className="arco-music__featured-title">{featured.title}</h3>
              <p className="arco-music__featured-description">{featured.description}</p>
              <div className="arco-music__featured-actions">
                <button
                  type="button"
                  className="arco-music__play-btn"
                  aria-label={`Play ${featured.title}`}
                  onClick={onPlayFeatured}
                >
                  <Play size={22} />
                </button>
                <button type="button" className="arco-music__add-btn" aria-label={`Save ${featured.title}`}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </article>
        </section>

        <section className="arco-music__section" aria-labelledby="mixes-heading">
          <div className="arco-music__section-header">
            <h2 id="mixes-heading" className="arco-music__section-title">
              Made For {userName}
            </h2>
          </div>
          <div className="arco-music__mix-row">
            {mixes.map((mix) => (
              <button
                key={mix.id}
                type="button"
                className="arco-music__mix-card"
                onClick={() => onPlayTrack(mix.id)}
              >
                <div className="arco-music__mix-art-wrap">
                  <AlbumArt trackId={mix.id} tone={mix.imageTone} size="full" alt={mix.title} />
                  <span className="arco-music__mix-play" aria-hidden="true">
                    <Play size={18} />
                  </span>
                </div>
                <p className="arco-music__mix-number">Daily Mix {mix.number}</p>
                <h3 className="arco-music__mix-title">{mix.title}</h3>
                <p className="arco-music__mix-artists">{mix.artists.join(", ")}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export interface MusicNowPlayingPanelProps {
  nowPlaying: MusicNowPlaying;
  onPlayTrack: (trackId: string) => void;
}

export function MusicNowPlayingPanel({ nowPlaying, onPlayTrack }: MusicNowPlayingPanelProps) {
  const { track, queueTitle, relatedVideos } = nowPlaying;

  return (
    <aside className="arco-music__now-playing" aria-label="Now playing">
      <div className="arco-music__now-playing-header">{queueTitle ?? track.title}</div>
      <div className="arco-music__now-playing-scroll arco-music__scrollable">
        <div className="arco-music__now-playing-art">
          <AlbumArt trackId={track.id} tone={track.albumArtTone} size="full" alt={track.title} />
          {track.hasVideo ? (
            <button type="button" className="arco-music__video-switch">
              Switch to video
            </button>
          ) : null}
        </div>

        <div className="arco-music__now-playing-track">
          <div>
            <h2 className="arco-music__now-playing-title">{track.title}</h2>
            <p className="arco-music__now-playing-artists">{track.artists}</p>
          </div>
          <button type="button" className="arco-music__add-btn" aria-label={`Save ${track.title}`}>
            <Plus size={18} />
          </button>
        </div>

        <section aria-labelledby="related-videos-heading">
          <h3 id="related-videos-heading" className="arco-music__related-title">
            Related music videos
          </h3>
          <div className="arco-music__related-list">
            {relatedVideos.map((video) => (
              <button
                key={video.id}
                type="button"
                className="arco-music__related-item"
                onClick={() => onPlayTrack(video.id)}
              >
                <AlbumArt trackId={video.id} tone={video.imageTone} size="sm" alt={video.title} />
                <span className="arco-music__related-meta">
                  <span className="arco-music__related-item-title">{video.title}</span>
                  <span className="arco-music__related-item-artists">{video.artists}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export interface MusicPlayerBarProps {
  vm: MusicViewModel;
}

export function MusicPlayerBar({ vm }: MusicPlayerBarProps) {
  const { track, progress, elapsed } = vm.nowPlaying;

  return (
    <footer className="arco-music__player-bar" aria-label="Playback controls">
      <div className="arco-music__player-track">
        <AlbumArt trackId={track.id} tone={track.albumArtTone} size="sm" alt={track.title} />
        <div className="arco-music__player-track-meta">
          <span className="arco-music__player-track-title">{track.title}</span>
          <span className="arco-music__player-track-artists">{track.artists}</span>
          {track.hasVideo ? <span className="arco-music__video-tag">Music video</span> : null}
        </div>
        <button type="button" className="arco-music__icon-btn" aria-label="Save track">
          <Heart size={16} />
        </button>
      </div>

      <div className="arco-music__player-controls">
        <div className="arco-music__control-row">
          <button type="button" className="arco-music__control-btn" aria-label="Shuffle">
            <Shuffle size={16} />
          </button>
          <button type="button" className="arco-music__control-btn" aria-label="Previous" onClick={vm.playPrevious}>
            <SkipBack size={18} />
          </button>
          <button
            type="button"
            className="arco-music__play-pause-btn"
            aria-label={vm.playing ? "Pause" : "Play"}
            onClick={vm.togglePlay}
          >
            {vm.playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button type="button" className="arco-music__control-btn" aria-label="Next" onClick={vm.playNext}>
            <SkipForward size={18} />
          </button>
          <button type="button" className="arco-music__control-btn arco-music__control-btn--active" aria-label="Repeat">
            <Repeat size={16} />
          </button>
        </div>
        <MusicProgressScrubber
          progress={progress}
          elapsed={elapsed}
          duration={track.duration}
          onSeek={vm.seekPlayback}
        />
      </div>

      <div className="arco-music__player-extras">
        <button type="button" className="arco-music__icon-btn" aria-label="Now playing view">
          <PanelRight size={16} />
        </button>
        <button type="button" className="arco-music__icon-btn" aria-label="Lyrics">
          <Mic size={16} />
        </button>
        <button type="button" className="arco-music__icon-btn" aria-label="Queue">
          <List size={16} />
        </button>
        <button type="button" className="arco-music__icon-btn" aria-label="Connect to a device">
          <Monitor size={16} />
        </button>
        <div className="arco-music__volume-row">
          <Volume2 size={16} />
          <div className="arco-music__volume-track" aria-hidden="true">
            <span className="arco-music__volume-fill" />
          </div>
        </div>
        <button
          type="button"
          className="arco-music__icon-btn"
          aria-label="Mini player"
          onClick={vm.minimizeToWidget}
        >
          <Square size={14} />
        </button>
        <button type="button" className="arco-music__icon-btn" aria-label="Full screen">
          <Maximize2 size={16} />
        </button>
      </div>
    </footer>
  );
}
