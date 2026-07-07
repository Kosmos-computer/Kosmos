import {
  Clock,
  Compass,
  ExternalLink,
  History,
  Home,
  Library,
  Pause,
  Play,
  Plus,
  Search,
  Tv,
  Volume2,
} from "lucide-react";
import { ConnectServiceModal } from "../../components/patterns/ConnectServiceModal";
import { ListItem, NavSidebar, NavSidebarSectionHeader } from "../../components/patterns";
import { Button, Chip, EmptyState } from "../../components/ui";
import { useConnectionStore } from "../../connections/useConnectionStore";
import type { VideoItem, VideoNavSection } from "./types";
import type { VideoViewModel } from "./useVideo";
import { VIDEO_CHANNELS } from "./videoCatalog";

const NAV_ITEMS: { id: VideoNavSection; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "subscriptions", label: "Subscriptions", icon: Tv },
  { id: "library", label: "Library", icon: Library },
  { id: "history", label: "History", icon: History },
];

function VideoThumbnail({ video }: { video: VideoItem }) {
  return (
    <div
      className={`arco-video__thumb arco-video__thumb--${video.artTone}`}
      aria-hidden="true"
    >
      <span className="arco-video__thumb-duration">{video.durationLabel}</span>
    </div>
  );
}

export interface VideoSidebarProps {
  vm: VideoViewModel;
  connectOpen: boolean;
  onOpenConnect: () => void;
  onCloseConnect: () => void;
}

