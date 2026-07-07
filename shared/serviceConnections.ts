/**
 * Connected external services — team chat backends and social networks.
 * Brand-free provider ids; apps bind by connectionId, not vendor secrets.
 */

export type ConnectionDomain = "teams" | "social" | "video" | "podcast";

export type TeamProviderId = "mattermost" | "slack" | "matrix";
export type SocialProviderId = "bluesky" | "mastodon" | "nostr";
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
    accent: "#0085ff",
    initials: "BS",
  },
  {
    id: "mastodon",
    domain: "social",
    label: "Mastodon",
    hint: "Pick your instance, then authorize or paste an access token.",
    requiresInstance: true,
    requiresToken: true,
    accent: "#6364ff",
    initials: "Ma",
  },
  {
    id: "nostr",
    domain: "social",
    label: "Nostr",
    hint: "Relays + nsec/npub — local engine wiring comes later.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#8b5cf6",
    initials: "No",
  },
  {
    id: "youtube",
    domain: "video",
    label: "YouTube",
    hint: "Connect a Google/YouTube account for subscriptions and recommendations.",
    requiresInstance: false,
    requiresToken: true,
    accent: "#ff0000",
    initials: "YT",
  },
  {
    id: "vimeo",
    domain: "video",
    label: "Vimeo",
    hint: "Personal access token for your Vimeo library and watch history.",
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
