/**
 * Curated independent radio stations — listener-supported, college, freeform,
 * and internet-only streams (inspired by community recommendations).
 */

export type MusicLiveStationCategory =
  | "freeform"
  | "indie"
  | "electronic"
  | "college"
  | "community"
  | "jazz-classical";

export interface MusicLiveStation {
  id: string;
  label: string;
  publisher: string;
  location: string;
  description: string;
  category: MusicLiveStationCategory;
  /** Direct upstream stream URL (proxied through /api/music/live/stream/:id). */
  streamUrl: string;
  websiteUrl?: string;
}

export const MUSIC_LIVE_STATION_CATEGORY_LABELS: Record<MusicLiveStationCategory, string> = {
  freeform: "Freeform",
  indie: "Indie & alternative",
  electronic: "Electronic & ambient",
  college: "College radio",
  community: "Community radio",
  "jazz-classical": "Jazz & classical",
};

/** Default live stations shown in the Music → Broadcasts tab. */
export const MUSIC_LIVE_STATIONS: MusicLiveStation[] = [
  {
    id: "wfmu",
    label: "WFMU",
    publisher: "WFMU",
    location: "East Orange, NJ",
    description: "Legendary freeform station — no playlists, no corporate gatekeepers.",
    category: "freeform",
    streamUrl: "http://stream0.wfmu.org/freeform-128k.mp3",
    websiteUrl: "https://wfmu.org",
  },
  {
    id: "kexp",
    label: "KEXP",
    publisher: "KEXP",
    location: "Seattle, WA",
    description: "Listener-powered indie with in-studio performances and deep discovery.",
    category: "indie",
    streamUrl: "https://kexp.streamguys1.com/kexp160.aac",
    websiteUrl: "https://www.kexp.org",
  },
  {
    id: "nts-1",
    label: "NTS Radio 1",
    publisher: "NTS",
    location: "London, UK",
    description: "Eclectic global programming from one of the best DJ-led stations online.",
    category: "freeform",
    streamUrl: "https://stream-relay-geo.ntslive.net/stream",
    websiteUrl: "https://www.nts.live",
  },
  {
    id: "nts-2",
    label: "NTS Radio 2",
    publisher: "NTS",
    location: "Los Angeles, CA",
    description: "West Coast channel — club, experimental, and underground currents.",
    category: "freeform",
    streamUrl: "https://stream-relay-geo.ntslive.net/stream2",
    websiteUrl: "https://www.nts.live",
  },
  {
    id: "somafm-groove-salad",
    label: "SomaFM Groove Salad",
    publisher: "SomaFM",
    location: "San Francisco, CA",
    description: "Downtempo and ambient electronic — a longtime internet radio staple.",
    category: "electronic",
    streamUrl: "http://ice1.somafm.com/groovesalad-128-mp3",
    websiteUrl: "https://somafm.com/groovesalad",
  },
  {
    id: "somafm-drone-zone",
    label: "SomaFM Drone Zone",
    publisher: "SomaFM",
    location: "San Francisco, CA",
    description: "Atmospheric ambient and space music for deep listening.",
    category: "electronic",
    streamUrl: "http://ice1.somafm.com/dronezone-128-mp3",
    websiteUrl: "https://somafm.com/dronezone",
  },
  {
    id: "somafm-space-station",
    label: "SomaFM Space Station",
    publisher: "SomaFM",
    location: "San Francisco, CA",
    description: "Energetic ambient and mid-tempo electronica with a cosmic tilt.",
    category: "electronic",
    streamUrl: "http://ice1.somafm.com/spacestation-128-mp3",
    websiteUrl: "https://somafm.com/spacestation",
  },
  {
    id: "somafm-defcon",
    label: "SomaFM DEF CON Radio",
    publisher: "SomaFM",
    location: "San Francisco, CA",
    description: "Dark electronic and hacker-culture soundtracks.",
    category: "electronic",
    streamUrl: "http://ice1.somafm.com/defcon-128-mp3",
    websiteUrl: "https://somafm.com/defcon",
  },
  {
    id: "somafm-secret-agent",
    label: "SomaFM Secret Agent",
    publisher: "SomaFM",
    location: "San Francisco, CA",
    description: "Spy-themed lounge and exotica for late-night listening.",
    category: "electronic",
    streamUrl: "http://ice1.somafm.com/secretagent-128-mp3",
    websiteUrl: "https://somafm.com/secretagent",
  },
  {
    id: "kcmp",
    label: "The Current",
    publisher: "Minnesota Public Radio",
    location: "Minneapolis, MN",
    description: "89.3 KCMP — indie and alternative from the Twin Cities.",
    category: "indie",
    streamUrl: "http://current.stream.publicradio.org/kcmp.mp3",
    websiteUrl: "https://www.thecurrent.org",
  },
  {
    id: "kboo",
    label: "KBOO",
    publisher: "KBOO Community Radio",
    location: "Portland, OR",
    description: "Volunteer-run community station with local voices and eclectic music.",
    category: "community",
    streamUrl: "http://live.kboo.fm:8000/high.m3u",
    websiteUrl: "https://kboo.fm",
  },
  {
    id: "kboo-low",
    label: "KBOO Low Bandwidth",
    publisher: "KBOO Community Radio",
    location: "Portland, OR",
    description: "Lower-bitrate KBOO stream for slower connections.",
    category: "community",
    streamUrl: "http://live.kboo.fm:8000/low.m3u",
    websiteUrl: "https://kboo.fm",
  },
  {
    id: "kalx",
    label: "KALX",
    publisher: "UC Berkeley",
    location: "Berkeley, CA",
    description: "Student-run freeform from the University of California.",
    category: "college",
    streamUrl: "http://stream.kalx.berkeley.edu:8000/kalx-256.mp3",
    websiteUrl: "https://kalx.berkeley.edu",
  },
  {
    id: "kxlu",
    label: "KXLU",
    publisher: "Loyola Marymount University",
    location: "Los Angeles, CA",
    description: "Underground and experimental college radio since 1957.",
    category: "college",
    streamUrl: "http://kxlu.streamguys1.com/kxlu-hi",
    websiteUrl: "https://www.kxlu.com",
  },
  {
    id: "kfjc",
    label: "KFJC",
    publisher: "Foothill College",
    location: "Los Altos Hills, CA",
    description: "Bay Area college station known for noise, punk, and left-field sounds.",
    category: "college",
    streamUrl: "http://aac.kfjc.org:80/",
    websiteUrl: "https://kfjc.org",
  },
  {
    id: "kzsu",
    label: "KZSU",
    publisher: "Stanford University",
    location: "Stanford, CA",
    description: "Stanford's student-run station — freeform with a tech-campus edge.",
    category: "college",
    streamUrl: "http://171.66.118.110:8080/kzsu-1-128.mp3",
    websiteUrl: "https://kzsu.stanford.edu",
  },
  {
    id: "wmbr",
    label: "WMBR",
    publisher: "MIT",
    location: "Cambridge, MA",
    description: "MIT's freeform community station — punk, jazz, and everything between.",
    category: "college",
    streamUrl: "http://wmbr.org:8000/hi",
    websiteUrl: "https://wmbr.org",
  },
  {
    id: "wkcr",
    label: "WKCR",
    publisher: "Columbia University",
    location: "New York, NY",
    description: "Jazz, classical, and specialty shows from Columbia's campus.",
    category: "jazz-classical",
    streamUrl: "http://wkcr.streamguys1.com:80/live",
    websiteUrl: "https://wkcr.org",
  },
  {
    id: "wqxr",
    label: "WQXR",
    publisher: "New York Public Radio",
    location: "New York, NY",
    description: "NYC's classical music voice — concerts, composers, and deep catalog.",
    category: "jazz-classical",
    streamUrl: "http://q2stream.wqxr.org/q2",
    websiteUrl: "https://www.wqxr.org",
  },
  {
    id: "dublab",
    label: "dublab",
    publisher: "dublab",
    location: "Los Angeles, CA",
    description: "Future roots and underground electronic from LA's artist collective.",
    category: "indie",
    streamUrl: "http://dublab.out.airtime.pro:8000/dublab_a",
    websiteUrl: "https://dublab.com",
  },
  {
    id: "bff-fm",
    label: "BFF.fm",
    publisher: "BFF.fm",
    location: "San Francisco, CA",
    description: "SF community radio — local artists, DJs, and neighborhood culture.",
    category: "community",
    streamUrl: "http://stream.bff.fm/listen.mp3",
    websiteUrl: "https://bff.fm",
  },
  {
    id: "sf-community",
    label: "SF Community Radio",
    publisher: "SFCR",
    location: "San Francisco, CA",
    description: "Grassroots San Francisco community broadcasting.",
    category: "community",
    streamUrl: "http://stream.sfcommunityradio.org:8000/",
    websiteUrl: "https://sfcommunityradio.org",
  },
  {
    id: "nts-slow-focus",
    label: "NTS Slow Focus",
    publisher: "NTS",
    location: "Global",
    description: "Ambient and experimental mixtape channel from NTS.",
    category: "electronic",
    streamUrl: "https://stream-mixtape-geo.ntslive.net/mixtape",
    websiteUrl: "https://www.nts.live",
  },
  {
    id: "nts-poolside",
    label: "NTS Poolside",
    publisher: "NTS",
    location: "Global",
    description: "Balearic, boogie, and sunny downtempo from NTS mixtapes.",
    category: "electronic",
    streamUrl: "https://stream-mixtape-geo.ntslive.net/mixtape4",
    websiteUrl: "https://www.nts.live",
  },
];

export function musicLiveStationSummary(
  stations: Pick<MusicLiveStation, "label">[] = MUSIC_LIVE_STATIONS,
  limit = 3,
): string {
  if (stations.length === 0) return "No live stations";
  const labels = stations.slice(0, limit).map((station) => station.label);
  const remaining = stations.length - labels.length;
  if (remaining <= 0) return labels.join(", ");
  return `${labels.join(", ")} +${remaining} more`;
}
