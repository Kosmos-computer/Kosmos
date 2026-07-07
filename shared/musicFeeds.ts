/** Curated music news/blog RSS feeds (Feedspot Top 90 Music RSS Feeds). */
export type MusicRssFeedCategory =
  | "major"
  | "indie"
  | "hip-hop"
  | "edm"
  | "metal"
  | "classical"
  | "country-folk"
  | "pop"
  | "industry"
  | "discovery"
  | "genre-specialty"
  | "international"
  | "regional"
  | "education"
  | "live";

export interface MusicRssFeedSeed {
  url: string;
  label: string;
  publisher: string;
  category: MusicRssFeedCategory;
}

/** User-subscribed music RSS feed (persisted server-side). */
export interface MusicFeedSubscription extends MusicRssFeedSeed {
  id: string;
  addedAt: string;
}

export const MUSIC_RSS_FEED_CATEGORY_LABELS: Record<MusicRssFeedCategory, string> = {
  major: "Major publications",
  indie: "Indie & alternative",
  "hip-hop": "Hip-hop & rap",
  edm: "Electronic & dance",
  metal: "Metal & hard rock",
  classical: "Classical",
  "country-folk": "Country, folk & Americana",
  pop: "Pop & mainstream",
  industry: "Industry & business",
  discovery: "Discovery & curation",
  "genre-specialty": "Genre specialty",
  international: "International",
  regional: "Regional scenes",
  education: "Music education",
  live: "Concerts & festivals",
};

/**
 * RSS feeds with audio enclosures (MP3) — required for Broadcasts playback.
 * Most Feedspot "music blog" feeds are article-only and will not produce songs.
 */
export const MUSIC_RSS_AUDIO_BROADCAST_SEEDS: MusicRssFeedSeed[] = [
  {
    url: "https://feeds.npr.org/510008/podcast.xml",
    label: "World Cafe",
    publisher: "NPR",
    category: "discovery",
  },
  {
    url: "https://archive.org/services/collection-rss.php?collection=etree",
    label: "Internet Archive Live Music",
    publisher: "Archive.org",
    category: "live",
  },
  {
    url: "https://archive.org/services/collection-rss.php?collection=netlabels",
    label: "Internet Archive Netlabels",
    publisher: "Archive.org",
    category: "indie",
  },
  {
    url: "https://archive.org/services/collection-rss.php?collection=78rpm",
    label: "Internet Archive 78 RPM",
    publisher: "Archive.org",
    category: "genre-specialty",
  },
  {
    url: "https://feeds.feedburner.com/AnAquariumDrunkard",
    label: "Aquarium Drunkard",
    publisher: "Aquarium Drunkard",
    category: "indie",
  },
];

