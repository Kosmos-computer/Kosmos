/**
 * Reddit OAuth API adapter — verify token, home feed, profile, comments, and
 * engagement. Maps Reddit Listing / Thing entities onto the shared Social* DTOs.
 *
 * Auth model mirrors RedReader (https://github.com/QuantumBadger/RedReader):
 * user-context OAuth2 bearer token against https://oauth.reddit.com with a
 * descriptive User-Agent. Create an "installed app" at https://old.reddit.com/prefs/apps
 * (scopes: identity, read, submit, vote, mysubreddits, history, subscribe).
 */
import type {
  SocialAuthor,
  SocialEmbed,
  SocialFeedPost,
  SocialProfile,
  SocialThreadResponse,
} from "../../../shared/social.js";

const OAUTH_BASE = "https://oauth.reddit.com";
const USER_AGENT = "arco-os:social:v1.0.0 (by /u/arco-os)";

export interface RedditClient {
  accessToken: string;
  username: string;
  /** Default subreddit for new posts (without r/ prefix). */
  defaultSubreddit?: string;
}

interface RedditListing<T> {
  kind: string;
  data: {
    after?: string | null;
    before?: string | null;
    children: Array<{ kind: string; data: T }>;
  };
}

interface RedditAccount {
  id: string;
  name: string;
  icon_img?: string;
  snoovatar_img?: string;
  subreddit?: {
    display_name?: string;
    public_description?: string;
    subscribers?: number;
    banner_img?: string;
    icon_img?: string;
  };
  link_karma?: number;
  comment_karma?: number;
  total_karma?: number;
  created_utc?: number;
}

interface RedditLink {
  id: string;
  name: string;
  title?: string;
  selftext?: string;
  author?: string;
  author_fullname?: string;
  subreddit?: string;
  subreddit_name_prefixed?: string;
  created_utc?: number;
  score?: number;
  ups?: number;
  num_comments?: number;
  permalink?: string;
  url?: string;
  is_self?: boolean;
  is_video?: boolean;
  thumbnail?: string;
  preview?: {
    images?: Array<{
      source?: { url?: string };
      resolutions?: Array<{ url?: string }>;
    }>;
  };
  media?: {
    reddit_video?: { fallback_url?: string; scrubber_media_url?: string };
  };
  likes?: boolean | null;
  over_18?: boolean;
}

interface RedditComment {
  id: string;
  name: string;
  body?: string;
  author?: string;
  created_utc?: number;
  score?: number;
  ups?: number;
  likes?: boolean | null;
  replies?: "" | RedditListing<RedditComment>;
  permalink?: string;
}