export function VideoSidebar({ vm, connectOpen, onOpenConnect, onCloseConnect }: VideoSidebarProps) {
  const connections = useConnectionStore((s) => s.connections);
  const addConnection = useConnectionStore((s) => s.addConnection);
  const videoConnections = connections.filter((c) => c.domain === "video");

  return (
    <>
      <aside className="arco-video__sidebar" aria-label="Video navigation">
        <NavSidebar
          className="arco-video-sidebar-nav"
          header={
            <div className="arco-video-sidebar-nav__brand">
              <span className="arco-video-sidebar-nav__logo" aria-hidden="true">▶</span>
              <span>Video</span>
            </div>
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
                  {VIDEO_CHANNELS.map((channel) => {
                    const connected = videoConnections.some((c) => c.provider === channel.provider);
                    return (
                      <ListItem
                        key={channel.id}
                        className="arco-nav-sidebar__nav-item"
                        leading={
                          <span
                            className="arco-video__provider-badge"
                            style={{ ["--video-accent" as string]: channel.accent }}
                          >
                            {channel.initials}
                          </span>
                        }
                        label={channel.name}
                        description={connected ? "Connected" : "Not connected"}
                        active={vm.sourceFilter === "remote" && vm.activeProviderId === channel.provider}
                        onClick={() => {
                          vm.setSourceFilter("remote");
                          vm.setActiveProviderId(channel.provider);
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
        domain="video"
        existingConnections={connections}
        initialProvider={vm.activeProviderId}
        onConnect={(input) => {
          const connection = addConnection(input);
          if (input.token) vm.setConnectionToken(connection.id, input.token);
          void vm.refreshRemote(useConnectionStore.getState().connections);
        }}
        onSelectExisting={(connection) => {
          vm.setActiveConnectionId(connection.id);
          vm.setActiveProviderId(connection.provider as "youtube" | "vimeo");
          vm.setSourceFilter("remote");
          void vm.refreshRemote(useConnectionStore.getState().connections);
        }}
      />
    </>
  );
}

export interface VideoFeedProps {
  vm: VideoViewModel;
}

export function VideoFeed({ vm }: VideoFeedProps) {
  const active = vm.nowPlaying.video;
  const isRemote = vm.sourceFilter === "remote";
  const connection = useConnectionStore((s) =>
    s.connections.find((c) => c.domain === "video" && c.provider === vm.activeProviderId),
  );

  if (vm.loading) {
    return <EmptyState title="Loading videos…">Scanning your local library</EmptyState>;
  }

  if (isRemote && !connection) {
    return (
      <EmptyState title={`Connect ${vm.providerLabel}`}>
        Link your account to browse subscriptions and recommendations from {vm.providerLabel}.
      </EmptyState>
    );
  }

  if (vm.visibleVideos.length === 0) {
    return (
      <EmptyState title="No videos found">
        {vm.sourceFilter === "local"
          ? "Add MP4/MOV files to ~/Movies or set VIDEO_SEED_DIR."
          : `Connect ${vm.providerLabel} with a valid token to load remote videos.`}
      </EmptyState>
    );
  }

  return (
    <main className="arco-video__main">
      <header className="arco-video__toolbar">
        <label className="arco-video__search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search videos"
            value={vm.searchQuery}
            onChange={(event) => vm.setSearchQuery(event.target.value)}
            aria-label="Search videos"
          />
        </label>
        <div className="arco-video__source-tabs">
          <Chip
            className={vm.sourceFilter === "local" ? "arco-video__tab--active" : ""}
            onClick={() => vm.setSourceFilter("local")}
          >
            Local
          </Chip>
          <Chip
            className={vm.sourceFilter === "remote" ? "arco-video__tab--active" : ""}
            onClick={() => vm.setSourceFilter("remote")}
          >
            {vm.providerLabel}
          </Chip>
        </div>
      </header>

      <div className="arco-video__main-scroll arco-video__scrollable">
        {active.id && active.source === "local" ? (
          <section className="arco-video__player-section">
            <div className="arco-video__player-wrap">
              <video
                key={active.id}
                className="arco-video__player"
                src={active.streamSrc}
                controls={false}
                playsInline
                aria-label={active.title}
              />
            </div>
            <div className="arco-video__player-meta">
              <h1>{active.title}</h1>
              <p>
                {active.channel}
                {active.viewCount ? ` · ${active.viewCount}` : null}
                {active.publishedAt ? ` · ${active.publishedAt}` : null}
              </p>
            </div>
          </section>
        ) : null}

        {active.source === "remote" && active.watchUrl ? (
          <section className="arco-video__remote-banner">
            <EmptyState title={active.title}>
              Remote playback opens in {vm.providerLabel}. Select a video below or open the watch page.
            </EmptyState>
            <Button variant="primary" onClick={() => window.open(active.watchUrl, "_blank", "noopener,noreferrer")}>
              <ExternalLink size={16} /> Watch on {vm.providerLabel}
            </Button>
          </section>
        ) : null}

        <section className="arco-video__section">
          <h2 className="arco-video__section-title">
            {vm.navSection === "home" ? "Recommended" : NAV_ITEMS.find((n) => n.id === vm.navSection)?.label}
          </h2>
          <div className="arco-video__grid">
            {vm.visibleVideos.map((video) => (
              <button
                key={video.id}
                type="button"
                className={`arco-video__card${vm.activeVideoId === video.id ? " arco-video__card--active" : ""}`}
                onClick={() => vm.playVideo(video.id)}
              >
                <VideoThumbnail video={video} />
                <div className="arco-video__card-body">
                  <h3>{video.title}</h3>
                  <p>
                    {video.channel}
                    {video.viewCount ? ` · ${video.viewCount}` : null}
                  </p>
                  {video.publishedAt ? (
                    <span className="arco-video__card-meta">
                      <Clock size={12} /> {video.publishedAt}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export interface VideoPlayerBarProps {
  vm: VideoViewModel;
}

export function VideoPlayerBar({ vm }: VideoPlayerBarProps) {
  const { video } = vm.nowPlaying;
  if (!video.id || video.source === "remote") return null;

  return (
    <footer className="arco-video__player-bar" aria-label="Video controls">
      <div className="arco-video__player-bar-track">
        <VideoThumbnail video={video} />
        <div>
          <strong>{video.title}</strong>
          <span>{video.channel}</span>
        </div>
      </div>
      <div className="arco-video__player-bar-controls">
        <button type="button" className="arco-video__icon-btn" onClick={() => vm.togglePlay()} aria-label={vm.playing ? "Pause" : "Play"}>
          {vm.playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>
      <div className="arco-video__player-bar-extra">
        <button type="button" className="arco-video__icon-btn" aria-label="Volume">
          <Volume2 size={18} />
        </button>
      </div>
    </footer>
  );
}
