import {
  Bell,
  Heart,
  Home,
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
  Users,
  Volume2,
} from "lucide-react";
import { AlbumArt } from "./AlbumArt";
import type {
  MusicContentFilter,
  MusicFeaturedCard,
  MusicLibraryFilter,
  MusicLibraryItem,
  MusicMixCard,
  MusicNowPlaying,
  MusicQuickAccess,
  MusicUser,
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

export interface MusicTopBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  user: MusicUser;
}

export function MusicTopBar({ searchQuery, onSearchChange, user }: MusicTopBarProps) {
  return (
    <header className="arco-music__top-bar">
      <div className="arco-music__nav-cluster">
        <button type="button" className="arco-music__nav-btn" aria-label="Home">
          <Home size={18} />
        </button>

        <label className="arco-music__search">
          <Search size={18} />
          <input
            className="arco-music__search-input"
            type="search"
            placeholder="What do you want to play?"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>

      <div className="arco-music__top-actions">
        <button type="button" className="arco-music__premium-btn">
          Explore Premium
        </button>
        <button type="button" className="arco-music__install-btn">
          Install App
        </button>
        <button type="button" className="arco-music__icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button type="button" className="arco-music__icon-btn" aria-label="Friends activity">
          <Users size={18} />
        </button>
        <button type="button" className="arco-music__profile-btn" aria-label={user.name}>
          {user.name
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </button>
      </div>
    </header>
  );
}

export interface MusicLibrarySidebarProps {
  items: MusicLibraryItem[];
  activeItemId?: string;
  onSelectItem: (id: string) => void;
  libraryFilter: MusicLibraryFilter;
  onLibraryFilterChange: (filter: MusicLibraryFilter) => void;
}

export function MusicLibrarySidebar({
  items,
  activeItemId,
  onSelectItem,
  libraryFilter,
  onLibraryFilterChange,
}: MusicLibrarySidebarProps) {
  const filteredItems = items.filter((item) => {
    if (libraryFilter === "playlists") return item.kind === "playlist";
    if (libraryFilter === "artists") return item.kind === "artist";
    if (libraryFilter === "albums") return item.kind === "album";
    return item.kind === "podcast";
  });

  return (
    <aside className="arco-music__library" aria-label="Your Library">
      <div className="arco-music__library-header">
        <h2 className="arco-music__library-title">Your Library</h2>
        <div className="arco-music__library-header-actions">
          <button type="button" className="arco-music__icon-btn" aria-label="Create">
            <Plus size={18} />
          </button>
          <button type="button" className="arco-music__icon-btn" aria-label="Expand library">
            <PanelRight size={18} />
          </button>
        </div>
      </div>

      <div className="arco-music__library-filters">
        {LIBRARY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`arco-music__filter-chip${libraryFilter === filter.id ? " arco-music__filter-chip--active" : ""}`}
            onClick={() => onLibraryFilterChange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="arco-music__library-toolbar">
        <button type="button" className="arco-music__icon-btn" aria-label="Search library">
          <Search size={16} />
        </button>
        <button type="button" className="arco-music__library-sort">
          Recents
          <List size={14} />
        </button>
      </div>

      <div className="arco-music__library-list arco-music__scrollable">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`arco-music__library-item${activeItemId === item.id ? " arco-music__library-item--active" : ""}`}
            onClick={() => onSelectItem(item.id)}
          >
            <AlbumArt
              trackId={item.coverTrackId ?? item.id}
              tone={item.imageTone}
              size="sm"
              alt={item.title}
            />
            <span className="arco-music__library-item-meta">
              <span className="arco-music__library-item-title">{item.title}</span>
              <span className="arco-music__library-item-subtitle">{item.subtitle}</span>
            </span>
          </button>
        ))}
      </div>
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
        <div className="arco-music__progress-row">
          <span className="arco-music__time-label">{elapsed}</span>
          <div className="arco-music__progress-track" aria-hidden="true">
            <span className="arco-music__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="arco-music__time-label">{track.duration}</span>
        </div>
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
