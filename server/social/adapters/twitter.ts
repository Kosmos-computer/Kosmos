/**
 * X (Twitter) API v2 adapter — verify token, home timeline, profile, thread,
 * and engagement. Maps tweet entities onto the shared Social* DTOs.
 *
 * Expects an OAuth 2.0 *user-context* Bearer token (not app-only bearer).
 */
import type {
  SocialAuthor,
  SocialEmbed,
  SocialFeedPost,
  SocialProfile,
  SocialThreadResponse,
} from "../../../shared/social.js";

const API_BASE = "https://api.x.com/2";

const TWEET_FIELDS = [
  "created_at",
  "public_metrics",
  "conversation_id",
  "in_reply_to_user_id",
  "referenced_tweets",
  "attachments",
  "author_id",
].join(",");

const USER_FIELDS = ["profile_image_url", "description", "public_metrics", "name", "username"].join(",");
const MEDIA_FIELDS = ["preview_image_url", "url", "type", "alt_text"].join(",");
const EXPANSIONS = ["author_id", "attachments.media_keys", "referenced_tweets.id", "referenced_tweets.id.author_id"].join(",");

export interface TwitterClient {
  accessToken: string;
  userId: string;
  username: string;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
  };
}

interface TwitterMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
  alt_text?: string;
}

interface TwitterPublicMetrics {
  reply_count?: number;
  retweet_count?: number;
  like_count?: number;
  quote_count?: number;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  conversation_id?: string;
  public_metrics?: TwitterPublicMetrics;
  attachments?: { media_keys?: string[] };
  referenced_tweets?: Array<{ type: string; id: string }>;
}

interface TwitterIncludes {
  users?: TwitterUser[];
  media?: TwitterMedia[];
  tweets?: TwitterTweet[];
}

interface TwitterListResponse {
  data?: TwitterTweet[];
  includes?: TwitterIncludes;
  meta?: { next_token?: string; result_count?: number };
}

interface TwitterSingleResponse {
  data?: TwitterTweet;
  includes?: TwitterIncludes;
}

interface TwitterMeResponse {
  data: TwitterUser;
}

