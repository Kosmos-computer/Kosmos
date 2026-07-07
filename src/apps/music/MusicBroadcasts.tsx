import { useState } from "react";
import {
  ChevronLeft,
  ExternalLink,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button, EmptyState, Input } from "../../components/ui";
import {
  BROADCAST_FEED_CATEGORIES,
  MUSIC_RSS_FEED_CATEGORY_LABELS,
  broadcastArtTone,
  filterBroadcastFeeds,
  groupedBroadcastFeeds,
  isPlayableBroadcastSong,
  missingAudioBroadcastFeeds,
} from "./musicBroadcastCatalog";
import {
  LIVE_STATION_CATEGORIES,
  MUSIC_LIVE_STATION_CATEGORY_LABELS,
  filterLiveStations,
  groupedLiveStations,
  liveStationArtTone,
} from "./musicLiveCatalog";
import { MusicBroadcastCover } from "./MusicBroadcastCover";
import { AlbumArt } from "./AlbumArt";
import type { MusicViewModel } from "./useMusicStub";
import type { MusicBroadcastSong } from "./types";
import type { MusicFeedSubscription, MusicRssFeedCategory } from "@shared/musicFeeds";
import type { MusicLiveStation, MusicLiveStationCategory } from "@shared/musicLiveStations";

type BroadcastFilter = "all" | "live" | MusicRssFeedCategory | MusicLiveStationCategory;

export interface MusicBroadcastsProps {
  vm: MusicViewModel;
}

