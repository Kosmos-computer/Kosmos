import {
  BookOpen,
  Download,
  ExternalLink,
  Headphones,
  Home,
  Library,
  Pause,
  Play,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { ConnectServiceModal } from "../../components/patterns/ConnectServiceModal";
import { ListItem, NavSidebar, NavSidebarSectionHeader } from "../../components/patterns";
import { Chip, EmptyState } from "../../components/ui";
import { useConnectionStore } from "../../connections/useConnectionStore";
import { MusicProgressScrubber } from "../music/MusicProgressScrubber";
import { PodcastCover } from "./PodcastCover";
import { podcastRssFeedSeedSummary } from "@shared/podcastFeeds";
import { PODCAST_PROVIDERS, isPlayableEpisode } from "./podcastCatalog";
import type { PodcastContentFilter, PodcastEpisode, PodcastNavSection } from "./types";
import type { PodcastViewModel } from "./usePodcast";

const NAV_ITEMS: { id: PodcastNavSection; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "browse", label: "Browse", icon: BookOpen },
  { id: "library", label: "Library", icon: Library },
  { id: "downloads", label: "Downloads", icon: Download },
];

const CONTENT_FILTERS: { id: PodcastContentFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "podcasts", label: "Podcasts" },
  { id: "audiobooks", label: "Audiobooks" },
];

export interface PodcastSidebarProps {
  vm: PodcastViewModel;
  connectOpen: boolean;
  onOpenConnect: () => void;
  onCloseConnect: () => void;
}

export function PodcastSidebar({ vm, connectOpen, onOpenConnect, onCloseConnect }: PodcastSidebarProps) {
  const connections = useConnectionStore((s) => s.connections);
  const addConnection = useConnectionStore((s) => s.addConnection);
  const podcastConnections = connections.filter((c) => c.domain === "podcast");

  return (
    <>
      <aside className="arco-podcast__library" aria-label="Podcasts and audiobooks">
        <NavSidebar
          className="arco-podcast-library-nav"
          header={
            <>
              <div className="arco-podcast-library-nav__header">
                <Headphones size={20} aria-hidden="true" />
                <h2 className="arco-podcast-library-nav__title">Listen</h2>
              </div>
              <label className="arco-podcast-library-nav__search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search shows and episodes"
                  value={vm.searchQuery}
                  onChange={(event) => vm.setSearchQuery(event.target.value)}
                  aria-label="Search podcasts"
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
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <ListItem
                        key={item.id}
                        className="arco-nav-sidebar__nav-item"
                        leading={<Icon size={18} />}
                        label={item.label}
                        active={vm.navSection === item.id}
                        onClick={() => vm.setNavSection(item.id)}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <NavSidebarSectionHeader title="Sources" />
                <div className="arco-nav-sidebar__section-items">
                  <ListItem
                    className="arco-nav-sidebar__nav-item"
                    label="Local library"
                    active={vm.sourceFilter === "local"}
                    onClick={() => vm.setSourceFilter("local")}
                  />
                  <ListItem
                    className="arco-nav-sidebar__nav-item"
                    label="RSS feeds"
                    description={podcastRssFeedSeedSummary()}
                    active={vm.sourceFilter === "rss"}
                    onClick={() => vm.setSourceFilter("rss")}
                  />
                  {PODCAST_PROVIDERS.map((provider) => {
                    const connected = podcastConnections.some((c) => c.provider === provider.id);
                    return (
                      <ListItem
                        key={provider.id}
                        className="arco-nav-sidebar__nav-item"
                        leading={
                          <span
                            className="arco-podcast__provider-badge"
                            style={{ ["--podcast-accent" as string]: provider.accent }}
                          >
                            {provider.initials}
                          </span>
                        }
                        label={provider.label}
                        description={connected ? "Connected" : "Not connected"}
                        active={vm.sourceFilter === "remote" && vm.activeProviderId === provider.id}
                        onClick={() => {
                          vm.setSourceFilter("remote");
                          vm.setActiveProviderId(provider.id);
                        }}
                      />
                    );
                  })}
                  <ListItem
                    className="arco-nav-sidebar__nav-item"
                    leading={<Plus size={16} />}
                    label="Connect account"
                    onClick={onOpenConnect}
                  />
                </div>
              </div>
            </div>
          }
        />
      </aside>

      <ConnectServiceModal
        open={connectOpen}
        onClose={onCloseConnect}
        domain="podcast"
        existingConnections={connections}
        initialProvider={vm.activeProviderId}
        onConnect={(input) => {
          const connection = addConnection(input);
          if (input.token) vm.setConnectionToken(connection.id, input.token);
          void vm.refreshRemote(useConnectionStore.getState().connections);
        }}
        onSelectExisting={(connection) => {
          vm.setActiveProviderId(connection.provider as "spotify" | "apple-podcasts" | "audible");
          vm.setSourceFilter("remote");
          void vm.refreshRemote(useConnectionStore.getState().connections);
        }}
      />
    </>
  );
}

