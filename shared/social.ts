/** Social API shapes shared between the Arco server and Social app. */

export type SocialProvider =
  | "bluesky"
  | "mastodon"
  | "nostr"
  | "twitter"
  | "facebook"
  | "reddit"
  | "bitsocial";

export type SocialAccountStatus = "connected" | "expired" | "error";

export interface SocialAccountInfo {
  id: string;
  provider: SocialProvider;
  handle: string;
  did: string;
  status: SocialAccountStatus;
  connectedAt: string;
  /** Mastodon instance origin (e.g. https://mastodon.social). */
  instanceUrl?: string;
  /** Facebook Page id when connected as a Page. */
  pageId?: string;
  /** Default subreddit for Reddit posts (without r/ prefix). */
  defaultSubreddit?: string;
  /** Bitsocial PKC RPC WebSocket URL (e.g. ws://localhost:9138). */
  rpcUrl?: string;
  /** Profile display name when known. */
  displayName?: string;
  /** Profile avatar URL when known. */
  avatar?: string;
}

export interface SocialStatusResponse {
  accounts: SocialAccountInfo[];
}

export interface SocialAuthor {
  did: string;
  handle: string;
  displayName: string;
  avatar?: string;
}

export interface SocialPostCounts {
  replies: number;
  reposts: number;
  likes: number;
}

export interface SocialViewerState {
  /** URI of the viewer's like record, if liked. */
  like?: string;
  /** URI of the viewer's repost record, if reposted. */
  repost?: string;
  /** URI of the viewer's follow record for the author, if following. */
  following?: string;
}

/** Refs needed to reply to a post (parent = this post; root = thread root). */
export interface SocialReplyTarget {
  parentUri: string;
  parentCid: string;
  rootUri: string;
  rootCid: string;
}

export interface SocialEmbedImage {
  thumb: string;
  fullsize: string;
  alt: string;
}

export interface SocialEmbedExternal {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

export interface SocialEmbedVideo {
  thumbnail?: string;
  playlist?: string;
  alt?: string;
}

export interface SocialEmbedQuote {
  uri: string;
  cid?: string;
  author?: SocialAuthor;
  text: string;
}

export type SocialEmbed =
  | { type: "images"; images: SocialEmbedImage[] }
  | { type: "video"; video: SocialEmbedVideo }
  | { type: "external"; external: SocialEmbedExternal }
  | { type: "quote"; quote: SocialEmbedQuote };

export interface SocialFeedPost {
  uri: string;
  cid: string;
  author: SocialAuthor;
  text: string;
  createdAt: string;
  counts: SocialPostCounts;
  viewer: SocialViewerState;
  replyTarget: SocialReplyTarget;
  embeds?: SocialEmbed[];
}

export interface SocialFeedResponse {
  posts: SocialFeedPost[];
  cursor?: string;
}

export interface SocialProfile {
  did: string;
  handle: string;
  displayName: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  viewer?: {
    following?: string;
    followedBy?: string;
  };
}

export interface SocialProfileResponse {
  profile: SocialProfile;
  feed: SocialFeedResponse;
}

export interface SocialThreadResponse {
  post: SocialFeedPost;
  ancestors: SocialFeedPost[];
  replies: SocialFeedPost[];
}

export interface SocialBlueskyConnectInput {
  handle: string;
  appPassword: string;
  /** Optional custom PDS; defaults to https://bsky.social */
  service?: string;
}

export interface SocialMastodonConnectInput {
  /** Instance origin, e.g. https://mastodon.social */
  instanceUrl: string;
  /** Access token from Preferences → Development → New application */
  accessToken: string;
}

export interface SocialNostrConnectInput {
  /** nsec… bech32 or 64-char hex private key */
  nsec: string;
  /** Relay WebSocket URLs (wss://…) */
  relays: string[];
}

export interface SocialTwitterConnectInput {
  /**
   * X (Twitter) OAuth 2.0 user access token (Bearer).
   * Create an app at developer.x.com and generate a user-context token with
   * tweet.read, tweet.write, users.read, like.write, follows.write.
   */
  accessToken: string;
}

export interface SocialFacebookConnectInput {
  /**
   * Facebook Graph API user or Page access token.
   * Page tokens are preferred for posting; create an app at developers.facebook.com.
   */
  accessToken: string;
  /** Optional Page id — when set, feed/post as that Page instead of the user. */
  pageId?: string;
}

export interface SocialRedditConnectInput {
  /**
   * Reddit OAuth2 user access token (Bearer), same model as RedReader.
   * Create an installed app at https://old.reddit.com/prefs/apps
   * (scopes: identity, read, submit, vote, mysubreddits, history, subscribe).
   */
  accessToken: string;
  /** Optional default subreddit for new posts (without r/ prefix). */
  defaultSubreddit?: string;
}

export interface SocialBitsocialConnectInput {
  /**
   * PKC RPC WebSocket URL from a running bitsocial-cli daemon
   * (e.g. ws://localhost:9138 or ws://host:9138/<auth-key>).
   */
  rpcUrl: string;
  /** Optional community addresses (.bso / IPNS). Defaults to public Seedit communities. */
  communities?: string[];
}

export interface SocialCreatePostInput {
  text: string;
  accountId?: string;
}

export interface SocialReplyInput {
  text: string;
  parentUri: string;
  parentCid: string;
  rootUri: string;
  rootCid: string;
  accountId?: string;
}

export interface SocialLikeInput {
  uri: string;
  cid: string;
  /** When true, delete an existing like instead of creating one. */
  unlike?: boolean;
  likeUri?: string;
  accountId?: string;
}

export interface SocialRepostInput {
  uri: string;
  cid: string;
  unrepost?: boolean;
  repostUri?: string;
  accountId?: string;
}

export interface SocialFollowInput {
  did: string;
  unfollow?: boolean;
  followUri?: string;
  accountId?: string;
}

/** Actor card used in search results and “who to follow” suggestions. */
export interface SocialSuggestedActor {
  did: string;
  handle: string;
  displayName: string;
  avatar?: string;
  description?: string;
  viewer?: {
    following?: string;
  };
}

export interface SocialTrendItem {
  id: string;
  title: string;
  category?: string;
  postCount?: string;
  /** Query to run in sidebar search when the trend is selected. */
  query?: string;
}

export interface SocialSidebarLink {
  id: string;
  title: string;
  subtitle?: string;
  /** Optional external URL (e.g. Bluesky feed, Mastodon link, relay host). */
  url?: string;
}

export type SocialSidebarModuleId =
  | "trends"
  | "trending-tags"
  | "who-to-follow"
  | "discover-feeds"
  | "trending-links"
  | "relays"
  | "communities";

export interface SocialSidebarResponse {
  provider: SocialProvider;
  trends: SocialTrendItem[];
  suggestions: SocialSuggestedActor[];
  links: SocialSidebarLink[];
  /** Which secondary module the links list represents. */
  linksModule?: SocialSidebarModuleId;
}

export interface SocialSearchResponse {
  actors: SocialSuggestedActor[];
}
