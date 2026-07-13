/**
 * Bluesky / AT Protocol adapter — session, timeline, profile, thread, and engagement.
 */
import { AtpAgent, RichText } from "@atproto/api";
import type { AppBskyFeedDefs } from "@atproto/api";
import type {
  SocialAuthor,
  SocialEmbed,
  SocialFeedPost,
  SocialProfile,
  SocialThreadResponse,
} from "../../../shared/social.js";
import type { BlueskySessionTokens } from "../socialStore.js";
import { BLUESKY_DEFAULT_SERVICE } from "../socialStore.js";

export function createBlueskyAgent(service = BLUESKY_DEFAULT_SERVICE): AtpAgent {
  return new AtpAgent({ service: service.replace(/\/$/, "") });
}

export async function blueskyLogin(
  agent: AtpAgent,
  input: { identifier: string; password: string },
): Promise<BlueskySessionTokens> {
  const result = await agent.login({
    identifier: input.identifier.trim(),
    password: input.password,
  });
  return {
    accessJwt: result.data.accessJwt,
    refreshJwt: result.data.refreshJwt,
    did: result.data.did,
    handle: result.data.handle,
    active: result.data.active,
  };
}

export async function blueskyResumeSession(
  agent: AtpAgent,
  session: BlueskySessionTokens,
): Promise<BlueskySessionTokens> {
  await agent.resumeSession({
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt,
    did: session.did,
    handle: session.handle,
    active: session.active ?? true,
  });
  const next = agent.session;
  if (!next?.accessJwt || !next.refreshJwt) {
    throw new Error("Bluesky session resume failed");
  }
  return {
    accessJwt: next.accessJwt,
    refreshJwt: next.refreshJwt,
    did: next.did,
    handle: next.handle,
    active: next.active,
  };
}

function recordText(record: unknown): string {
  if (record && typeof record === "object" && "text" in record) {
    const text = (record as { text?: unknown }).text;
    if (typeof text === "string") return text;
  }
  return "";
}

function recordCreatedAt(record: unknown, fallback: string): string {
  if (record && typeof record === "object" && "createdAt" in record) {
    const createdAt = (record as { createdAt?: unknown }).createdAt;
    if (typeof createdAt === "string") return createdAt;
  }
  return fallback;
}

function replyRefs(record: unknown): {
  parentUri?: string;
  parentCid?: string;
  rootUri?: string;
  rootCid?: string;
} {
  if (!record || typeof record !== "object" || !("reply" in record)) return {};
  const reply = (record as {
    reply?: {
      parent?: { uri?: string; cid?: string };
      root?: { uri?: string; cid?: string };
    };
  }).reply;
  return {
    parentUri: reply?.parent?.uri,
    parentCid: reply?.parent?.cid,
    rootUri: reply?.root?.uri,
    rootCid: reply?.root?.cid,
  };
}

function mapAuthor(author: {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}): SocialAuthor {
  return {
    did: author.did,
    handle: author.handle,
    displayName: author.displayName?.trim() || author.handle,
    avatar: author.avatar,
  };
}