async function redditRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${OAUTH_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("User-Agent", USER_AGENT);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  }

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as {
        message?: string;
        error?: number | string;
        reason?: string;
      };
      detail = body.message || body.reason || (body.error != null ? String(body.error) : "");
      if (detail) detail = `: ${detail}`;
    } catch {
      /* ignore */
    }
    throw new Error(`Reddit ${response.status}${detail}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function mapAuthor(name: string | undefined, id?: string): SocialAuthor {
  const handle = (name || "unknown").replace(/^u\//, "");
  return {
    did: id || handle,
    handle,
    displayName: handle,
  };
}

function mapEmbeds(link: RedditLink): SocialEmbed[] | undefined {
  const out: SocialEmbed[] = [];
  const previewUrl = link.preview?.images?.[0]?.source?.url
    ? decodeHtmlEntities(link.preview.images[0].source.url)
    : undefined;
  const thumb =
    link.thumbnail && link.thumbnail.startsWith("http")
      ? decodeHtmlEntities(link.thumbnail)
      : undefined;

  if (link.is_video && link.media?.reddit_video?.fallback_url) {
    out.push({
      type: "video",
      video: {
        thumbnail: previewUrl ?? thumb,
        playlist: link.media.reddit_video.fallback_url,
        alt: link.title,
      },
    });
  } else if (!link.is_self && link.url && !link.url.includes("reddit.com")) {
    const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(link.url) || link.url.includes("i.redd.it");
    if (isImage) {
      out.push({
        type: "images",
        images: [
          {
            thumb: previewUrl ?? thumb ?? link.url,
            fullsize: link.url,
            alt: link.title ?? "",
          },
        ],
      });
    } else {
      out.push({
        type: "external",
        external: {
          uri: link.url,
          title: link.title ?? link.url,
          description: link.subreddit_name_prefixed ?? "",
          thumb: previewUrl ?? thumb,
        },
      });
    }
  } else if (previewUrl) {
    out.push({
      type: "images",
      images: [{ thumb: previewUrl, fullsize: previewUrl, alt: link.title ?? "" }],
    });
  }

  return out.length ? out : undefined;
}

function postText(link: RedditLink): string {
  const title = (link.title ?? "").trim();
  const body = (link.selftext ?? "").trim();
  const sub = link.subreddit_name_prefixed ? `[${link.subreddit_name_prefixed}] ` : "";
  if (title && body) return `${sub}${title}\n\n${body}`;
  if (title) return `${sub}${title}`;
  return `${sub}${body}`;
}

export function mapRedditLink(link: RedditLink): SocialFeedPost {
  const uri = link.name || `t3_${link.id}`;
  return {
    uri,
    cid: uri,
    author: mapAuthor(link.author, link.author_fullname),
    text: postText(link),
    createdAt: link.created_utc
      ? new Date(link.created_utc * 1000).toISOString()
      : new Date().toISOString(),
    counts: {
      replies: link.num_comments ?? 0,
      reposts: 0,
      likes: link.score ?? link.ups ?? 0,
    },
    viewer: {
      like: link.likes === true ? uri : undefined,
    },
    replyTarget: {
      parentUri: uri,
      parentCid: uri,
      rootUri: uri,
      rootCid: uri,
    },
    embeds: mapEmbeds(link),
  };
}

export function mapRedditComment(comment: RedditComment): SocialFeedPost {
  const uri = comment.name || `t1_${comment.id}`;
  return {
    uri,
    cid: uri,
    author: mapAuthor(comment.author),
    text: (comment.body ?? "").trim(),
    createdAt: comment.created_utc
      ? new Date(comment.created_utc * 1000).toISOString()
      : new Date().toISOString(),
    counts: {
      replies: 0,
      reposts: 0,
      likes: comment.score ?? comment.ups ?? 0,
    },
    viewer: {
      like: comment.likes === true ? uri : undefined,
    },
    replyTarget: {
      parentUri: uri,
      parentCid: uri,
      rootUri: uri,
      rootCid: uri,
    },
  };
}

function flattenComments(
  listing: RedditListing<RedditComment> | "" | undefined,
  depth = 0,
): SocialFeedPost[] {
  if (!listing || typeof listing === "string" || depth > 4) return [];
  const out: SocialFeedPost[] = [];
  for (const child of listing.data.children) {
    if (child.kind !== "t1" || !child.data?.body) continue;
    out.push(mapRedditComment(child.data));
    out.push(...flattenComments(child.data.replies, depth + 1));
  }
  return out;
}

export function normalizeSubreddit(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().replace(/^\/?r\//i, "").replace(/\/$/, "");
  return value || undefined;
}

export async function redditVerifyCredentials(accessToken: string): Promise<RedditAccount> {
  const token = accessToken.trim();
  if (!token) throw new Error("Reddit access token is required");
  const me = await redditRequest<RedditAccount>(token, "/api/v1/me");
  if (!me?.name) throw new Error("Could not verify Reddit credentials");
  return me;
}

export function createRedditClient(
  accessToken: string,
  username: string,
  defaultSubreddit?: string,
): RedditClient {
  return {
    accessToken: accessToken.trim(),
    username: username.replace(/^u\//, ""),
    defaultSubreddit: normalizeSubreddit(defaultSubreddit),
  };
}

export async function redditGetHomeTimeline(
  client: RedditClient,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const params = new URLSearchParams({
    limit: String(Math.min(Math.max(opts.limit ?? 25, 1), 100)),
    raw_json: "1",
  });
  if (opts.cursor) params.set("after", opts.cursor);
  const listing = await redditRequest<RedditListing<RedditLink>>(
    client.accessToken,
    `/?${params.toString()}`,
  );
  return {
    posts: listing.data.children
      .filter((child) => child.kind === "t3")
      .map((child) => mapRedditLink(child.data)),
    cursor: listing.data.after ?? undefined,
  };
}

export async function redditGetProfile(
  client: RedditClient,
  actor: string,
): Promise<SocialProfile> {
  const cleaned = actor.trim().replace(/^\/?u\//i, "").replace(/^@/, "");
  if (!cleaned) throw new Error("Username is required");
  const about = await redditRequest<{ data: RedditAccount }>(
    client.accessToken,
    `/user/${encodeURIComponent(cleaned)}/about?raw_json=1`,
  );
  const user = about.data;
  const handle = user.name || cleaned;
  const avatar = (user.snoovatar_img || user.icon_img || user.subreddit?.icon_img || "")
    .split("?")[0]
    .replace(/&amp;/g, "&");
  return {
    did: user.id || handle,
    handle,
    displayName: handle,
    description: user.subreddit?.public_description,
    avatar: avatar || undefined,
    banner: user.subreddit?.banner_img
      ? decodeHtmlEntities(user.subreddit.banner_img.split("?")[0])
      : undefined,
    followersCount: user.subreddit?.subscribers ?? 0,
    followsCount: 0,
    postsCount: user.link_karma ?? 0,
  };
}

export async function redditGetAuthorFeed(
  client: RedditClient,
  opts: { username: string; limit?: number; cursor?: string },
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const params = new URLSearchParams({
    limit: String(Math.min(Math.max(opts.limit ?? 25, 1), 100)),
    raw_json: "1",
  });
  if (opts.cursor) params.set("after", opts.cursor);
  const listing = await redditRequest<RedditListing<RedditLink>>(
    client.accessToken,
    `/user/${encodeURIComponent(opts.username)}/submitted?${params.toString()}`,
  );
  return {
    posts: listing.data.children
      .filter((child) => child.kind === "t3")
      .map((child) => mapRedditLink(child.data)),
    cursor: listing.data.after ?? undefined,
  };
}

export async function redditGetPostThread(
  client: RedditClient,
  thingId: string,
): Promise<SocialThreadResponse> {
  const raw = thingId.trim();
  if (!raw) throw new Error("Post id is required");
  // Accept t3_xxx, bare id, or a permalink path segment.
  const id = raw.replace(/^t3_/, "").split("/").filter(Boolean).pop() ?? raw;
  const response = await redditRequest<[RedditListing<RedditLink>, RedditListing<RedditComment>]>(
    client.accessToken,
    `/comments/${encodeURIComponent(id)}?limit=100&raw_json=1&sort=top`,
  );
  const postListing = response[0];
  const commentListing = response[1];
  const link = postListing?.data?.children?.find((child) => child.kind === "t3")?.data;
  if (!link) throw new Error("Reddit post not found");
  return {
    post: mapRedditLink(link),
    ancestors: [],
    replies: flattenComments(commentListing),
  };
}

/**
 * Submit a self-post. Text may start with `r/subreddit:` to override the default.
 */
export async function redditCreatePost(
  client: RedditClient,
  input: { text: string },
): Promise<{ uri: string; cid: string }> {
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error("Post text is required");

  let subreddit = client.defaultSubreddit;
  let body = trimmed;
  const prefix = trimmed.match(/^r\/([A-Za-z0-9_]+)\s*[:\-]\s*([\s\S]+)$/i);
  if (prefix) {
    subreddit = prefix[1];
    body = prefix[2].trim();
  }
  if (!subreddit) {
    throw new Error(
      "Reddit posts need a subreddit — set a default on connect, or start with r/name: title",
    );
  }

  const newline = body.indexOf("\n");
  const title = (newline >= 0 ? body.slice(0, newline) : body).trim().slice(0, 300);
  const selftext = newline >= 0 ? body.slice(newline + 1).trim() : "";
  if (!title) throw new Error("Reddit post title is required");

  const form = new URLSearchParams({
    api_type: "json",
    kind: "self",
    sr: subreddit,
    title,
    text: selftext,
  });
  const response = await redditRequest<{
    json?: { data?: { id?: string; name?: string }; errors?: unknown[] };
  }>(client.accessToken, "/api/submit", { method: "POST", body: form.toString() });

  const name = response.json?.data?.name || (response.json?.data?.id ? `t3_${response.json.data.id}` : undefined);
  if (!name) {
    const errors = response.json?.errors;
    throw new Error(
      errors?.length ? `Reddit submit failed: ${JSON.stringify(errors)}` : "Reddit submit failed",
    );
  }
  return { uri: name, cid: name };
}

export async function redditCreateComment(
  client: RedditClient,
  input: { parentId: string; text: string },
): Promise<{ uri: string; cid: string }> {
  const form = new URLSearchParams({
    api_type: "json",
    thing_id: input.parentId.startsWith("t") ? input.parentId : `t3_${input.parentId}`,
    text: input.text,
  });
  const response = await redditRequest<{
    json?: {
      data?: { things?: Array<{ data?: { name?: string; id?: string } }> };
      errors?: unknown[];
    };
  }>(client.accessToken, "/api/comment", { method: "POST", body: form.toString() });

  const thing = response.json?.data?.things?.[0]?.data;
  const name = thing?.name || (thing?.id ? `t1_${thing.id}` : undefined);
  if (!name) {
    const errors = response.json?.errors;
    throw new Error(
      errors?.length ? `Reddit comment failed: ${JSON.stringify(errors)}` : "Reddit comment failed",
    );
  }
  return { uri: name, cid: name };
}

export async function redditVote(
  client: RedditClient,
  thingId: string,
  dir: 1 | 0 | -1,
): Promise<void> {
  const form = new URLSearchParams({
    id: thingId.startsWith("t") ? thingId : `t3_${thingId}`,
    dir: String(dir),
  });
  await redditRequest(client.accessToken, "/api/vote", {
    method: "POST",
    body: form.toString(),
  });
}

/** Reddit has no repost; crosspost when possible, otherwise error clearly. */
export async function redditCrosspost(
  client: RedditClient,
  thingId: string,
): Promise<{ uri: string }> {
  const subreddit = client.defaultSubreddit;
  if (!subreddit) {
    throw new Error("Set a default subreddit to crosspost on Reddit");
  }
  const form = new URLSearchParams({
    api_type: "json",
    kind: "crosspost",
    sr: subreddit,
    crosspost_fullname: thingId.startsWith("t3_") ? thingId : `t3_${thingId}`,
    title: "Crosspost",
  });
  const response = await redditRequest<{
    json?: { data?: { name?: string; id?: string }; errors?: unknown[] };
  }>(client.accessToken, "/api/submit", { method: "POST", body: form.toString() });
  const name = response.json?.data?.name || (response.json?.data?.id ? `t3_${response.json.data.id}` : undefined);
  if (!name) throw new Error("Reddit crosspost failed");
  return { uri: name };
}

export async function redditSubscribe(
  client: RedditClient,
  subredditOrUser: string,
  action: "sub" | "unsub" = "sub",
): Promise<{ uri: string }> {
  const cleaned = subredditOrUser.trim().replace(/^\/?(r|u)\//i, "");
  if (!cleaned) throw new Error("Subreddit or username is required");
  // Prefer subreddit subscribe; user "follow" maps to r/u_username when possible.
  const sr = cleaned;
  const form = new URLSearchParams({
    action,
    sr_name: sr,
  });
  await redditRequest(client.accessToken, "/api/subscribe", {
    method: "POST",
    body: form.toString(),
  });
  return { uri: sr };
}

export async function redditSearchActors(
  client: RedditClient,
  query: string,
  limit = 10,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  const q = query.trim().replace(/^\/?u\//i, "").replace(/^@/, "");
  if (!q) return [];

  // Exact user lookup first (cheap + reliable).
  try {
    const profile = await redditGetProfile(client, q);
    return [
      {
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
        avatar: profile.avatar,
        description: profile.description,
      },
    ];
  } catch {
    /* fall through to subreddit / search */
  }

  try {
    const params = new URLSearchParams({
      q,
      type: "user,sr",
      limit: String(Math.min(Math.max(limit, 1), 25)),
      raw_json: "1",
    });
    const response = await redditRequest<{
      data?: {
        children?: Array<{
          kind: string;
          data: {
            id?: string;
            name?: string;
            display_name?: string;
            display_name_prefixed?: string;
            title?: string;
            public_description?: string;
            icon_img?: string;
            community_icon?: string;
            subscribers?: number;
          };
        }>;
      };
    }>(client.accessToken, `/search?${params.toString()}`);

    return (response.data?.children ?? [])
      .map((child) => {
        const data = child.data;
        if (child.kind === "t2") {
          const handle = data.name || q;
          return {
            did: data.id || handle,
            handle,
            displayName: handle,
            avatar: data.icon_img?.split("?")[0],
            description: data.public_description || data.title,
          };
        }
        if (child.kind === "t5") {
          const handle = data.display_name || data.name || q;
          const icon = (data.community_icon || data.icon_img || "")
            .split("?")[0]
            .replace(/&amp;/g, "&");
          return {
            did: data.id || handle,
            handle: `r/${handle}`,
            displayName: data.display_name_prefixed || `r/${handle}`,
            avatar: icon || undefined,
            description:
              data.public_description ||
              data.title ||
              (data.subscribers != null ? `${data.subscribers} subscribers` : undefined),
          };
        }
        return null;
      })
      .filter((actor): actor is NonNullable<typeof actor> => Boolean(actor))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function redditGetSuggestions(
  client: RedditClient,
  limit = 8,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  try {
    const listing = await redditRequest<
      RedditListing<{
        id?: string;
        name?: string;
        display_name?: string;
        display_name_prefixed?: string;
        public_description?: string;
        title?: string;
        icon_img?: string;
        community_icon?: string;
        subscribers?: number;
      }>
    >(client.accessToken, `/subreddits/popular?limit=${limit}&raw_json=1`);
    return listing.data.children
      .filter((child) => child.kind === "t5")
      .map((child) => {
        const data = child.data;
        const handle = data.display_name || data.name || "reddit";
        const icon = (data.community_icon || data.icon_img || "")
          .split("?")[0]
          .replace(/&amp;/g, "&");
        return {
          did: data.id || handle,
          handle: `r/${handle}`,
          displayName: data.display_name_prefixed || `r/${handle}`,
          avatar: icon || undefined,
          description:
            data.public_description ||
            data.title ||
            (data.subscribers != null ? `${data.subscribers} subscribers` : undefined),
        };
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function redditGetTrendingSubreddits(
  client: RedditClient,
  limit = 8,
): Promise<import("../../../shared/social.js").SocialTrendItem[]> {
  const suggestions = await redditGetSuggestions(client, limit);
  return suggestions.map((actor, index) => ({
    id: actor.did || `reddit-trend-${index}`,
    title: actor.displayName || actor.handle,
    category: "Subreddit",
    postCount: actor.description,
    query: actor.handle,
  }));
}