async function twitterRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as {
        detail?: string;
        title?: string;
        errors?: Array<{ message?: string; detail?: string }>;
      };
      detail =
        body.detail ||
        body.title ||
        body.errors?.[0]?.detail ||
        body.errors?.[0]?.message ||
        "";
      if (detail) detail = `: ${detail}`;
    } catch {
      /* ignore */
    }
    throw new Error(`X/Twitter ${response.status}${detail}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function userMap(includes?: TwitterIncludes): Map<string, TwitterUser> {
  return new Map((includes?.users ?? []).map((user) => [user.id, user]));
}

function mediaMap(includes?: TwitterIncludes): Map<string, TwitterMedia> {
  return new Map((includes?.media ?? []).map((media) => [media.media_key, media]));
}

function tweetMap(includes?: TwitterIncludes): Map<string, TwitterTweet> {
  return new Map((includes?.tweets ?? []).map((tweet) => [tweet.id, tweet]));
}

function mapAuthor(user: TwitterUser | undefined, fallbackId?: string): SocialAuthor {
  const handle = user?.username ?? fallbackId ?? "unknown";
  return {
    did: user?.id ?? fallbackId ?? handle,
    handle,
    displayName: user?.name?.trim() || handle,
    avatar: user?.profile_image_url,
  };
}

function mapEmbeds(
  tweet: TwitterTweet,
  mediaByKey: Map<string, TwitterMedia>,
  tweetsById: Map<string, TwitterTweet>,
  usersById: Map<string, TwitterUser>,
): SocialEmbed[] | undefined {
  const out: SocialEmbed[] = [];
  const keys = tweet.attachments?.media_keys ?? [];
  const images = keys
    .map((key) => mediaByKey.get(key))
    .filter((media): media is TwitterMedia => Boolean(media && media.type === "photo" && (media.url || media.preview_image_url)));
  if (images.length) {
    out.push({
      type: "images",
      images: images.map((image) => ({
        thumb: image.preview_image_url ?? image.url ?? "",
        fullsize: image.url ?? image.preview_image_url ?? "",
        alt: image.alt_text ?? "",
      })),
    });
  }
  const video = keys
    .map((key) => mediaByKey.get(key))
    .find((media) => media && (media.type === "video" || media.type === "animated_gif"));
  if (video) {
    out.push({
      type: "video",
      video: {
        thumbnail: video.preview_image_url,
        playlist: video.url,
        alt: video.alt_text,
      },
    });
  }
  const quoted = tweet.referenced_tweets?.find((ref) => ref.type === "quoted");
  if (quoted) {
    const quotedTweet = tweetsById.get(quoted.id);
    if (quotedTweet) {
      const author = quotedTweet.author_id ? usersById.get(quotedTweet.author_id) : undefined;
      out.push({
        type: "quote",
        quote: {
          uri: quotedTweet.id,
          cid: quotedTweet.id,
          author: mapAuthor(author, quotedTweet.author_id),
          text: quotedTweet.text,
        },
      });
    }
  }
  return out.length ? out : undefined;
}

export function mapTwitterTweet(
  tweet: TwitterTweet,
  includes?: TwitterIncludes,
): SocialFeedPost {
  const usersById = userMap(includes);
  const mediaByKey = mediaMap(includes);
  const tweetsById = tweetMap(includes);
  const author = mapAuthor(
    tweet.author_id ? usersById.get(tweet.author_id) : undefined,
    tweet.author_id,
  );
  const replyRef = tweet.referenced_tweets?.find((ref) => ref.type === "replied_to");
  const rootId = tweet.conversation_id ?? tweet.id;
  const parentId = replyRef?.id ?? tweet.id;
  return {
    uri: tweet.id,
    cid: tweet.id,
    author,
    text: tweet.text,
    createdAt: tweet.created_at ?? new Date().toISOString(),
    counts: {
      replies: tweet.public_metrics?.reply_count ?? 0,
      reposts: tweet.public_metrics?.retweet_count ?? 0,
      likes: tweet.public_metrics?.like_count ?? 0,
    },
    viewer: {},
    replyTarget: {
      parentUri: parentId,
      parentCid: parentId,
      rootUri: rootId,
      rootCid: rootId,
    },
    embeds: mapEmbeds(tweet, mediaByKey, tweetsById, usersById),
  };
}

function tweetQuery(): string {
  return new URLSearchParams({
    "tweet.fields": TWEET_FIELDS,
    "user.fields": USER_FIELDS,
    "media.fields": MEDIA_FIELDS,
    expansions: EXPANSIONS,
  }).toString();
}

export async function twitterVerifyCredentials(accessToken: string): Promise<TwitterUser> {
  const token = accessToken.trim();
  if (!token) throw new Error("X/Twitter access token is required");
  const response = await twitterRequest<TwitterMeResponse>(
    token,
    `/users/me?${new URLSearchParams({ "user.fields": USER_FIELDS }).toString()}`,
  );
  if (!response.data?.id) throw new Error("Could not verify X/Twitter credentials");
  return response.data;
}

export function createTwitterClient(
  accessToken: string,
  user: { id: string; username: string },
): TwitterClient {
  return {
    accessToken: accessToken.trim(),
    userId: user.id,
    username: user.username,
  };
}

export async function twitterGetHomeTimeline(
  client: TwitterClient,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const params = new URLSearchParams({
    max_results: String(Math.min(Math.max(opts.limit ?? 30, 5), 100)),
    "tweet.fields": TWEET_FIELDS,
    "user.fields": USER_FIELDS,
    "media.fields": MEDIA_FIELDS,
    expansions: EXPANSIONS,
  });
  if (opts.cursor) params.set("pagination_token", opts.cursor);
  const response = await twitterRequest<TwitterListResponse>(
    client.accessToken,
    `/users/${encodeURIComponent(client.userId)}/timelines/reverse_chronological?${params.toString()}`,
  );
  return {
    posts: (response.data ?? []).map((tweet) => mapTwitterTweet(tweet, response.includes)),
    cursor: response.meta?.next_token,
  };
}

export async function twitterGetProfile(
  client: TwitterClient,
  actor: string,
): Promise<SocialProfile> {
  const cleaned = actor.trim().replace(/^@/, "");
  if (!cleaned) throw new Error("Username or user id is required");
  const byId = /^\d+$/.test(cleaned);
  const path = byId
    ? `/users/${encodeURIComponent(cleaned)}?user.fields=${USER_FIELDS}`
    : `/users/by/username/${encodeURIComponent(cleaned)}?user.fields=${USER_FIELDS}`;
  const response = await twitterRequest<{ data: TwitterUser }>(client.accessToken, path);
  const user = response.data;
  if (!user?.id) throw new Error("X/Twitter user not found");
  return {
    did: user.id,
    handle: user.username,
    displayName: user.name?.trim() || user.username,
    description: user.description,
    avatar: user.profile_image_url,
    followersCount: user.public_metrics?.followers_count ?? 0,
    followsCount: user.public_metrics?.following_count ?? 0,
    postsCount: user.public_metrics?.tweet_count ?? 0,
  };
}

export async function twitterGetAuthorFeed(
  client: TwitterClient,
  opts: { userId: string; limit?: number; cursor?: string },
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const params = new URLSearchParams({
    max_results: String(Math.min(Math.max(opts.limit ?? 30, 5), 100)),
    "tweet.fields": TWEET_FIELDS,
    "user.fields": USER_FIELDS,
    "media.fields": MEDIA_FIELDS,
    expansions: EXPANSIONS,
    exclude: "replies",
  });
  if (opts.cursor) params.set("pagination_token", opts.cursor);
  const response = await twitterRequest<TwitterListResponse>(
    client.accessToken,
    `/users/${encodeURIComponent(opts.userId)}/tweets?${params.toString()}`,
  );
  return {
    posts: (response.data ?? []).map((tweet) => mapTwitterTweet(tweet, response.includes)),
    cursor: response.meta?.next_token,
  };
}

export async function twitterGetTweetThread(
  client: TwitterClient,
  tweetId: string,
): Promise<SocialThreadResponse> {
  const id = tweetId.trim();
  if (!id) throw new Error("Tweet id is required");
  const response = await twitterRequest<TwitterSingleResponse>(
    client.accessToken,
    `/tweets/${encodeURIComponent(id)}?${tweetQuery()}`,
  );
  if (!response.data) throw new Error("Tweet not found");
  const post = mapTwitterTweet(response.data, response.includes);

  // Conversation search requires elevated access; return the focal tweet when unavailable.
  let replies: SocialFeedPost[] = [];
  try {
    const conversationId = response.data.conversation_id ?? id;
    const params = new URLSearchParams({
      query: `conversation_id:${conversationId}`,
      max_results: "50",
      "tweet.fields": TWEET_FIELDS,
      "user.fields": USER_FIELDS,
      "media.fields": MEDIA_FIELDS,
      expansions: EXPANSIONS,
    });
    const search = await twitterRequest<TwitterListResponse>(
      client.accessToken,
      `/tweets/search/recent?${params.toString()}`,
    );
    replies = (search.data ?? [])
      .filter((tweet) => tweet.id !== id)
      .map((tweet) => mapTwitterTweet(tweet, search.includes));
  } catch {
    /* Search is optional — Basic tier may not include it. */
  }

  return { post, ancestors: [], replies };
}

export async function twitterCreateTweet(
  client: TwitterClient,
  input: { text: string; inReplyToId?: string },
): Promise<{ uri: string; cid: string }> {
  const body: Record<string, unknown> = { text: input.text };
  if (input.inReplyToId) {
    body.reply = { in_reply_to_tweet_id: input.inReplyToId };
  }
  const response = await twitterRequest<{ data: { id: string; text: string } }>(
    client.accessToken,
    "/tweets",
    { method: "POST", body: JSON.stringify(body) },
  );
  const id = response.data?.id;
  if (!id) throw new Error("X/Twitter did not return a tweet id");
  return { uri: id, cid: id };
}

export async function twitterLike(client: TwitterClient, tweetId: string): Promise<{ uri: string }> {
  await twitterRequest(client.accessToken, `/users/${encodeURIComponent(client.userId)}/likes`, {
    method: "POST",
    body: JSON.stringify({ tweet_id: tweetId }),
  });
  return { uri: tweetId };
}

export async function twitterUnlike(client: TwitterClient, tweetId: string): Promise<void> {
  await twitterRequest(
    client.accessToken,
    `/users/${encodeURIComponent(client.userId)}/likes/${encodeURIComponent(tweetId)}`,
    { method: "DELETE" },
  );
}

export async function twitterRetweet(
  client: TwitterClient,
  tweetId: string,
): Promise<{ uri: string }> {
  await twitterRequest(
    client.accessToken,
    `/users/${encodeURIComponent(client.userId)}/retweets`,
    { method: "POST", body: JSON.stringify({ tweet_id: tweetId }) },
  );
  return { uri: tweetId };
}

export async function twitterUnretweet(client: TwitterClient, tweetId: string): Promise<void> {
  await twitterRequest(
    client.accessToken,
    `/users/${encodeURIComponent(client.userId)}/retweets/${encodeURIComponent(tweetId)}`,
    { method: "DELETE" },
  );
}

export async function twitterFollow(
  client: TwitterClient,
  targetUserId: string,
): Promise<{ uri: string }> {
  await twitterRequest(
    client.accessToken,
    `/users/${encodeURIComponent(client.userId)}/following`,
    { method: "POST", body: JSON.stringify({ target_user_id: targetUserId }) },
  );
  return { uri: targetUserId };
}

export async function twitterUnfollow(client: TwitterClient, targetUserId: string): Promise<void> {
  await twitterRequest(
    client.accessToken,
    `/users/${encodeURIComponent(client.userId)}/following/${encodeURIComponent(targetUserId)}`,
    { method: "DELETE" },
  );
}

export async function twitterLookupUserId(client: TwitterClient, actor: string): Promise<string> {
  const cleaned = actor.trim().replace(/^@/, "");
  if (!cleaned) throw new Error("Username or user id is required");
  if (/^\d+$/.test(cleaned)) return cleaned;
  const response = await twitterRequest<{ data: TwitterUser }>(
    client.accessToken,
    `/users/by/username/${encodeURIComponent(cleaned)}`,
  );
  if (!response.data?.id) throw new Error("X/Twitter user not found");
  return response.data.id;
}

function mapTwitterSuggestedUser(user: TwitterUser): import("../../../shared/social.js").SocialSuggestedActor {
  return {
    did: user.id,
    handle: user.username,
    displayName: user.name?.trim() || user.username,
    avatar: user.profile_image_url,
    description: user.description?.trim() || undefined,
  };
}

export async function twitterSearchUsers(
  client: TwitterClient,
  query: string,
  limit = 10,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  const q = query.trim().replace(/^@/, "");
  if (!q) return [];
  try {
    const response = await twitterRequest<{ data?: TwitterUser[] }>(
      client.accessToken,
      `/users/search?query=${encodeURIComponent(q)}&max_results=${Math.min(Math.max(limit, 1), 20)}&user.fields=${USER_FIELDS}`,
    );
    return (response.data ?? []).map(mapTwitterSuggestedUser);
  } catch {
    // Fallback: exact username lookup when search endpoint is unavailable.
    try {
      const response = await twitterRequest<{ data: TwitterUser }>(
        client.accessToken,
        `/users/by/username/${encodeURIComponent(q)}?user.fields=${USER_FIELDS}`,
      );
      return response.data ? [mapTwitterSuggestedUser(response.data)] : [];
    } catch {
      return [];
    }
  }
}

export async function twitterGetSuggestions(
  client: TwitterClient,
  limit = 8,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  // X API no longer exposes a dedicated “who to follow” endpoint for most apps.
  // Seed suggestions from recent home-timeline authors the viewer does not follow.
  try {
    const timeline = await twitterGetHomeTimeline(client, { limit: 40 });
    const seen = new Set<string>([client.userId]);
    const actors: import("../../../shared/social.js").SocialSuggestedActor[] = [];
    for (const post of timeline.posts) {
      if (seen.has(post.author.did)) continue;
      if (post.viewer.following) continue;
      seen.add(post.author.did);
      actors.push({
        did: post.author.did,
        handle: post.author.handle,
        displayName: post.author.displayName,
        avatar: post.author.avatar,
      });
      if (actors.length >= limit) break;
    }
    return actors;
  } catch {
    return [];
  }
}
