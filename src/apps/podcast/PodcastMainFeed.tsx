import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart2, MoreHorizontal, Play, Plus, Volume2 } from "lucide-react";
import { Button, EmptyState } from "../../components/ui";
import { PodcastCover } from "./PodcastCover";
import { buildMainFeedModules } from "./podcastMainFeedData";
import { isPlayableEpisode } from "./podcastCatalog";
import type { PodcastFeedModule } from "./types";
import type { PodcastViewModel } from "./usePodcast";

export interface PodcastMainFeedProps {
  vm: PodcastViewModel;
}

function FeedModuleSlide({
  module,
  vm,
  active,
}: {
  module: PodcastFeedModule;
  vm: PodcastViewModel;
  active: boolean;
}) {
  const episode = module.episode;
  const show = module.show;
  const playable = episode ? isPlayableEpisode(episode) : false;

  return (
    <section
      className="arco-podcast-feed__slide"
      data-active={active ? "true" : "false"}
      aria-hidden={!active}
    >
      <header className="arco-podcast-feed__chrome">
        <div className="arco-podcast-feed__topbar">
          <p className="arco-podcast-feed__now-playing">
            {episode ? `${episode.showTitle} — ${episode.title}` : module.title}
          </p>
          <div className="arco-podcast-feed__topbar-actions">
            <button type="button" className="arco-podcast-feed__topbar-btn" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_VOLUME)}>
              <Volume2 size={18} />
            </button>
            <button type="button" className="arco-podcast-feed__topbar-btn" aria-label={i18n.t(I18nKey.APPS$PODCAST_AUDIO_LEVELS)}>
              <BarChart2 size={18} />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`arco-podcast-feed__backdrop arco-music__art--full arco-music__art--${module.artTone}`}
        aria-hidden="true"
      >
        {episode ? (
          <PodcastCover
            episodeId={episode.id}
            tone={module.artTone}
            coverUrl={episode.coverUrl}
            size="lg"
            alt=""
          />
        ) : null}
      </div>
      <div className="arco-podcast-feed__scrim" aria-hidden="true" />

      <div className="arco-podcast-feed__module">
        <div className="arco-podcast-feed__module-head">
          {episode || show ? (
            <PodcastCover
              episodeId={episode?.id ?? ""}
              feedUrl={show?.feedUrl}
              tone={module.artTone}
              coverUrl={episode?.coverUrl}
              size="sm"
              alt={module.title}
            />
          ) : (
            <span className={`arco-music__art arco-music__art--sm arco-music__art--${module.artTone}`} />
          )}
          <div className="arco-podcast-feed__module-copy">
            <strong>{module.title}</strong>
            <span>{module.subtitle}</span>
          </div>
        </div>
        <p className="arco-podcast-feed__module-description">{module.description}</p>
        <div className="arco-podcast-feed__module-actions">
          <button type="button" className="arco-podcast-feed__module-icon" aria-label={i18n.t(I18nKey.APPS$PODCAST_SAVE_TO_QUEUE)}>
            <Plus size={18} />
          </button>
          <button type="button" className="arco-podcast-feed__module-icon" aria-label={i18n.t(I18nKey.APPS$FILES_MORE_OPTIONS)}>
            <MoreHorizontal size={18} />
          </button>
          {module.episodeCount ? (
            <span className="arco-podcast-feed__module-count">
              {module.episodeCount}<T k={I18nKey.APPS$PODCAST_EPISODE} />{module.episodeCount === 1 ? "" : "s"}
            </span>
          ) : null}
          {module.kind === "discover" ? (
            <Button variant="primary" className="arco-podcast-feed__module-play" onClick={() => vm.setNavSection("browse")}><T k={I18nKey.APPS$PODCAST_BROWSE} /></Button>
          ) : show && !playable ? (
            <Button
              variant="primary"
              className="arco-podcast-feed__module-play"
              onClick={() => vm.setSelectedShowId(show.id)}
            ><T k={I18nKey.APPS$PODCAST_OPEN_SHOW} /></Button>
          ) : playable && episode ? (
            <button
              type="button"
              className="arco-podcast-feed__module-play"
              aria-label={`Play ${episode.title}`}
              onClick={() => vm.playEpisode(episode.id, true)}
            >
              <Play size={22} />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PodcastMainFeed({ vm }: PodcastMainFeedProps) {
  const modules = buildMainFeedModules(vm);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, modules.length - 1));
    slideRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveIndex(clamped);
  }, [modules.length]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number(visible.target.getAttribute("data-index"));
        if (!Number.isNaN(index)) setActiveIndex(index);
      },
      { root, threshold: [0.55, 0.7, 0.85] },
    );

    slideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });

    return () => observer.disconnect();
  }, [modules.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        scrollToIndex(activeIndex + 1);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, scrollToIndex]);

  if (vm.loading) {
    return <EmptyState title={i18n.t(I18nKey.APPS$PODCAST_LOADING_FEED)}><T k={I18nKey.APPS$PODCAST_SORTING_YOUR_LATEST_EPISODES} /></EmptyState>;
  }

  return (
    <main className="arco-podcast__main arco-podcast__main--feed">
      <div ref={scrollRef} className="arco-podcast-feed__stack" role="feed" aria-label={i18n.t(I18nKey.APPS$PODCAST_PODCAST_MAIN_FEED)}>
        {modules.map((module, index) => (
          <div
            key={module.id}
            ref={(node) => {
              slideRefs.current[index] = node;
            }}
            data-index={index}
            className="arco-podcast-feed__snap"
          >
            <FeedModuleSlide
              module={module}
              vm={vm}
              active={index === activeIndex}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