function formatPublishedDate(publishedAt: string): string {
  const parsed = Date.parse(publishedAt);
  if (Number.isNaN(parsed)) return publishedAt;
  return new Date(parsed).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function SongRow({
  vm,
  song,
  onOpen,
}: {
  vm: MusicViewModel;
  song: MusicBroadcastSong;
  onOpen: () => void;
}) {
  const playable = isPlayableBroadcastSong(song);
  return (
    <div
      className={`arco-music__song-row${vm.activeTrackId === song.id ? " arco-music__song-row--active" : ""}`}
    >
      <button type="button" className="arco-music__song-open" onClick={onOpen}>
        <MusicBroadcastCover
          songId={song.id}
          tone={song.artTone}
          coverUrl={song.coverUrl}
          size="sm"
          alt={song.title}
        />
        <div className="arco-music__song-meta">
          <strong>{song.title}</strong>
          <span>
            {song.artists} · {song.feedLabel}
          </span>
        </div>
        <span className="arco-music__song-duration">{song.durationLabel}</span>
      </button>
      {playable ? (
        <button
          type="button"
          className="arco-music__icon-btn arco-music__song-play-btn"
          aria-label={`Play ${song.title}`}
          onClick={() => vm.playTrack(song.id, true)}
        >
          <Play size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function MusicSongDetail({ vm }: MusicBroadcastsProps) {
  const song = vm.activeBroadcastSong;
  if (!song) return null;

  const playable = isPlayableBroadcastSong(song);

  return (
    <main className="arco-music__main">
      <div className="arco-music__main-scroll arco-music__scrollable">
        <button
          type="button"
          className="arco-music__back-btn"
          onClick={() => vm.closeSongDetail()}
          aria-label="Back"
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
          Back
        </button>

        <section className="arco-music__broadcast-hero">
          <MusicBroadcastCover
            songId={song.id}
            tone={song.artTone}
            coverUrl={song.coverUrl}
            size="lg"
            alt={song.title}
          />
          <div className="arco-music__broadcast-hero-copy">
            <span className="arco-music__featured-label">Song</span>
            <h1>{song.title}</h1>
            <p>
              {song.artists} · {song.feedLabel}
              {song.durationLabel !== "—" ? ` · ${song.durationLabel}` : ""}
            </p>
            <div className="arco-music__broadcast-hero-actions">
              {playable ? (
                <button type="button" className="arco-music__play-btn" onClick={() => vm.playTrack(song.id, true)}>
                  <Play size={18} /> Play
                </button>
              ) : null}
              <a
                className="arco-music__link-btn"
                href={song.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} /> Read post
              </a>
            </div>
          </div>
        </section>

        <section className="arco-music__section">
          <h2 className="arco-music__section-title">About this track</h2>
          {song.summary ? (
            <p className="arco-music__broadcast-description">{song.summary}</p>
          ) : (
            <p className="arco-music__news-status">No description available for this track.</p>
          )}
          <p className="arco-music__broadcast-meta">
            Published {formatPublishedDate(song.publishedAt)} ·{" "}
            {MUSIC_RSS_FEED_CATEGORY_LABELS[song.category as MusicRssFeedCategory] ?? song.category}
          </p>
        </section>
      </div>
    </main>
  );
}

export function MusicBroadcastFeedDetail({ vm }: MusicBroadcastsProps) {
  const feed = vm.selectedBroadcastFeed;
  if (!feed) return null;

  const tone = broadcastArtTone(feed.label);
  const songs = vm.broadcastFeedSongs;
  const coverSong = songs[0];
  const latestPlayable = songs.find((song) => isPlayableBroadcastSong(song));

  return (
    <main className="arco-music__main">
      <div className="arco-music__main-scroll arco-music__scrollable">
        <button
          type="button"
          className="arco-music__back-btn"
          onClick={() => vm.closeBroadcastFeed()}
          aria-label="Back to broadcasts"
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
          Back
        </button>

        <section className="arco-music__broadcast-hero">
          <MusicBroadcastCover
            feedUrl={feed.url}
            tone={tone}
            coverUrl={coverSong?.coverUrl}
            size="lg"
            alt={feed.label}
          />
          <div className="arco-music__broadcast-hero-copy">
            <span className="arco-music__featured-label">Broadcast</span>
            <h1>{feed.label}</h1>
            <p>
              {feed.publisher}
              {songs.length > 0 ? ` · ${songs.length} song${songs.length === 1 ? "" : "s"}` : ""}
            </p>
            <p className="arco-music__broadcast-description">
              {MUSIC_RSS_FEED_CATEGORY_LABELS[feed.category]}
            </p>
            {latestPlayable ? (
              <button
                type="button"
                className="arco-music__play-btn"
                onClick={() => vm.playTrack(latestPlayable.id, true)}
              >
                <Play size={18} /> Play latest
              </button>
            ) : null}
          </div>
        </section>

        <section className="arco-music__section">
          <h2 className="arco-music__section-title">Songs</h2>
          {vm.broadcastFeedLoading && songs.length === 0 ? (
            <p className="arco-music__news-status">
              <Loader2 size={16} className="arco-music__spin" /> Loading songs…
            </p>
          ) : vm.broadcastFeedError && songs.length === 0 ? (
            <p className="arco-music__feed-error">{vm.broadcastFeedError}</p>
          ) : songs.length === 0 ? (
            <p className="arco-music__news-status">
              This feed has no audio enclosures (MP3). Most music blog RSS feeds are articles only — try NPR World
              Cafe or Internet Archive under Discovery &amp; curation.
            </p>
          ) : (
            <div className="arco-music__song-list">
              {songs.map((song) => (
                <SongRow key={song.id} vm={vm} song={song} onOpen={() => vm.openSongDetail(song.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function LiveStationCard({
  station,
  vm,
  active,
}: {
  station: MusicLiveStation;
  vm: MusicViewModel;
  active: boolean;
}) {
  const tone = liveStationArtTone(station.label);

  return (
    <article
      className={`arco-music__broadcast-card arco-music__broadcast-card--clickable${active ? " arco-music__broadcast-card--active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => vm.playLiveStation(station.id, true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          vm.playLiveStation(station.id, true);
        }
      }}
      aria-label={`Listen to ${station.label}`}
      aria-pressed={active}
    >
      <AlbumArt trackId={station.id} tone={tone} size="md" alt={station.label} />
      <div className="arco-music__broadcast-card-body">
        <h3>
          {station.label}
          <span className="arco-music__live-pill">Live</span>
        </h3>
        <p className="arco-music__broadcast-card-publisher">
          {station.publisher} · {station.location}
        </p>
        <p className="arco-music__broadcast-card-category">
          {MUSIC_LIVE_STATION_CATEGORY_LABELS[station.category]}
        </p>
        <p className="arco-music__broadcast-card-description">{station.description}</p>
      </div>
      <button
        type="button"
        className="arco-music__icon-btn arco-music__broadcast-play-btn"
        aria-label={`Play ${station.label}`}
        onClick={(event) => {
          event.stopPropagation();
          vm.playLiveStation(station.id, true);
        }}
      >
        <Play size={16} />
      </button>
    </article>
  );
}

function LiveStationSection({
  title,
  stations,
  vm,
  activeStationId,
}: {
  title: string;
  stations: MusicLiveStation[];
  vm: MusicViewModel;
  activeStationId?: string;
}) {
  return (
    <section className="arco-music__section">
      <h2 className="arco-music__section-title">{title}</h2>
      <div className="arco-music__broadcast-grid">
        {stations.map((station) => (
          <LiveStationCard
            key={station.id}
            station={station}
            vm={vm}
            active={activeStationId === station.id}
          />
        ))}
      </div>
    </section>
  );
}

function BroadcastCard({ feed, vm }: { feed: MusicFeedSubscription; vm: MusicViewModel }) {
  const tone = broadcastArtTone(feed.label);

  return (
    <article
      className="arco-music__broadcast-card arco-music__broadcast-card--clickable"
      role="button"
      tabIndex={0}
      onClick={() => void vm.openBroadcastFeed(feed)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void vm.openBroadcastFeed(feed);
        }
      }}
      aria-label={`Open ${feed.label}`}
    >
      <MusicBroadcastCover feedUrl={feed.url} tone={tone} size="md" alt={feed.label} />
      <div className="arco-music__broadcast-card-body">
        <h3>{feed.label}</h3>
        <p className="arco-music__broadcast-card-publisher">{feed.publisher}</p>
        <p className="arco-music__broadcast-card-category">
          {MUSIC_RSS_FEED_CATEGORY_LABELS[feed.category]}
        </p>
      </div>
    </article>
  );
}

function BroadcastSection({
  title,
  feeds,
  vm,
}: {
  title: string;
  feeds: MusicFeedSubscription[];
  vm: MusicViewModel;
}) {
  return (
    <section className="arco-music__section">
      <h2 className="arco-music__section-title">{title}</h2>
      <div className="arco-music__broadcast-grid">
        {feeds.map((feed) => (
          <BroadcastCard key={feed.id} feed={feed} vm={vm} />
        ))}
      </div>
    </section>
  );
}

function BroadcastFeedManager({ vm }: { vm: MusicViewModel }) {
  const [feedUrl, setFeedUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const needsPlayableFeeds = missingAudioBroadcastFeeds(vm.rssFeeds);

  const handleAdd = async () => {
    const url = feedUrl.trim();
    if (!url) return;
    setAddError(null);
    try {
      await vm.addRssFeed(url);
      setFeedUrl("");
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add feed");
    }
  };

  return (
    <section className="arco-music__section arco-music__feed-manager">
      <div className="arco-music__feed-manager-header">
        <h2 className="arco-music__section-title">Add RSS feed</h2>
        <Button
          variant="ghost"
          className="arco-music__refresh-btn"
          onClick={() => void vm.refreshRss()}
          disabled={vm.rssLoading}
        >
          <RefreshCw size={14} className={vm.rssLoading ? "arco-music__spin" : ""} />
          {vm.rssLoading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {needsPlayableFeeds ? (
        <div className="arco-music__feed-callout">
          <p>
            Most subscribed feeds are music news blogs without MP3 enclosures. Add playable podcast and archive
            feeds to hear songs.
          </p>
          <Button
            variant="primary"
            disabled={vm.feedsLoading}
            onClick={() => void vm.seedAudioBroadcasts()}
          >
            <Plus size={16} /> Add playable feeds
          </Button>
        </div>
      ) : null}
      <form
        className="arco-music__feed-add"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAdd();
        }}
      >
        <Input
          type="url"
          placeholder="Paste music blog RSS feed URL"
          value={feedUrl}
          onChange={(event) => setFeedUrl(event.target.value)}
          aria-label="Music RSS feed URL"
        />
        <Button variant="primary" type="submit" disabled={vm.feedsLoading || !feedUrl.trim()}>
          <Plus size={16} /> Add feed
        </Button>
      </form>
      {addError ? <p className="arco-music__feed-error">{addError}</p> : null}
      {vm.rssError ? <p className="arco-music__feed-error">{vm.rssError}</p> : null}
      <div className="arco-music__feed-list">
        {vm.rssFeeds.map((feed) => (
          <div key={feed.id} className="arco-music__feed-row">
            <button
              type="button"
              className="arco-music__feed-row-open"
              onClick={() => void vm.openBroadcastFeed(feed)}
            >
              <strong>{feed.label}</strong>
              <span>
                {feed.publisher} · {MUSIC_RSS_FEED_CATEGORY_LABELS[feed.category]}
              </span>
            </button>
            <button
              type="button"
              className="arco-music__icon-btn"
              aria-label={`Remove ${feed.label}`}
              disabled={vm.feedsLoading}
              onClick={() => void vm.removeRssFeed(feed.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MusicBroadcastDirectory({ vm }: MusicBroadcastsProps) {
  const [category, setCategory] = useState<BroadcastFilter>("all");
  const activeLiveStationId = vm.activeTrackId?.startsWith("live:")
    ? vm.activeTrackId.slice("live:".length)
    : undefined;

  const isLiveCategory =
    category === "live" || LIVE_STATION_CATEGORIES.some((item) => item.id === category);
  const isRssCategory = BROADCAST_FEED_CATEGORIES.some((item) => item.id === category);

  const liveCategoryFilter: MusicLiveStationCategory | "all" =
    category === "all" || category === "live"
      ? "all"
      : isLiveCategory
        ? (category as MusicLiveStationCategory)
        : "all";

  const liveStations = isRssCategory
    ? []
    : filterLiveStations(vm.liveStations, vm.searchQuery, liveCategoryFilter);

  const rssFeeds = isLiveCategory && category !== "all"
    ? []
    : filterBroadcastFeeds(
        vm.rssFeeds,
        vm.searchQuery,
        isRssCategory ? (category as MusicRssFeedCategory) : "all",
      );

  const groupedLive = groupedLiveStations(liveStations);
  const groupedRss = groupedBroadcastFeeds(rssFeeds);
  const showLiveSection = !isRssCategory && liveStations.length > 0;
  const showRssSection = !(isLiveCategory && category !== "all");
  const showGroupedLive = (category === "all" || category === "live") && !vm.searchQuery.trim();
  const showGroupedRss = category === "all" && !vm.searchQuery.trim();

  return (
    <main className="arco-music__main">
      <div className="arco-music__main-scroll arco-music__scrollable">
        <header className="arco-music__broadcast-header">
          <div>
            <h1 className="arco-music__broadcast-title">Broadcasts</h1>
            <p className="arco-music__broadcast-subtitle">
              Independent live radio and music blog RSS feeds. {vm.liveStations.length} live station
              {vm.liveStations.length === 1 ? "" : "s"}, {vm.rssFeeds.length} RSS feed
              {vm.rssFeeds.length === 1 ? "" : "s"}.
            </p>
          </div>
        </header>

        <div className="arco-music__content-filters" role="tablist" aria-label="Broadcast categories">
          <button
            type="button"
            role="tab"
            aria-selected={category === "all"}
            className={`arco-music__filter-chip${category === "all" ? " arco-music__filter-chip--active" : ""}`}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={category === "live"}
            className={`arco-music__filter-chip${category === "live" ? " arco-music__filter-chip--active" : ""}`}
            onClick={() => setCategory("live")}
          >
            Live radio
          </button>
          {LIVE_STATION_CATEGORIES.map((item) => (
            <button
              key={`live-${item.id}`}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              className={`arco-music__filter-chip${category === item.id ? " arco-music__filter-chip--active" : ""}`}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
          {BROADCAST_FEED_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              className={`arco-music__filter-chip${category === item.id ? " arco-music__filter-chip--active" : ""}`}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {showLiveSection ? (
          showGroupedLive ? (
            LIVE_STATION_CATEGORIES.map((section) => {
              const sectionStations = groupedLive.get(section.id);
              if (!sectionStations?.length) return null;
              return (
                <LiveStationSection
                  key={`live-${section.id}`}
                  title={section.label}
                  stations={sectionStations}
                  vm={vm}
                  activeStationId={activeLiveStationId}
                />
              );
            })
          ) : (
            <LiveStationSection
              title={
                category === "live"
                  ? "Live radio"
                  : MUSIC_LIVE_STATION_CATEGORY_LABELS[category as MusicLiveStationCategory]
              }
              stations={liveStations}
              vm={vm}
              activeStationId={activeLiveStationId}
            />
          )
        ) : null}

        {showRssSection ? (
          vm.rssLoading && vm.rssFeeds.length === 0 ? (
            <p className="arco-music__news-status">
              <Loader2 size={16} className="arco-music__spin" /> Loading broadcasts…
            </p>
          ) : rssFeeds.length === 0 && !showLiveSection ? (
            <EmptyState title="No broadcasts found">Try another category or search term.</EmptyState>
          ) : rssFeeds.length > 0 ? (
            showGroupedRss ? (
              BROADCAST_FEED_CATEGORIES.map((section) => {
                const sectionFeeds = groupedRss.get(section.id);
                if (!sectionFeeds?.length) return null;
                return (
                  <BroadcastSection key={section.id} title={section.label} feeds={sectionFeeds} vm={vm} />
                );
              })
            ) : (
              <BroadcastSection title="RSS results" feeds={rssFeeds} vm={vm} />
            )
          ) : null
        ) : null}

        {showRssSection ? <BroadcastFeedManager vm={vm} /> : null}
      </div>
    </main>
  );
}
