import { useState, type MouseEvent } from "react";
import { Check, ChevronLeft, Loader2, Play, Plus } from "lucide-react";
import { Button, EmptyState } from "../../components/ui";
import { PodcastCover } from "./PodcastCover";
import type { PodcastDirectoryCategory } from "@shared/podcastDirectory";
import {
  PODCAST_DIRECTORY_CATEGORIES,
  directoryArtTone,
  filterPodcastDirectory,
  groupedPodcastDirectory,
} from "./podcastDirectoryCatalog";
import { isPlayableEpisode } from "./podcastCatalog";
import type { PodcastViewModel } from "./usePodcast";

export interface PodcastDirectoryProps {
  vm: PodcastViewModel;
}

export function PodcastDirectoryShowDetail({ vm }: PodcastDirectoryProps) {
  const show = vm.selectedDirectoryShow;
  if (!show) return null;

  const tone = directoryArtTone(show.label);
  const subscribed = vm.isSubscribedToFeed(show.url);
  const episodes = vm.directoryShowEpisodes;
  const coverEpisode = episodes[0];
  const latestPlayable = episodes.find((episode) => isPlayableEpisode(episode));
  const [pending, setPending] = useState(false);

  const toggleFollow = async () => {
    setPending(true);
    try {
      if (subscribed) await vm.unfollowDirectoryShow(show.url);
      else await vm.followDirectoryShow(show.url);
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="arco-podcast__main">
      <div className="arco-podcast__main-scroll arco-podcast__scrollable">
        <button
          type="button"
          className="arco-podcast__back-btn"
          onClick={() => vm.closeDirectoryShow()}
          aria-label="Back to browse"
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
          Back
        </button>

        <section className="arco-podcast__show-hero">
          <PodcastCover feedUrl={show.url} tone={tone} coverUrl={coverEpisode?.coverUrl} size="lg" alt={show.label} />
          <div className="arco-podcast__show-hero-copy">
            <span className="arco-podcast__featured-label">Podcast</span>
            <h1>{show.label}</h1>
            <p>
              {show.publisher}
              {episodes.length > 0 ? ` · ${episodes.length} episode${episodes.length === 1 ? "" : "s"}` : ""}
            </p>
            <p className="arco-podcast__directory-show-description">{show.description}</p>
            <div className="arco-podcast__directory-show-actions">
              {latestPlayable ? (
                <button
                  type="button"
                  className="arco-podcast__play-btn"
                  onClick={() => vm.playEpisode(latestPlayable.id, true)}
                >
                  <Play size={18} /> Play latest
                </button>
              ) : null}
              <Button
                variant={subscribed ? "secondary" : "primary"}
                className="arco-podcast__directory-follow-btn"
                disabled={pending || vm.feedsLoading}
                onClick={() => void toggleFollow()}
              >
                {pending ? (
                  <Loader2 size={16} className="arco-podcast__spin" />
                ) : subscribed ? (
                  <>
                    <Check size={16} /> Following
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Follow
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        <section className="arco-podcast__section">
          <h2 className="arco-podcast__section-title">Episodes</h2>
          {vm.directoryShowLoading && episodes.length === 0 ? (
            <p className="arco-podcast__downloads-hint">
              <Loader2 size={16} className="arco-podcast__spin" /> Loading episodes…
            </p>
          ) : vm.directoryShowError && episodes.length === 0 ? (
            <p className="arco-podcast__feed-error">{vm.directoryShowError}</p>
          ) : episodes.length === 0 ? (
            <p className="arco-podcast__downloads-hint">No episodes found for this feed.</p>
          ) : (
            <div className="arco-podcast__episode-list">
              {episodes.map((episode) => (
                <DirectoryEpisodeRow key={episode.id} vm={vm} episode={episode} />
              ))}
            </div>
          )}
          {vm.directoryShowLoading && episodes.length > 0 ? (
            <p className="arco-podcast__downloads-hint">
              <Loader2 size={14} className="arco-podcast__spin" /> Refreshing episodes…
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function DirectoryEpisodeRow({ vm, episode }: { vm: PodcastViewModel; episode: PodcastViewModel["directoryShowEpisodes"][number] }) {
  const playable = isPlayableEpisode(episode);
  return (
    <div className={`arco-podcast__episode-row${vm.activeEpisodeId === episode.id ? " arco-podcast__episode-row--active" : ""}`}>
      <button
        type="button"
        className="arco-podcast__episode-play"
        onClick={() => vm.playEpisode(episode.id, playable)}
        disabled={!playable}
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
      </button>
    </div>
  );
}

export function PodcastDirectory({ vm }: PodcastDirectoryProps) {
  const [category, setCategory] = useState<PodcastDirectoryCategory | "all">("all");
  const entries = filterPodcastDirectory(vm.searchQuery, category);
  const grouped = groupedPodcastDirectory(entries);
  const showGrouped = category === "all" && !vm.searchQuery.trim();

  return (
    <main className="arco-podcast__main">
      <div className="arco-podcast__main-scroll arco-podcast__scrollable">
        <header className="arco-podcast__directory-header">
          <div>
            <h1 className="arco-podcast__directory-title">Browse podcasts</h1>
            <p className="arco-podcast__directory-subtitle">
              Follow shows to add them to your home feed. {vm.followedShowCount} followed ·{" "}
              {entries.length} in directory
            </p>
          </div>
        </header>

        <div className="arco-podcast__directory-categories" role="tablist" aria-label="Podcast categories">
          <button
            type="button"
            role="tab"
            aria-selected={category === "all"}
            className={`arco-podcast__filter-chip${category === "all" ? " arco-podcast__filter-chip--active" : ""}`}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {PODCAST_DIRECTORY_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              className={`arco-podcast__filter-chip${category === item.id ? " arco-podcast__filter-chip--active" : ""}`}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <EmptyState title="No podcasts found">Try another category or search term.</EmptyState>
        ) : showGrouped ? (
          PODCAST_DIRECTORY_CATEGORIES.map((section) => {
            const sectionEntries = grouped.get(section.id);
            if (!sectionEntries?.length) return null;
            return (
              <DirectorySection
                key={section.id}
                title={section.label}
                entries={sectionEntries}
                vm={vm}
              />
            );
          })
        ) : (
          <DirectorySection title="Results" entries={entries} vm={vm} />
        )}
      </div>
    </main>
  );
}

function DirectorySection({
  title,
  entries,
  vm,
}: {
  title: string;
  entries: ReturnType<typeof filterPodcastDirectory>;
  vm: PodcastViewModel;
}) {
  return (
    <section className="arco-podcast__section">
      <h2 className="arco-podcast__section-title">{title}</h2>
      <div className="arco-podcast__directory-grid">
        {entries.map((show) => (
          <DirectoryCard key={show.id} show={show} vm={vm} />
        ))}
      </div>
    </section>
  );
}

function DirectoryCard({
  show,
  vm,
}: {
  show: ReturnType<typeof filterPodcastDirectory>[number];
  vm: PodcastViewModel;
}) {
  const subscribed = vm.isSubscribedToFeed(show.url);
  const tone = directoryArtTone(show.label);
  const [pending, setPending] = useState(false);

  const toggleFollow = async (event: MouseEvent) => {
    event.stopPropagation();
    setPending(true);
    try {
      if (subscribed) await vm.unfollowDirectoryShow(show.url);
      else await vm.followDirectoryShow(show.url);
    } finally {
      setPending(false);
    }
  };

  const openShow = () => {
    void vm.openDirectoryShow(show);
  };

  return (
    <article
      className="arco-podcast__directory-card arco-podcast__directory-card--clickable"
      role="button"
      tabIndex={0}
      onClick={openShow}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openShow();
        }
      }}
      aria-label={`Open ${show.label}`}
    >
      <PodcastCover feedUrl={show.url} tone={tone} size="md" alt={show.label} />
      <div className="arco-podcast__directory-card-body">
        <h3>{show.label}</h3>
        <p className="arco-podcast__directory-card-publisher">{show.publisher}</p>
        <p className="arco-podcast__directory-card-description">{show.description}</p>
        <Button
          variant={subscribed ? "secondary" : "primary"}
          className="arco-podcast__directory-follow-btn"
          disabled={pending || vm.feedsLoading}
          onClick={toggleFollow}
        >
          {pending ? (
            <Loader2 size={16} className="arco-podcast__spin" />
          ) : subscribed ? (
            <>
              <Check size={16} /> Following
            </>
          ) : (
            <>
              <Plus size={16} /> Follow
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