function mapEmbeds(embed: AppBskyFeedDefs.PostView["embed"]): SocialEmbed[] | undefined {
  if (!embed || typeof embed !== "object" || !("$type" in embed)) return undefined;
  const type = String((embed as { $type?: string }).$type ?? "");
  const out: SocialEmbed[] = [];

  if (type === "app.bsky.embed.images#view") {
    const images = (embed as {
      images?: Array<{ thumb?: string; fullsize?: string; alt?: string }>;
    }).images;
    if (images?.length) {
      out.push({
        type: "images",
        images: images
          .filter((image) => image.thumb || image.fullsize)
          .map((image) => ({
            thumb: image.thumb ?? image.fullsize ?? "",
            fullsize: image.fullsize ?? image.thumb ?? "",
            alt: image.alt ?? "",
          })),
      });
    }
  } else if (type === "app.bsky.embed.video#view") {
    const video = embed as { thumbnail?: string; playlist?: string; alt?: string };
    out.push({
      type: "video",
      video: {
        thumbnail: video.thumbnail,
        playlist: video.playlist,
        alt: video.alt,
      },
    });
  } else if (type === "app.bsky.embed.external#view") {
    const external = (embed as {
      external?: { uri?: string; title?: string; description?: string; thumb?: string };
    }).external;
    if (external?.uri) {
      out.push({
        type: "external",
        external: {
          uri: external.uri,
          title: external.title ?? external.uri,
          description: external.description ?? "",
          thumb: external.thumb,
        },
      });
    }
  } else if (type === "app.bsky.embed.record#view") {
    const record = (embed as {
      record?: {
        $type?: string;
        uri?: string;
        cid?: string;
        author?: { did: string; handle: string; displayName?: string; avatar?: string };
        value?: { text?: string };
      };
    }).record;
    if (record?.$type === "app.bsky.embed.record#viewRecord" && record.uri) {
      out.push({
        type: "quote",
        quote: {
          uri: record.uri,
          cid: record.cid,
          author: record.author ? mapAuthor(record.author) : undefined,
          text: typeof record.value?.text === "string" ? record.value.text : "",
        },
      });
    }
  } else if (type === "app.bsky.embed.recordWithMedia#view") {
    const combined = embed as {
      media?: { $type?: string; [key: string]: unknown };
      record?: {
        record?: {
          $type?: string;
          uri?: string;
          cid?: string;
          author?: { did: string; handle: string; displayName?: string; avatar?: string };
          value?: { text?: string };
        };
      };
    };
    if (combined.media?.$type) {
      const mediaEmbeds = mapEmbeds(combined.media as AppBskyFeedDefs.PostView["embed"]);
      if (mediaEmbeds) out.push(...mediaEmbeds);
    }
    const quoted = combined.record?.record;
    if (quoted?.uri) {
      out.push({
        type: "quote",
        quote: {
          uri: quoted.uri,
          cid: quoted.cid,
          author: quoted.author ? mapAuthor(quoted.author) : undefined,
          text: typeof quoted.value?.text === "string" ? quoted.value.text : "",
        },
      });
    }
  }

  return out.length ? out : undefined;
}

export function mapPostView(post: AppBskyFeedDefs.PostView): SocialFeedPost {
  const record = post.record;
  const reply = replyRefs(record);
  return {
    uri: post.uri,
    cid: post.cid,
    author: mapAuthor(post.author),
    text: recordText(record),
    createdAt: recordCreatedAt(record, post.indexedAt),
    counts: {
      replies: post.replyCount ?? 0,
      reposts: post.repostCount ?? 0,
      likes: post.likeCount ?? 0,
    },
    viewer: {
      like: post.viewer?.like,
      repost: post.viewer?.repost,
      following: post.author.viewer?.following,
    },
    replyTarget: {
      parentUri: post.uri,
      parentCid: post.cid,
      rootUri: reply.rootUri ?? post.uri,
      rootCid: reply.rootCid ?? post.cid,
    },
    embeds: mapEmbeds(post.embed),
  };
}

export function mapFeedViewPost(item: AppBskyFeedDefs.FeedViewPost): SocialFeedPost {
  return mapPostView(item.post);
}

export async function blueskyGetTimeline(
  agent: AtpAgent,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const result = await agent.getTimeline({
    limit: opts.limit ?? 30,
    cursor: opts.cursor,
  });
  return {
    posts: result.data.feed.map(mapFeedViewPost),
    cursor: result.data.cursor,
  };
}

