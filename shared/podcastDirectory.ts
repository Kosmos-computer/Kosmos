import type { PodcastRssFeedSeed } from "./podcastFeeds";

export type PodcastDirectoryCategory =
  | "featured"
  | "news"
  | "true-crime"
  | "science-tech"
  | "business"
  | "comedy"
  | "culture"
  | "sports"
  | "history"
  | "health"
  | "education"
  | "storytelling";

export interface PodcastDirectoryEntry extends PodcastRssFeedSeed {
  id: string;
  category: PodcastDirectoryCategory;
  description: string;
}

export const PODCAST_DIRECTORY_CATEGORIES: { id: PodcastDirectoryCategory; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "news", label: "News & Politics" },
  { id: "true-crime", label: "True Crime" },
  { id: "science-tech", label: "Science & Tech" },
  { id: "business", label: "Business" },
  { id: "comedy", label: "Comedy" },
  { id: "culture", label: "Society & Culture" },
  { id: "sports", label: "Sports" },
  { id: "history", label: "History" },
  { id: "health", label: "Health & Wellness" },
  { id: "education", label: "Education" },
  { id: "storytelling", label: "Storytelling" },
];

function entry(
  category: PodcastDirectoryCategory,
  label: string,
  publisher: string,
  url: string,
  description: string,
): PodcastDirectoryEntry {
  return {
    id: `${category}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    category,
    label,
    publisher,
    url,
    description,
  };
}

/** Browsable podcast catalog — follow shows to populate the home feed. */
export const PODCAST_DIRECTORY: PodcastDirectoryEntry[] = [
  // Featured
  entry("featured", "The Daily", "The New York Times", "https://feeds.simplecast.com/54nAGcIl", "Twenty minutes on the biggest stories of the day."),
  entry("featured", "Serial", "Serial Productions", "https://feeds.simplecast.com/xl36XBC2", "Investigative journalism, one story at a time."),
  entry("featured", "Planet Money", "NPR", "https://feeds.npr.org/510289/podcast.xml", "The economy explained with creativity and humor."),
  entry("featured", "Radiolab", "WNYC Studios", "https://feeds.simplecast.com/EmVW7VGp", "Science, philosophy, and human experience."),
  entry("featured", "This American Life", "Chicago Public Media", "https://www.thisamericanlife.org/podcast/rss.xml", "Stories curated around a weekly theme."),
  entry("featured", "99% Invisible", "Roman Mars", "https://feeds.simplecast.com/BqbsxVfO", "Design and architecture you never notice."),
  entry("featured", "Hidden Brain", "NPR", "https://feeds.npr.org/510308/podcast.xml", "Science of human behavior and decision-making."),
  entry("featured", "Fresh Air", "NPR", "https://feeds.npr.org/381444908/podcast.xml", "Intimate conversations with writers, actors, and thinkers."),

  // News & Politics
  entry("news", "Up First", "NPR", "https://feeds.npr.org/510318/podcast.xml", "Three essential stories to start your morning."),
  entry("news", "Pod Save America", "Crooked Media", "https://feeds.simplecast.com/dHoohVNH", "Political commentary from former Obama staffers."),
  entry("news", "The NPR Politics Podcast", "NPR", "https://feeds.npr.org/510310/podcast.xml", "Weekly breakdown of Washington and the campaign trail."),
  entry("news", "Post Reports", "The Washington Post", "https://podcast.posttv.com/itunes/post-reports.xml", "Deep reporting on the stories behind the headlines."),
  entry("news", "The Ezra Klein Show", "The New York Times", "https://feeds.simplecast.com/82FI35Px", "Big ideas about politics, policy, and culture."),
  entry("news", "Today, Explained", "Vox", "https://feeds.megaphone.fm/VMP5705694065", "One news story explained clearly every weekday."),
  entry("news", "The Indicator", "Planet Money", "https://feeds.npr.org/510325/podcast.xml", "Quick takes on work, business, and the economy."),
  entry("news", "Consider This", "NPR", "https://feeds.npr.org/510355/podcast.xml", "Evening news analysis in about ten minutes."),
  entry("news", "Left, Right & Center", "KCRW", "https://www.justrightmedia.org/leftrightcenter.xml", "Weekly debate across the political spectrum."),
  entry("news", "BBC Global News Podcast", "BBC", "https://podcasts.files.bbci.co.uk/p02nq0gn.rss", "International news from the BBC World Service."),
  entry("news", "The Intelligence", "The Economist", "https://access.acast.com/rss/d556eb54-6160-4c85-95f4-47d9f5216c49", "Daily global briefing from The Economist."),
  entry("news", "Start Here", "ABC News", "https://feeds.megaphone.fm/ESP8447327256", "The day's top stories in about twenty minutes."),

  // True Crime
  entry("true-crime", "Crime Junkie", "audiochuck", "https://feeds.simplecast.com/qm_9xx0g", "Weekly deep dives into baffling cases."),
  entry("true-crime", "My Favorite Murder", "Exactly Right", "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/bdde8bb3-169d-43b1-91d3-b24c0047969c/f450d41f-16bc-4ecd-8f6c-b24c004796e2/podcast.rss", "True crime with humor and community."),
  entry("true-crime", "Casefile", "Casefile Presents", "https://feeds.acast.com/public/shows/679acff465f74095106abfaa", "Fact-based storytelling without sensationalism."),
  entry("true-crime", "Criminal", "Vox Media", "https://feeds.megaphone.fm/VMP7924981569", "Stories of people who've done wrong or been wronged."),
  entry("true-crime", "Dateline NBC", "NBC News", "https://podcastfeeds.nbcnews.com/dateline", "Classic Dateline mysteries in podcast form."),
  entry("true-crime", "Up and Vanished", "Tenderfoot TV", "https://rss.amperwave.net/v2/feed/audacynetwork/up-and-vanished", "Investigations into unsolved disappearances."),
  entry("true-crime", "Someone Knows Something", "CBC", "https://www.cbc.ca/podcasting/includes/sks.xml", "Award-winning cold case investigations."),
  entry("true-crime", "Serial Killers", "Spotify Studios", "https://anchor.fm/s/983887c0/podcast/rss", "Profiles of history's most notorious killers."),

  // Science & Tech
  entry("science-tech", "Science Vs", "Spotify Studios", "https://feeds.megaphone.fm/sciencevs", "Fact-checking fads, trends, and the news."),
  entry("science-tech", "TED Talks Daily", "TED", "https://feeds.feedburner.com/TEDTalks_audio", "Ideas worth spreading in audio form."),
  entry("science-tech", "StarTalk Radio", "Neil deGrasse Tyson", "https://feeds.simplecast.com/4T39_jAj", "Science, pop culture, and comedy collide."),
  entry("science-tech", "Ologies", "Alie Ward", "https://feeds.simplecast.com/FO6kxYGj", "Interviews with experts in every -ology."),
  entry("science-tech", "Reply All", "Gimlet", "https://feeds.megaphone.fm/replyall", "Stories about how people shape the internet."),
  entry("science-tech", "Darknet Diaries", "Jack Rhysider", "https://podcast.darknetdiaries.com", "True stories from the hidden side of the web."),
  entry("science-tech", "Syntax", "Wes Bos & Scott Tolinski", "https://feed.syntax.fm/rss", "Web development for full-stack makers."),
  entry("science-tech", "Accidental Tech Podcast", "ATP", "https://atp.fm/rss", "Apple, tech industry, and programming talk."),
  entry("science-tech", "Lex Fridman Podcast", "Lex Fridman", "https://lexfridman.com/feed/podcast/", "Long-form conversations about AI and science."),
  entry("science-tech", "Hard Fork", "The New York Times", "https://feeds.simplecast.com/6HKOhNgS", "Tech news with Kevin Roose and Casey Newton."),
  entry("science-tech", "Waveform", "MKBHD", "https://feeds.megaphone.fm/STU4418364045", "Consumer tech reviews and industry news."),
  entry("science-tech", "Science Friday", "WNYC Studios", "https://feeds.simplecast.com/h18ZIZD_", "Weekly science news and interviews."),

  // Business
  entry("business", "How I Built This", "NPR", "https://feeds.npr.org/510313/podcast.xml", "Founders share the stories behind iconic companies."),
  entry("business", "The Tim Ferriss Show", "Tim Ferriss", "https://feeds.libsyn.com/61901/rss", "Deconstructing world-class performers."),
  entry("business", "Masters of Scale", "WaitWhat", "https://rss.art19.com/masters-of-scale", "Startup stories with Reid Hoffman."),
  entry("business", "WorkLife with Adam Grant", "TED", "https://feeds.acast.com/public/shows/67585d9cc705e441796ddaf6", "Making work not suck."),
  entry("business", "The Indicator from Planet Money", "NPR", "https://feeds.npr.org/510325/podcast.xml", "Quick economic insights for your commute."),
  entry("business", "Business Wars", "Wondery", "https://rss.art19.com/business-wars", "Rivalries that shaped industries."),
  entry("business", "Pivot", "Vox Media", "https://feeds.megaphone.fm/pivot", "Tech and business with Kara Swisher and Scott Galloway."),
  entry("business", "Odd Lots", "Bloomberg", "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/8a94442e-5a74-4fa2-8b8d-ae27003a8d6b/982f5071-765c-403d-969d-ae27003a8d83/podcast.rss", "The weird corners of finance and markets."),
  entry("business", "Acquired", "Acquired FM", "https://feeds.transistor.fm/acquired", "Deep dives on great companies and deals."),
  entry("business", "The Prof G Pod", "Vox Media", "https://feeds.megaphone.fm/WWO6655869236", "Business, tech, and life strategy."),

  // Comedy
  entry("comedy", "Conan O'Brien Needs A Friend", "Team Coco", "https://feeds.simplecast.com/dHoohVNH", "Conan interviews celebrities he wants as friends."),
  entry("comedy", "Wait Wait… Don't Tell Me!", "NPR", "https://feeds.npr.org/344098539/podcast.xml", "The news quiz where you can play along."),
  entry("comedy", "SmartLess", "SmartLess Media", "https://feeds.simplecast.com/hNaFxXpO", "Surprise guest interviews with Jason, Sean, and Will."),
  entry("comedy", "Office Ladies", "Earwolf", "https://feeds.megaphone.fm/office-ladies", "Angela and Jenna rewatch The Office."),
  entry("comedy", "My Dad Wrote A Porno", "Acast", "https://rss.acast.com/mydadwroteaporno", "Reading the world's worst erotic novel aloud."),
  entry("comedy", "The Bugle", "Private Eye", "https://feeds.acast.com/public/shows/5e7b777ba085cbe7192b0607", "Satirical news with Andy Zaltzman."),
  entry("comedy", "Comedy Bang Bang", "Earwolf", "https://feeds.simplecast.com/byb4nhvN", "Improv comedy and character-driven interviews."),
  entry("comedy", "No Such Thing As A Fish", "QI", "https://audioboom.com/channels/2399216.rss", "Four QI researchers share their best facts."),

  // Society & Culture
  entry("culture", "Stuff You Should Know", "iHeartPodcasts", "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/a91018a4-ea4f-4130-bf55-ae270180c327/44710ecc-10bb-48d1-93c7-ae270180c33e/podcast.rss", "How everyday things work and why they matter."),
  entry("culture", "Freakonomics Radio", "Freakonomics", "https://feeds.simplecast.com/Y8lFbOT4", "The hidden side of everything."),
  entry("culture", "Code Switch", "NPR", "https://feeds.npr.org/510312/podcast.xml", "Race and identity in America."),
  entry("culture", "The Moth", "The Moth", "http://feeds.feedburner.com/themothpodcast", "True stories told live on stage."),
  entry("culture", "Snap Judgment", "Snap Judgment", "https://rss.pdrl.fm/9ba5b0/snap.feed.snapjudgment.org", "Storytelling with a beat."),
  entry("culture", "Death, Sex & Money", "WNYC Studios", "https://my.slate.com/podcasts/feeds/death-sex-money/", "Honest conversations about the hard stuff."),
  entry("culture", "Revisionist History", "Pushkin Industries", "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/0e563f45-9d14-4ce8-8ef0-ae32006cd7e7/0d4cc74d-fff7-4b89-8818-ae32006cd7f0/podcast.rss", "Malcolm Gladwell reexamines the overlooked."),
  entry("culture", "You're Wrong About", "Cool Zone Media", "https://rss.buzzsprout.com/1112270.rss", "Revisiting events everyone got wrong."),
  entry("culture", "Pop Culture Happy Hour", "NPR", "https://feeds.npr.org/510282/podcast.xml", "What's worth watching, reading, and listening to."),
  entry("culture", "The Anthropocene Reviewed", "John Green", "https://rss.art19.com/the-anthropocene-reviewed", "Reviews of human-centered planet Earth."),

  // Sports
  entry("sports", "The Bill Simmons Podcast", "The Ringer", "https://feeds.megaphone.fm/the-bill-simmons-podcast", "Sports, pop culture, and Boston nostalgia."),
  entry("sports", "Pardon My Take", "Barstool Sports", "https://mcsorleys.barstoolsports.com/feed/pardon-my-take", "Satirical sports talk with Big Cat and PFT."),
  entry("sports", "The Lowe Post", "ESPN", "https://feeds.megaphone.fm/ESP3625084333", "NBA analysis with Zach Lowe."),
  entry("sports", "The Mina Kimes Show", "ESPN", "https://feeds.megaphone.fm/ESP8957020927", "Football culture and interviews."),
  entry("sports", "30 for 30 Podcasts", "ESPN", "https://feeds.megaphone.fm/ESP5765452710", "Documentary storytelling from ESPN."),
  entry("sports", "The Ringer NFL Show", "The Ringer", "https://feeds.megaphone.fm/the-ringer-nfl-show", "Weekly NFL coverage and analysis."),
  entry("sports", "F1: Beyond The Grid", "Formula 1", "https://audioboom.com/channels/4964339.rss", "Inside stories from the world of F1."),
  entry("sports", "The Tennis Podcast", "BBC", "https://feeds.acast.com/public/shows/thetennispodcast", "Weekly tennis news and Grand Slam coverage."),

  // History
  entry("history", "Hardcore History", "Dan Carlin", "https://feeds.feedburner.com/dancarlin/history?format=xml", "Epic historical narratives in marathon form."),
  entry("history", "You're Dead To Me", "BBC", "https://podcasts.files.bbci.co.uk/p07mdbhg.rss", "History made funny and accessible."),
  entry("history", "Throughline", "NPR", "https://feeds.npr.org/510333/podcast.xml", "History behind today's headlines."),
  entry("history", "Slow Burn", "Slate", "https://feeds.acast.com/public/shows/6965759d79fe7d554545528a", "Season-long dives into historical scandals."),
  entry("history", "The Rest Is History", "Goalhanger", "https://feeds.megaphone.fm/GLT4787413333", "Tom Holland and Dominic Sandbrook on the past."),
  entry("history", "Revolutions", "Mike Duncan", "https://rss.libsyn.com/shows/47475/destinations/159998.xml", "Political revolutions that changed the world."),
  entry("history", "The History of Rome", "Mike Duncan", "https://rss.libsyn.com/shows/17332/destinations/5627.xml", "From Romulus to the fall of the Western Empire."),
  entry("history", "American History Tellers", "Wondery", "https://rss.art19.com/american-history-tellers", "Immersive stories from U.S. history."),

  // Health & Wellness
  entry("health", "The Huberman Lab", "Andrew Huberman", "https://feeds.megaphone.fm/hubermanlab", "Neuroscience-based tools for everyday life."),
  entry("health", "Ten Percent Happier", "Dan Harris", "https://www.spreaker.com/show/4922682/episodes/feed", "Meditation for skeptics and busy people."),
  entry("health", "Maintenance Phase", "Aubrey Gordon & Michael Hobbes", "https://rss.buzzsprout.com/1411126.rss", "Debunking wellness and weight-loss myths."),
  entry("health", "The Doctor's Farmacy", "Mark Hyman", "https://feeds.megaphone.fm/thedoctorsfarmacy", "Functional medicine and nutrition science."),
  entry("health", "Sleep With Me", "Dearest Scooter", "https://rss.pdrl.fm/5d8327/feed.sleepwithmepodcast.com/", "Bedtime stories designed to help you sleep."),
  entry("health", "On Being", "Krista Tippett", "https://feeds.simplecast.com/AuAxH_Bf", "Conversations about meaning and spirituality."),
  entry("health", "The Happiness Lab", "Dr. Laurie Santos", "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/96c5c41e-0bc8-4661-b184-ae32006cd726/d623ef0b-3fee-4c26-b815-ae32006cd739/podcast.rss", "Science-backed paths to a happier life."),
  entry("health", "Food Psych", "Christy Harrison", "https://feeds.redcircle.com/dbc4991c-d957-4d84-81e4-25899121a95b", "Intuitive eating and body liberation."),

  // Education
  entry("education", "Stuff You Missed in History Class", "iHeartPodcasts", "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/cfb428ef-eafc-44d0-9d09-ae2701747e6f/fb626e1f-112c-4246-a40d-ae2701747e7d/podcast.rss", "Forgotten moments from the past."),
  entry("education", "Grammar Girl", "Quick and Dirty Tips", "https://feeds.acast.com/public/shows/69c1476c007cdcf83fc0964b", "Quick tips for better writing and grammar."),
  entry("education", "Philosophize This!", "Stephen West", "https://feeds.megaphone.fm/QCD6036500916", "Philosophy made approachable episode by episode."),
  entry("education", "The Learning Scientists Podcast", "Learning Scientists", "https://samuel-sumeracki-zmop.squarespace.com/learning-scientists-podcast?format=rss", "Evidence-based study strategies."),
  entry("education", "Hidden Brain", "NPR", "https://feeds.npr.org/510308/podcast.xml", "Psychology and neuroscience for daily life."),
  entry("education", "The Allusionist", "Helen Zaltzman", "https://feeds.theallusionist.org/allusionist", "Language, etymology, and wordplay."),
  entry("education", "Lexicon Valley", "Slate", "https://feeds.megaphone.fm/SLT4637136223", "Exploring language and linguistics."),
  entry("education", "Planet Money Summer School", "NPR", "https://feeds.npr.org/510289/podcast.xml", "Economics concepts explained simply."),

  // Storytelling
  entry("storytelling", "LeVar Burton Reads", "LeVar Burton", "https://feeds.simplecast.com/LDNgBXht", "Short fiction read by the Reading Rainbow host."),
  entry("storytelling", "Welcome to Night Vale", "Night Vale Presents", "https://feeds.megaphone.fm/SBP4591212513", "Community updates from a desert town."),
  entry("storytelling", "The Magnus Archives", "Rusty Quill", "https://feeds.acast.com/public/shows/b6085bcd-3542-4a43-b6a8-021e3fd251b8", "Horror fiction in an archivist's catalog."),
  entry("storytelling", "Limetown", "Two-Up", "https://feeds.megaphone.fm/PPY5621646923", "Investigative fiction about a vanished town."),
  entry("storytelling", "Homecoming", "Gimlet", "https://feeds.megaphone.fm/homecoming", "A caseworker at a mysterious facility."),
  entry("storytelling", "Alice Isn't Dead", "Night Vale Presents", "https://feeds.megaphone.fm/SBP8990444845", "A truck driver searches for her missing wife."),
  entry("storytelling", "The Truth", "Radiotopia", "https://feeds.megaphone.fm/SBP9327453320", "Short films for your ears."),
  entry("storytelling", "Snap Judgment", "Snap Judgment", "https://rss.pdrl.fm/9ba5b0/snap.feed.snapjudgment.org", "Stories with a cinematic soundtrack."),
];

export function directoryCategoryLabel(category: PodcastDirectoryCategory): string {
  return PODCAST_DIRECTORY_CATEGORIES.find((entry) => entry.id === category)?.label ?? category;
}

export function filterDirectoryEntries(
  entries: PodcastDirectoryEntry[],
  query: string,
  category: PodcastDirectoryCategory | "all",
): PodcastDirectoryEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false;
    if (!normalizedQuery) return true;
    return (
      entry.label.toLowerCase().includes(normalizedQuery) ||
      entry.publisher.toLowerCase().includes(normalizedQuery) ||
      entry.description.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function directoryEntriesByCategory(
  entries: PodcastDirectoryEntry[],
): Map<PodcastDirectoryCategory, PodcastDirectoryEntry[]> {
  const grouped = new Map<PodcastDirectoryCategory, PodcastDirectoryEntry[]>();
  for (const item of entries) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }
  return grouped;
}