/** Seeded when MUSIC_RSS_FEEDS env is unset and no subscriptions exist yet. */
export const MUSIC_RSS_FEED_SEEDS: MusicRssFeedSeed[] = [
  ...MUSIC_RSS_AUDIO_BROADCAST_SEEDS,
  // Major Music Publications and Magazines
  { url: "https://nme.com/feed", label: "NME Magazine", publisher: "NME", category: "major" },
  { url: "https://factmag.com/feed", label: "FACT Magazine", publisher: "FACT", category: "major" },
  {
    url: "https://undertheradarmag.com/site/rss",
    label: "Under the Radar",
    publisher: "Under the Radar",
    category: "major",
  },
  {
    url: "https://altpress.com/feed",
    label: "Alternative Press",
    publisher: "Alternative Press",
    category: "major",
  },

  // Indie and Alternative Music Blogs
  {
    url: "https://feeds.feedburner.com/indieshuffle",
    label: "Indie Shuffle",
    publisher: "Indie Shuffle",
    category: "indie",
  },
  {
    url: "https://feeds.feedburner.com/AnAquariumDrunkard",
    label: "Aquarium Drunkard",
    publisher: "Aquarium Drunkard",
    category: "indie",
  },
  {
    url: "https://gorillavsbear.net/feed",
    label: "GORILLA VS. BEAR",
    publisher: "Gorilla vs. Bear",
    category: "indie",
  },
  {
    url: "https://feeds.feedburner.com/ObscureSound",
    label: "Obscure Sound",
    publisher: "Obscure Sound",
    category: "indie",
  },
  {
    url: "https://drownedinsound.com/feed",
    label: "Drowned In Sound",
    publisher: "Drowned In Sound",
    category: "indie",
  },
  { url: "https://www.stereogum.com/feed/", label: "Stereogum", publisher: "Stereogum", category: "indie" },
  {
    url: "https://www.tinymixtapes.com/rss.xml",
    label: "Tiny Mix Tapes",
    publisher: "Tiny Mix Tapes",
    category: "indie",
  },

  // Hip-Hop and Rap
  {
    url: "https://fakeshoredrive.com/feed",
    label: "Fake Shore Drive",
    publisher: "Fake Shore Drive",
    category: "hip-hop",
  },
  { url: "https://theboombox.com/feed", label: "The Boombox", publisher: "The Boombox", category: "hip-hop" },
  {
    url: "https://undergroundhiphopblog.com/feed",
    label: "Underground Hip Hop Blog",
    publisher: "Underground Hip Hop",
    category: "hip-hop",
  },
  { url: "https://www.okayplayer.com/feed", label: "Okayplayer", publisher: "Okayplayer", category: "hip-hop" },
  { url: "https://www.rap-up.com/feed", label: "Rap Up", publisher: "Rap Up", category: "hip-hop" },

  // Electronic and Dance Music
  { url: "https://edmidentity.com/feed", label: "EDM Identity", publisher: "EDM Identity", category: "edm" },
  { url: "https://edmsauce.com/feed", label: "EDM Sauce", publisher: "EDM Sauce", category: "edm" },
  {
    url: "https://thenocturnaltimes.com/feed",
    label: "The Nocturnal Times",
    publisher: "The Nocturnal Times",
    category: "edm",
  },
  { url: "https://noiseprn.com/feed", label: "Noiseporn", publisher: "Noiseporn", category: "edm" },
  { url: "https://edm.com/feed", label: "EDM.com", publisher: "EDM.com", category: "edm" },
  { url: "https://electrobuzz.net/feed", label: "Electrobuzz", publisher: "Electrobuzz", category: "edm" },

  // Metal and Hard Rock
  {
    url: "https://feeds.feedburner.com/Metalsucks",
    label: "MetalSucks",
    publisher: "MetalSucks",
    category: "metal",
  },
  {
    url: "https://feeds.feedburner.com/metalunderground",
    label: "Metal Underground",
    publisher: "Metal Underground",
    category: "metal",
  },
  { url: "https://metalnexus.net/feed", label: "Metal Nexus", publisher: "Metal Nexus", category: "metal" },
  {
    url: "https://feeds.feedburner.com/darkmusicblog",
    label: "DarkPort.org",
    publisher: "DarkPort",
    category: "metal",
  },
  { url: "https://riffrelevant.com/feed", label: "Riff Relevant", publisher: "Riff Relevant", category: "metal" },
  {
    url: "https://www.heavyblogisheavy.com/feed/",
    label: "Heavy Blog Is Heavy",
    publisher: "Heavy Blog Is Heavy",
    category: "metal",
  },

  // Classical and Contemporary Classical
  { url: "https://slippedisc.com/feed", label: "Slipped Disc", publisher: "Slipped Disc", category: "classical" },
  {
    url: "https://icareifyoulisten.com/feed",
    label: "I Care if You Listen",
    publisher: "I Care if You Listen",
    category: "classical",
  },
  {
    url: "https://jessicamusic.blogspot.com/feeds/posts/default",
    label: "JDCMB",
    publisher: "Jessica Duchen",
    category: "classical",
  },

  // Country, Folk, and Americana
  {
    url: "https://eartothegroundmusic.co/feed",
    label: "Ear To The Ground Music",
    publisher: "Ear To The Ground",
    category: "country-folk",
  },
  {
    url: "https://www.chillfiltr.com/feed",
    label: "CHILLFILTR",
    publisher: "CHILLFILTR",
    category: "country-folk",
  },
  {
    url: "https://www.countryfriedrock.org/feed",
    label: "Country Fried Rock",
    publisher: "Country Fried Rock",
    category: "country-folk",
  },
  {
    url: "https://www.coverlaydown.com/feed",
    label: "Cover Lay Down",
    publisher: "Cover Lay Down",
    category: "country-folk",
  },
  {
    url: "https://www.ninebullets.net/feed",
    label: "Nine Bullets",
    publisher: "Nine Bullets",
    category: "country-folk",
  },

  // Pop and Mainstream
  { url: "https://popjustice.com/feed", label: "Popjustice", publisher: "Popjustice", category: "pop" },
  {
    url: "https://feeds.feedburner.com/eqmusicblog",
    label: "EQ Music Blog",
    publisher: "EQ Music Blog",
    category: "pop",
  },
  { url: "https://thismustbepop.com/feed", label: "This Must Be Pop", publisher: "This Must Be Pop", category: "pop" },
  { url: "https://poppedmusic.co.uk/feed", label: "Popped Music", publisher: "Popped Music", category: "pop" },

  // Music Industry, Marketing, and Business
  {
    url: "https://blog.songtrust.com/rss.xml",
    label: "Songtrust Blog",
    publisher: "Songtrust",
    category: "industry",
  },
  { url: "https://kingsofar.com/feed", label: "Kings of A&R", publisher: "Kings of A&R", category: "industry" },
  {
    url: "https://blog.roughtrade.com/rss",
    label: "Rough Trade Blog",
    publisher: "Rough Trade",
    category: "industry",
  },
  {
    url: "https://blog.reverbnation.com/feed",
    label: "ReverbNation Blog",
    publisher: "ReverbNation",
    category: "industry",
  },

  // Music Discovery and Curation
  { url: "https://stereofox.com/feed", label: "Stereofox", publisher: "Stereofox", category: "discovery" },
  { url: "https://highclouds.org/feed", label: "HighClouds", publisher: "HighClouds", category: "discovery" },
  {
    url: "https://weallwantsomeone.org/feed",
    label: "We All Want Someone To Shout For",
    publisher: "WAWSTS",
    category: "discovery",
  },
  {
    url: "https://eclecticmusiclover.com/feed",
    label: "Eclectic Music Lover",
    publisher: "Eclectic Music Lover",
    category: "discovery",
  },
  { url: "https://fluxblog.org/feed", label: "Fluxblog", publisher: "Fluxblog", category: "discovery" },
  {
    url: "https://www.indiemusicfilter.com/feed",
    label: "Indie Music Filter",
    publisher: "Indie Music Filter",
    category: "discovery",
  },

  // Genre Specialty
  {
    url: "https://feeds.feedburner.com/riddimstream",
    label: "Riddimstream",
    publisher: "Riddimstream",
    category: "genre-specialty",
  },
  {
    url: "https://joshbalogh.wordpress.com/feed",
    label: "Josh Balogh Blog",
    publisher: "Josh Balogh",
    category: "genre-specialty",
  },
  {
    url: "https://iradiott.wordpress.com/feed",
    label: "iRADIO.tt",
    publisher: "iRADIO.tt",
    category: "genre-specialty",
  },

  // International and African Music
  {
    url: "https://zambianmusicblog.co/feed",
    label: "Zambian Music Blog",
    publisher: "Zambian Music Blog",
    category: "international",
  },
  { url: "https://aipate.com/feed", label: "Aipate", publisher: "Aipate", category: "international" },
  {
    url: "https://dansendeberen.be/feed",
    label: "Dansende Beren",
    publisher: "Dansende Beren",
    category: "international",
  },
  { url: "https://nagamag.com/feed", label: "Nagamag", publisher: "Nagamag", category: "international" },
  { url: "https://theaureview.com/feed", label: "The AU Review", publisher: "The AU Review", category: "international" },

  // Regional Music Scenes
  {
    url: "https://brightonmusicblog.co.uk/feed",
    label: "Brighton Music Blog",
    publisher: "Brighton Music Blog",
    category: "regional",
  },
  { url: "https://lamusicblog.com/feed", label: "LA Music Blog", publisher: "LA Music Blog", category: "regional" },
  { url: "https://grimygoods.com/feed", label: "Grimy Goods", publisher: "Grimy Goods", category: "regional" },
  {
    url: "https://www.americanpancake.com/feed",
    label: "American Pancake",
    publisher: "American Pancake",
    category: "regional",
  },

  // Music Education and Instrument Coverage
  { url: "https://consordini.com/feed", label: "Consordini", publisher: "Consordini", category: "education" },
  { url: "https://iguitar.info/feed", label: "iGuitar", publisher: "iGuitar", category: "education" },
  { url: "https://mdecksmusic.com/feed", label: "mDecks Music Blog", publisher: "mDecks", category: "education" },
  {
    url: "https://composerstoolbox.com/feed",
    label: "Composer's Toolbox",
    publisher: "Composer's Toolbox",
    category: "education",
  },

  // Concerts, Festivals, and Live Music
  { url: "https://livemusicblog.com/feed", label: "LIVE", publisher: "Live Music Blog", category: "live" },
  {
    url: "https://soundcheckentertainment.ca/feed",
    label: "Sound Check Entertainment",
    publisher: "Sound Check",
    category: "live",
  },
];

export function musicRssFeedSeedSummary(
  feeds: Pick<MusicRssFeedSeed, "label">[] = MUSIC_RSS_FEED_SEEDS,
  limit = 3,
): string {
  if (feeds.length === 0) return "No feeds subscribed";
  const labels = feeds.slice(0, limit).map((feed) => feed.label);
  const remaining = feeds.length - labels.length;
  if (remaining <= 0) return labels.join(", ");
  return `${labels.join(", ")} +${remaining} more`;
}
