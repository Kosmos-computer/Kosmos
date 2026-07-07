import type { PodcastEpisode, PodcastFeedModule, PodcastShow } from "./types";
import type { PodcastViewModel } from "./usePodcast";

const MODULE_COPY: Record<
  PodcastFeedModule["kind"],
  { subtitle: string; description: (count: number) => string }
> = {
  continue: {
    subtitle: "Continue listening",
    description: () => "Pick up where you left off — your latest session is ready to resume.",
  },
  "new-episode": {
    subtitle: "New episode",
    description: (count) =>
      count > 1
        ? `${count} fresh episodes from shows you follow. Swipe to browse the queue.`
        : "A fresh drop from a show you follow.",
  },
  show: {
    subtitle: "Following",
    description: (count) =>
      `${count} episode${count === 1 ? "" : "s"} in your library from this show.`,
  },
  discover: {
    subtitle: "Discover",
    description: () => "Follow podcasts from Browse to fill your feed with new episodes.",
  },
};

function episodeModule(episode: PodcastEpisode, episodeCount: number): PodcastFeedModule {
  const copy = MODULE_COPY["new-episode"];
  return {
    id: `episode-${episode.id}`,
    kind: "new-episode",
    title: episode.title,
    subtitle: `${episode.showTitle} · ${copy.subtitle}`,
    description: copy.description(episodeCount),
    episodeCount,
    episode,
    artTone: episode.artTone,
  };
}

function showModule(show: PodcastShow, episode: PodcastEpisode | undefined, episodeCount: number): PodcastFeedModule {
  const copy = MODULE_COPY.show;
  return {
    id: `show-${show.id}`,
    kind: "show",
    title: show.title,
    subtitle: `${show.host} · ${copy.subtitle}`,
    description: copy.description(episodeCount),
    episodeCount,
    episode,
    show,
    artTone: show.artTone,
  };
}

/** Sort podcast catalog into full-screen feed modules for the Main Feed view. */
export function buildMainFeedModules(vm: PodcastViewModel): PodcastFeedModule[] {
  const modules: PodcastFeedModule[] = [];
  const seenEpisodeIds = new Set<string>();

  if (vm.continueListening) {
    const episode = vm.continueListening;
    seenEpisodeIds.add(episode.id);
    const copy = MODULE_COPY.continue;
    modules.push({
      id: `continue-${episode.id}`,
      kind: "continue",
      title: episode.title,
      subtitle: `${episode.showTitle} · ${copy.subtitle}`,
      description: copy.description(1),
      episodeCount: 1,
      episode,
      artTone: episode.artTone,
    });
  }

  for (const episode of vm.homeEpisodes) {
    if (seenEpisodeIds.has(episode.id)) continue;
    seenEpisodeIds.add(episode.id);
    modules.push(episodeModule(episode, vm.homeEpisodes.length));
    if (modules.length >= 14) break;
  }

  for (const show of vm.homeShows.slice(0, 4)) {
    const showEpisode = vm.homeEpisodes.find((episode) => episode.showTitle === show.title);
    modules.push(showModule(show, showEpisode, show.episodeCount));
  }

  if (modules.length === 0) {
    const copy = MODULE_COPY.discover;
    modules.push({
      id: "discover-empty",
      kind: "discover",
      title: "Start your feed",
      subtitle: copy.subtitle,
      description: copy.description(0),
      artTone: "violet",
    });
  } else if (vm.followedShowCount < 4) {
    const copy = MODULE_COPY.discover;
    modules.push({
      id: "discover-more",
      kind: "discover",
      title: "Discover more",
      subtitle: copy.subtitle,
      description: copy.description(vm.followedShowCount),
      artTone: "indigo",
    });
  }

  return modules;
}