function EpisodeRow({ episode, active, onPlay }: { episode: PodcastEpisode; active: boolean; onPlay: () => void }) {
  return (
    <button
      type="button"
      className={`arco-podcast__episode-row${active ? " arco-podcast__episode-row--active" : ""}`}
      onClick={onPlay}
    >
      <PodcastCover
        episodeId={episode.id}
        tone={episode.artTone}
        coverUrl={episode.coverUrl}
        size="sm"
        alt={episode.title}
      />
      <div className="arco-podcast__episode-meta">
        <strong>{episode.title}</strong>
        <span>
          {episode.showTitle} · {episode.host}
        </span>
      </div>
      <span className="arco-podcast__episode-duration">{episode.durationLabel}</span>
      {episode.kind === "audiobook" ? (
        <span className="arco-podcast__episode-tag">Audiobook</span>
      ) : null}
    </button>
  );
}

export interface PodcastHomeContentProps {
  vm: PodcastViewModel;
}

export function PodcastHomeContent({ vm }: PodcastHomeContentProps) {
  const connection = useConnectionStore((s) =>
    s.connections.find((c) => c.domain === "podcast" && c.provider === vm.activeProviderId),
  );

  if (vm.loading) {
    return <EmptyState title="Loading library…">Importing local episodes and RSS feeds</EmptyState>;
  }

  if (vm.sourceFilter === "remote" && !connection) {
    return (
      <EmptyState title={`Connect ${vm.providerLabel}`}>
        Link your account to sync subscribed shows and continue listening across devices.
      </EmptyState>
    );
  }

  if (vm.visibleEpisodes.length === 0) {
    return (
      <EmptyState title="Nothing to play">
        {vm.sourceFilter === "local"
          ? "Add audio to ~/Music/Podcasts or use tirufm seed episodes. Set PODCAST_SEED_DIR to override."
          : vm.sourceFilter === "rss"
            ? "RSS feeds could not be loaded. Check your network connection or set PODCAST_RSS_FEEDS on the server."
            : `Connect ${vm.providerLabel} with a valid token to load remote episodes.`}
      </EmptyState>
    );
  }

  return (
    <main className="arco-podcast__main">
      <div className="arco-podcast__main-scroll arco-podcast__scrollable">
        <div className="arco-podcast__content-filters">
          {CONTENT_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`arco-podcast__filter-chip${vm.contentFilter === filter.id ? " arco-podcast__filter-chip--active" : ""}`}
              onClick={() => vm.setContentFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
          <div className="arco-podcast__source-tabs">
            <Chip
              className={vm.sourceFilter === "local" ? "arco-podcast__tab--active" : ""}
              onClick={() => vm.setSourceFilter("local")}
            >
              Local
            </Chip>
            <Chip
              className={vm.sourceFilter === "rss" ? "arco-podcast__tab--active" : ""}
              onClick={() => vm.setSourceFilter("rss")}
            >
              RSS
            </Chip>
            <Chip
              className={vm.sourceFilter === "remote" ? "arco-podcast__tab--active" : ""}
              onClick={() => vm.setSourceFilter("remote")}
            >
              {vm.providerLabel}
            </Chip>
          </div>
        </div>

        {vm.continueListening ? (
          <section className="arco-podcast__featured">
            <PodcastCover
              episodeId={vm.continueListening.id}
              tone={vm.continueListening.artTone}
              coverUrl={vm.continueListening.coverUrl}
              size="lg"
              alt={vm.continueListening.title}
            />
            <div className="arco-podcast__featured-copy">
              <span className="arco-podcast__featured-label">Continue listening</span>
              <h1>{vm.continueListening.title}</h1>
              <p>
                {vm.continueListening.showTitle} · {vm.continueListening.host}
              </p>
              <button
                type="button"
                className="arco-podcast__play-btn"
                onClick={() => vm.playEpisode(vm.continueListening!.id, true)}
              >
                <Play size={18} /> Play
              </button>
            </div>
          </section>
        ) : null}

        <section className="arco-podcast__section">
          <h2 className="arco-podcast__section-title">Your shows</h2>
          <div className="arco-podcast__show-grid">
            {vm.shows.map((show) => (
              <article key={show.id} className="arco-podcast__show-card">
                <PodcastCover
                  episodeId={vm.visibleEpisodes.find((e) => e.showTitle === show.title)?.id ?? ""}
                  tone={show.artTone}
                  coverUrl={vm.visibleEpisodes.find((e) => e.showTitle === show.title)?.coverUrl}
                  size="md"
                  alt={show.title}
                />
                <h3>{show.title}</h3>
                <p>
                  {show.host} · {show.episodeCount} episodes
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="arco-podcast__section">
          <h2 className="arco-podcast__section-title">Episodes</h2>
          <div className="arco-podcast__episode-list">
            {vm.visibleEpisodes.map((episode) => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                active={vm.activeEpisodeId === episode.id}
                onPlay={() => vm.playEpisode(episode.id, isPlayableEpisode(episode))}
              />
            ))}
          </div>
        </section>

        {vm.sourceFilter === "remote" && vm.nowPlaying.episode.listenUrl ? (
          <section className="arco-podcast__remote-hint">
            <button
              type="button"
              className="arco-podcast__remote-link"
              onClick={() => window.open(vm.nowPlaying.episode.listenUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink size={14} /> Open in {vm.providerLabel}
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export interface PodcastPlayerBarProps {
  vm: PodcastViewModel;
}

export function PodcastPlayerBar({ vm }: PodcastPlayerBarProps) {
  const { episode } = vm.nowPlaying;
  if (!episode.id || !isPlayableEpisode(episode)) return null;

  return (
    <footer className="arco-podcast__player-bar" aria-label="Playback controls">
      <div className="arco-podcast__player-track">
        <PodcastCover episodeId={episode.id} tone={episode.artTone} coverUrl={episode.coverUrl} size="sm" alt={episode.title} />
        <div>
          <strong>{episode.title}</strong>
          <span>{episode.showTitle}</span>
        </div>
      </div>

      <div className="arco-podcast__player-controls">
        <button type="button" className="arco-podcast__icon-btn" onClick={() => vm.playPrevious()} aria-label="Previous">
          <SkipBack size={18} />
        </button>
        <button type="button" className="arco-podcast__icon-btn arco-podcast__icon-btn--primary" onClick={() => vm.togglePlay()} aria-label={vm.playing ? "Pause" : "Play"}>
          {vm.playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button type="button" className="arco-podcast__icon-btn" onClick={() => vm.playNext()} aria-label="Next">
          <SkipForward size={18} />
        </button>
      </div>

      <div className="arco-podcast__player-progress">
        <MusicProgressScrubber
          progress={vm.nowPlaying.progress}
          elapsed={vm.nowPlaying.elapsed}
          duration={vm.nowPlaying.duration}
          onSeek={vm.seekPlayback}
        />
      </div>

      <div className="arco-podcast__player-extra">
        <button type="button" className="arco-podcast__icon-btn" aria-label="Volume">
          <Volume2 size={18} />
        </button>
      </div>
    </footer>
  );
}
