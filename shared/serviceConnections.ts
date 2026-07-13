/**
 * Connected external services — team chat backends and social networks.
 * Brand-free provider ids; apps bind by connectionId, not vendor secrets.
 */

export type ConnectionDomain = "teams" | "social" | "video" | "podcast";

export type TeamProviderId = "mattermost" | "slack" | "matrix";
export type SocialProviderId =
  | "bluesky"
  | "mastodon"
  | "nostr"
  | "twitter"
  | "facebook"
  | "reddit"
  | "bitsocial";
export type VideoProviderId = "youtube" | "vimeo";
export type PodcastProviderId = "spotify" | "apple-podcasts" | "audible";
export type ServiceProviderId =
  | TeamProviderId
  | SocialProviderId
  | VideoProviderId
  | PodcastProviderId;

export type ConnectionStatus = "connected" | "expired" | "error";

export interface ServiceConnection {
  id: string;
  domain: ConnectionDomain;
  provider: ServiceProviderId;
  /** Display name, e.g. "Meridian (Mattermost)" */
  label: string;
  /** Federated instance host, e.g. fosstodon.org */
  instanceUrl?: string;
  /** Handle or email shown in UI */
  accountHint?: string;
  status: ConnectionStatus;
  connectedAt: string;
}

export interface ServiceProviderPreset {
  id: ServiceProviderId;
  domain: ConnectionDomain;
  label: string;
  hint: string;
  /** Show instance URL field (Mastodon, Matrix, Mattermost self-host). */
  requiresInstance: boolean;
  /** Personal access token / app password for stub connect (OAuth later). */
  requiresToken: boolean;
  /** Require account hint / handle (Bluesky handle). */
  requiresAccountHint?: boolean;
  accent: string;
  initials: string;
}

export const SERVICE_PROVIDER_PRESETS: ServiceProviderPreset[] = [
  {
    id: "mattermost",
    domain: "teams",
    label: "Mattermost",
    hint: "Self-hosted or cloud team chat with Slack-like channels.",
    requiresInstance: true,
    requiresToken: true,
    accent: "#0058cc",
    initials: "MM",
  },
  {
    id: "slack",
    domain: "teams",
    label: "Slack",
    hint: "Connect a Slack workspace (OAuth in a later phase).",
    requiresInstance: false,
    requiresToken: true,
    accent: "#611f69",
    initials: "Sl",
  },
  {
    id: "matrix",
    domain: "teams",
    label: "Matrix",
    hint: "Homeserver URL + access token for Element-compatible chat.",
    requiresInstance: true,
    requiresToken: true,
    accent: "#0dbd8b",
    initials: "Mx",
  },
  {
    id: "bluesky",
    domain: "social",
    label: "Bluesky",
    hint: "AT Protocol social feed — app password for now, OAuth later.",
    requiresInstance: false,
    requiresToken: true,
    requiresAccountHint: true,
    accent: "#0085ff",
    initials: "BS",
  },
  {
    id: "mastodon",
    domain: "social",
    label: "Mastodon",
    hint: "Instance URL + access token (Preferences → Development → New application).",
    requiresInstance: true,
    requiresToken: true,
    accent: "#6364ff",
    initials: "Ma",
  },
  {
    id: "nostr",
    domain: "social",
    label: "Nostr",
    hint: "Paste your nsec; optional relays (Snort defaults if blank). Vault-backed.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#8b5cf6",
    initials: "No",
  },
  {
    id: "twitter",
    domain: "social",
    label: "X (Twitter)",
    hint: "Paste an X OAuth 2.0 user access token (developer.x.com — tweet.read/write, users.read).",
    requiresInstance: false,
    requiresToken: true,
    accent: "#000000",
    initials: "X",
  },
  {
    id: "facebook",
    domain: "social",
    label: "Facebook",
    hint: "Paste a Graph API Page or user access token; optional Page ID for Page posting.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#1877f2",
    initials: "Fb",
  },
  {
    id: "reddit",
    domain: "social",
    label: "Reddit",
    hint: "Paste a Reddit OAuth access token (old.reddit.com/prefs/apps). Optional default subreddit for posts.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#ff4500",
    initials: "Re",
  },
  {
    id: "bitsocial",
    domain: "social",
    label: "Bitsocial",
    hint: "Connect with defaults (local daemon + public communities). Advanced: custom RPC URL / communities.",
    requiresInstance: false,
    requiresToken: false,
    accent: "#e85d04",
    initials: "Bi",
  },
  {
    id: "youtube",
    domain: "video",
    label: "YouTube",
    hint: "Paste a YouTube Data API v3 key (Google Cloud Console → APIs & Services → Credentials) to search live videos.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#ff0000",
    initials: "YT",
  },
  {
    id: "vimeo",
    domain: "video",
    label: "Vimeo",
    hint: "Paste a Vimeo personal access token (developer.vimeo.com/apps, \"Public\" scope) to search live videos.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#1ab7ea",
    initials: "Vi",
  },
  {
    id: "spotify",
    domain: "podcast",
    label: "Spotify",
    hint: "Spotify podcasts and saved shows — OAuth replaces token paste later.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#1db954",
    initials: "Sp",
  },
  {
    id: "apple-podcasts",
    domain: "podcast",
    label: "Apple Podcasts",
    hint: "Apple ID token for subscribed shows and listening history.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#fa2d48",
    initials: "AP",
  },
  {
    id: "audible",
    domain: "podcast",
    label: "Audible",
    hint: "Audible library for audiobooks and series progress.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#f8991c",
    initials: "Au",
  },
];

export function presetById(id: ServiceProviderId): ServiceProviderPreset {
  const preset = SERVICE_PROVIDER_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown provider: ${id}`);
  return preset;
}

export function presetsForDomain(domain: ConnectionDomain): ServiceProviderPreset[] {
  return SERVICE_PROVIDER_PRESETS.filter((p) => p.domain === domain);
}