export async function blueskyGetProfile(agent: AtpAgent, actor: string): Promise<SocialProfile> {
  const result = await agent.app.bsky.actor.getProfile({ actor });
  const profile = result.data;
  return {
    did: profile.did,
    handle: profile.handle,
    displayName: profile.displayName?.trim() || profile.handle,
    description: profile.description,
    avatar: profile.avatar,
    banner: profile.banner,
    followersCount: profile.followersCount ?? 0,
    followsCount: profile.followsCount ?? 0,
    postsCount: profile.postsCount ?? 0,
    viewer: {
      following: profile.viewer?.following,
      followedBy: profile.viewer?.followedBy,
    },
  };
}

export async function blueskyGetAuthorFeed(
  agent: AtpAgent,
  opts: { actor: string; limit?: number; cursor?: string },
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const result = await agent.app.bsky.feed.getAuthorFeed({
    actor: opts.actor,
    limit: opts.limit ?? 30,
    cursor: opts.cursor,
  });
  return {
    posts: result.data.feed.map(mapFeedViewPost),
    cursor: result.data.cursor,
  };
}

function isThreadViewPost(value: unknown): value is AppBskyFeedDefs.ThreadViewPost {
  return Boolean(
    value &&
      typeof value === "object" &&
      "$type" in value &&
      (value as { $type?: string }).$type === "app.bsky.feed.defs#threadViewPost" &&
      "post" in value,
  );
}

function collectAncestors(thread: AppBskyFeedDefs.ThreadViewPost): SocialFeedPost[] {
  const ancestors: SocialFeedPost[] = [];
  let parent = thread.parent;
  while (parent && isThreadViewPost(parent)) {
    ancestors.unshift(mapPostView(parent.post));
    parent = parent.parent;
  }
  return ancestors;
}

function collectReplies(replies: AppBskyFeedDefs.ThreadViewPost["replies"] | undefined): SocialFeedPost[] {
  if (!replies?.length) return [];
  const out: SocialFeedPost[] = [];
  for (const reply of replies) {
    if (!isThreadViewPost(reply)) continue;
    out.push(mapPostView(reply.post));
    // One nested level of replies is enough for the thread pane.
    if (reply.replies?.length) {
      for (const nested of reply.replies) {
        if (isThreadViewPost(nested)) out.push(mapPostView(nested.post));
      }
    }
  }
  return out;
}

export async function blueskyGetPostThread(
  agent: AtpAgent,
  uri: string,
): Promise<SocialThreadResponse> {
  const result = await agent.app.bsky.feed.getPostThread({ uri, depth: 6, parentHeight: 12 });
  const thread = result.data.thread;
  if (!isThreadViewPost(thread)) {
    throw new Error("Post thread not available");
  }
  return {
    post: mapPostView(thread.post),
    ancestors: collectAncestors(thread),
    replies: collectReplies(thread.replies),
  };
}

async function prepareText(agent: AtpAgent, text: string): Promise<{ text: string; facets?: RichText["facets"] }> {
  const rt = new RichText({ text });
  await rt.detectFacets(agent);
  return { text: rt.text, facets: rt.facets };
}

export async function blueskyCreatePost(agent: AtpAgent, text: string): Promise<{ uri: string; cid: string }> {
  const prepared = await prepareText(agent, text);
  return agent.post({
    text: prepared.text,
    facets: prepared.facets,
    createdAt: new Date().toISOString(),
  });
}

export async function blueskyReply(
  agent: AtpAgent,
  input: {
    text: string;
    parentUri: string;
    parentCid: string;
    rootUri: string;
    rootCid: string;
  },
): Promise<{ uri: string; cid: string }> {
  const prepared = await prepareText(agent, input.text);
  return agent.post({
    text: prepared.text,
    facets: prepared.facets,
    createdAt: new Date().toISOString(),
    reply: {
      parent: { uri: input.parentUri, cid: input.parentCid },
      root: { uri: input.rootUri, cid: input.rootCid },
    },
  });
}

export async function blueskyLike(
  agent: AtpAgent,
  uri: string,
  cid: string,
): Promise<{ uri: string }> {
  const result = await agent.like(uri, cid);
  return { uri: result.uri };
}

