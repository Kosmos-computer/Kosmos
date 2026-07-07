/** Curated RSS feeds seeded into the Podcasts app when PODCAST_RSS_FEEDS is unset. */
export interface PodcastRssFeedSeed {
  url: string;
  label: string;
  publisher: string;
}

/** User-subscribed podcast RSS feed (persisted server-side). */
export interface PodcastFeedSubscription extends PodcastRssFeedSeed {
  id: string;
  addedAt: string;
  autoDownload: boolean;
}

export const PODCAST_RSS_FEED_SEEDS: PodcastRssFeedSeed[] = [
  {
    url: "https://feeds.npr.org/510289/podcast.xml",
    label: "Planet Money",
    publisher: "NPR",
  },
  {
    url: "https://www.thisamericanlife.org/podcast/rss.xml",
    label: "This American Life",
    publisher: "Chicago Public Media",
  },
  {
    url: "https://feeds.npr.org/381444908/podcast.xml",
    label: "Fresh Air",
    publisher: "NPR",
  },
  {
    url: "https://feeds.npr.org/344098539/podcast.xml",
    label: "Wait Wait… Don't Tell Me!",
    publisher: "NPR",
  },
  {
    url: "https://feeds.npr.org/510308/podcast.xml",
    label: "Hidden Brain",
    publisher: "NPR",
  },
  {
    url: "https://feeds.simplecast.com/dHoohVNH",
    label: "Conan O'Brien Needs A Friend",
    publisher: "Team Coco",
  },
  {
    url: "https://feeds.simplecast.com/54nAGcIl",
    label: "The Daily",
    publisher: "The New York Times",
  },
  {
    url: "https://feeds.simplecast.com/xl36XBC2",
    label: "Serial",
    publisher: "Serial Productions",
  },
];

/** @deprecated Use PODCAST_RSS_FEED_SEEDS */
export const DEFAULT_PODCAST_RSS_FEEDS = PODCAST_RSS_FEED_SEEDS.map((feed) => feed.url);

export function podcastRssFeedSeedSummary(
  feeds: Pick<PodcastRssFeedSeed, "label">[] = PODCAST_RSS_FEED_SEEDS,
  limit = 3,
): string {
  if (feeds.length === 0) return "No feeds subscribed";
  const labels = feeds.slice(0, limit).map((feed) => feed.label);
  const remaining = feeds.length - labels.length;
  if (remaining <= 0) return labels.join(", ");
  return `${labels.join(", ")} +${remaining} more`;
}