export async function blueskyUnlike(agent: AtpAgent, likeUri: string): Promise<void> {
  await agent.deleteLike(likeUri);
}

export async function blueskyRepost(
  agent: AtpAgent,
  uri: string,
  cid: string,
): Promise<{ uri: string }> {
  const result = await agent.repost(uri, cid);
  return { uri: result.uri };
}

export async function blueskyUnrepost(agent: AtpAgent, repostUri: string): Promise<void> {
  await agent.deleteRepost(repostUri);
}

export async function blueskyFollow(agent: AtpAgent, did: string): Promise<{ uri: string }> {
  const result = await agent.follow(did);
  return { uri: result.uri };
}

export async function blueskyUnfollow(agent: AtpAgent, followUri: string): Promise<void> {
  await agent.deleteFollow(followUri);
}

function formatPostCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M posts`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K posts`;
  return `${value} posts`;
}

function mapSuggestedActor(actor: {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  viewer?: { following?: string };
}): import("../../../shared/social.js").SocialSuggestedActor {
  return {
    did: actor.did,
    handle: actor.handle,
    displayName: actor.displayName?.trim() || actor.handle,
    avatar: actor.avatar,
    description: actor.description?.trim() || undefined,
    viewer: actor.viewer?.following ? { following: actor.viewer.following } : undefined,
  };
}

export async function blueskyGetSuggestions(
  agent: AtpAgent,
  limit = 8,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  const result = await agent.app.bsky.actor.getSuggestions({ limit });
  return (result.data.actors ?? []).map(mapSuggestedActor);
}

export async function blueskyGetTrends(
  agent: AtpAgent,
  limit = 6,
): Promise<import("../../../shared/social.js").SocialTrendItem[]> {
  try {
    const result = await agent.app.bsky.unspecced.getTrends({ limit });
    return (result.data.trends ?? []).map((trend) => ({
      id: trend.topic,
      title: trend.displayName || trend.topic,
      category: trend.category || (trend.status === "hot" ? "Hot" : "Trending"),
      postCount: formatPostCount(trend.postCount ?? 0),
      query: trend.displayName || trend.topic,
    }));
  } catch {
    const result = await agent.app.bsky.unspecced.getTrendingTopics({ limit });
    return (result.data.topics ?? []).map((topic) => ({
      id: topic.topic,
      title: topic.displayName || topic.topic,
      category: topic.description?.trim() || "Trending",
      query: topic.displayName || topic.topic,
    }));
  }
}

export async function blueskyGetDiscoverFeeds(
  agent: AtpAgent,
  limit = 5,
): Promise<import("../../../shared/social.js").SocialSidebarLink[]> {
  try {
    const result = await agent.app.bsky.unspecced.getPopularFeedGenerators({ limit });
    return (result.data.feeds ?? []).map((feed) => {
      const uri = feed.uri;
      const match = /^at:\/\/([^/]+)\/app\.bsky\.feed\.generator\/([^/]+)$/.exec(uri);
      const url = match
        ? `https://bsky.app/profile/${match[1]}/feed/${match[2]}`
        : undefined;
      return {
        id: uri,
        title: feed.displayName || feed.uri,
        subtitle: feed.description?.trim() || feed.creator?.handle,
        url,
      };
    });
  } catch {
    const result = await agent.app.bsky.unspecced.getSuggestedFeeds({ limit });
    return (result.data.feeds ?? []).map((feed) => ({
      id: feed.uri,
      title: feed.displayName || feed.uri,
      subtitle: feed.description?.trim() || feed.creator?.handle,
    }));
  }
}

export async function blueskySearchActors(
  agent: AtpAgent,
  query: string,
  limit = 10,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  const q = query.trim();
  if (!q) return [];
  const result = await agent.app.bsky.actor.searchActors({ q, limit });
  return (result.data.actors ?? []).map(mapSuggestedActor);
}
