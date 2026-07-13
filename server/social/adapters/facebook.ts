/**
 * Facebook Graph API adapter — verify token, Page/user feed, profile, comments,
 * and engagement. Maps Graph post entities onto the shared Social* DTOs.
 *
 * Prefers a Page access token + page id for posting; a user token works for /me.
 */
import type {
  SocialAuthor,
  SocialEmbed,
  SocialFeedPost,
  SocialProfile,
  SocialThreadResponse,
} from "../../../shared/social.js";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface FacebookClient {
  accessToken: string;
  /** User or Page id used as the feed/post actor. */
  actorId: string;
  handle: string;
  displayName: string;
  avatar?: string;
  isPage: boolean;
}

interface FacebookPicture {
  data?: { url?: string };
}

interface FacebookActor {
  id: string;
  name?: string;
  username?: string;
  about?: string;
  bio?: string;
  picture?: FacebookPicture | string;
  fan_count?: number;
  followers_count?: number;
  link?: string;
}

interface FacebookAttachmentMedia {
  image?: { src?: string };
  source?: string;
}

interface FacebookAttachment {
  type?: string;
  title?: string;
  description?: string;
  url?: string;
  media?: FacebookAttachmentMedia;
  subattachments?: { data?: FacebookAttachment[] };
}

interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  created_time?: string;
  from?: { id?: string; name?: string };
  permalink_url?: string;
  shares?: { count?: number };
  likes?: { summary?: { total_count?: number }; data?: unknown[] };
  comments?: { summary?: { total_count?: number }; data?: FacebookComment[] };
  attachments?: { data?: FacebookAttachment[] };
}

interface FacebookComment {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id?: string; name?: string };
  like_count?: number;
  comment_count?: number;
}

interface FacebookFeedResponse {
  data?: FacebookPost[];
  paging?: { cursors?: { after?: string }; next?: string };
}

function pictureUrl(picture: FacebookPicture | string | undefined): string | undefined {
  if (!picture) return undefined;
  if (typeof picture === "string") return picture;
  return picture.data?.url;
}

async function facebookRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}${separator}access_token=${encodeURIComponent(accessToken)}`;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as {
        error?: { message?: string; type?: string; code?: number };
      };
      if (body.error?.message) detail = `: ${body.error.message}`;
    } catch {
      /* ignore */
    }
    throw new Error(`Facebook ${response.status}${detail}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function mapAuthor(from: { id?: string; name?: string } | undefined, fallback?: string): SocialAuthor {
  const handle = from?.name?.trim() || from?.id || fallback || "facebook";
  return {
    did: from?.id ?? fallback ?? handle,
    handle,
    displayName: from?.name?.trim() || handle,
  };
}

function mapAttachments(post: FacebookPost): SocialEmbed[] | undefined {
  const attachments = post.attachments?.data ?? [];
  if (!attachments.length) return undefined;
  const out: SocialEmbed[] = [];
  const images: Array<{ thumb: string; fullsize: string; alt: string }> = [];
  for (const attachment of attachments) {
    const nested = attachment.subattachments?.data ?? [attachment];
    for (const item of nested) {
      const src = item.media?.image?.src;
      if (src && (item.type?.includes("photo") || item.type?.includes("album") || !item.media?.source)) {
        images.push({ thumb: src, fullsize: src, alt: item.title ?? "" });
      } else if (item.media?.source || item.type?.includes("video")) {
        out.push({
          type: "video",
          video: {
            thumbnail: item.media?.image?.src,
            playlist: item.media?.source,
            alt: item.title,
          },
        });
      } else if (item.url) {
        out.push({
          type: "external",
          external: {
            uri: item.url,
            title: item.title ?? item.url,
            description: item.description ?? "",
            thumb: item.media?.image?.src,
          },
        });
      }
    }
  }
  if (images.length) out.unshift({ type: "images", images });
  return out.length ? out : undefined;
}

export function mapFacebookPost(post: FacebookPost): SocialFeedPost {
  const id = post.id;
  return {
    uri: id,
    cid: id,
    author: mapAuthor(post.from),
    text: (post.message || post.story || "").trim(),
    createdAt: post.created_time ?? new Date().toISOString(),
    counts: {
      replies: post.comments?.summary?.total_count ?? 0,
      reposts: post.shares?.count ?? 0,
      likes: post.likes?.summary?.total_count ?? 0,
    },
    viewer: {},
    replyTarget: {
      parentUri: id,
      parentCid: id,
      rootUri: id,
      rootCid: id,
    },
    embeds: mapAttachments(post),
  };
}

function mapFacebookComment(comment: FacebookComment): SocialFeedPost {
  const id = comment.id;
  return {
    uri: id,
    cid: id,
    author: mapAuthor(comment.from),
    text: (comment.message ?? "").trim(),
    createdAt: comment.created_time ?? new Date().toISOString(),
    counts: {
      replies: comment.comment_count ?? 0,
      reposts: 0,
      likes: comment.like_count ?? 0,
    },
    viewer: {},
    replyTarget: {
      parentUri: id,
      parentCid: id,
      rootUri: id,
      rootCid: id,
    },
  };
}

const POST_FIELDS = [
  "id",
  "message",
  "story",
  "created_time",
  "from",
  "permalink_url",
  "shares",
  "likes.summary(true)",
  "comments.summary(true)",
  "attachments{type,title,description,url,media,subattachments}",
].join(",");

export async function facebookVerifyCredentials(
  accessToken: string,
  pageId?: string,
): Promise<{ actor: FacebookActor; isPage: boolean }> {
  const token = accessToken.trim();
  if (!token) throw new Error("Facebook access token is required");
  const target = pageId?.trim();
  if (target) {
    const actor = await facebookRequest<FacebookActor>(
      token,
      `/${encodeURIComponent(target)}?fields=id,name,username,about,picture.type(large),fan_count,followers_count,link`,
    );
    if (!actor.id) throw new Error("Could not verify Facebook Page credentials");
    return { actor, isPage: true };
  }
  const actor = await facebookRequest<FacebookActor>(
    token,
    "/me?fields=id,name,about,picture.type(large),link",
  );
  if (!actor.id) throw new Error("Could not verify Facebook credentials");
  return { actor, isPage: false };
}

export function createFacebookClient(
  accessToken: string,
  actor: FacebookActor,
  isPage: boolean,
): FacebookClient {
  const handle = actor.username?.trim() || actor.name?.trim() || actor.id;
  return {
    accessToken: accessToken.trim(),
    actorId: actor.id,
    handle,
    displayName: actor.name?.trim() || handle,
    avatar: pictureUrl(actor.picture),
    isPage,
  };
}

export async function facebookGetHomeTimeline(
  client: FacebookClient,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const params = new URLSearchParams({
    fields: POST_FIELDS,
    limit: String(opts.limit ?? 25),
  });
  if (opts.cursor) params.set("after", opts.cursor);
  const response = await facebookRequest<FacebookFeedResponse>(
    client.accessToken,
    `/${encodeURIComponent(client.actorId)}/feed?${params.toString()}`,
  );
  return {
    posts: (response.data ?? []).map(mapFacebookPost),
    cursor: response.paging?.cursors?.after,
  };
}

export async function facebookGetProfile(
  client: FacebookClient,
  actor: string,
): Promise<SocialProfile> {
  const cleaned = actor.trim().replace(/^@/, "") || client.actorId;
  const profile = await facebookRequest<FacebookActor>(
    client.accessToken,
    `/${encodeURIComponent(cleaned)}?fields=id,name,username,about,bio,picture.type(large),fan_count,followers_count,link`,
  );
  const handle = profile.username?.trim() || profile.name?.trim() || profile.id;
  return {
    did: profile.id,
    handle,
    displayName: profile.name?.trim() || handle,
    description: profile.about || profile.bio,
    avatar: pictureUrl(profile.picture),
    followersCount: profile.followers_count ?? profile.fan_count ?? 0,
    followsCount: 0,
    postsCount: 0,
  };
}

export async function facebookGetAuthorFeed(
  client: FacebookClient,
  opts: { actorId: string; limit?: number; cursor?: string },
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const params = new URLSearchParams({
    fields: POST_FIELDS,
    limit: String(opts.limit ?? 25),
  });
  if (opts.cursor) params.set("after", opts.cursor);
  const response = await facebookRequest<FacebookFeedResponse>(
    client.accessToken,
    `/${encodeURIComponent(opts.actorId)}/posts?${params.toString()}`,
  );
  return {
    posts: (response.data ?? []).map(mapFacebookPost),
    cursor: response.paging?.cursors?.after,
  };
}

export async function facebookGetPostThread(
  client: FacebookClient,
  postId: string,
): Promise<SocialThreadResponse> {
  const id = postId.trim();
  if (!id) throw new Error("Post id is required");
  const post = await facebookRequest<FacebookPost>(
    client.accessToken,
    `/${encodeURIComponent(id)}?fields=${POST_FIELDS},comments.limit(50){id,message,created_time,from,like_count,comment_count}`,
  );
  const replies = (post.comments?.data ?? []).map(mapFacebookComment);
  return {
    post: mapFacebookPost(post),
    ancestors: [],
    replies,
  };
}

export async function facebookCreatePost(
  client: FacebookClient,
  input: { text: string; link?: string },
): Promise<{ uri: string; cid: string }> {
  const body: Record<string, string> = { message: input.text };
  if (input.link) body.link = input.link;
  const response = await facebookRequest<{ id: string }>(
    client.accessToken,
    `/${encodeURIComponent(client.actorId)}/feed`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!response.id) throw new Error("Facebook did not return a post id");
  return { uri: response.id, cid: response.id };
}

export async function facebookCreateComment(
  client: FacebookClient,
  input: { postId: string; text: string },
): Promise<{ uri: string; cid: string }> {
  const response = await facebookRequest<{ id: string }>(
    client.accessToken,
    `/${encodeURIComponent(input.postId)}/comments`,
    { method: "POST", body: JSON.stringify({ message: input.text }) },
  );
  if (!response.id) throw new Error("Facebook did not return a comment id");
  return { uri: response.id, cid: response.id };
}

export async function facebookLike(client: FacebookClient, objectId: string): Promise<{ uri: string }> {
  await facebookRequest(client.accessToken, `/${encodeURIComponent(objectId)}/likes`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return { uri: objectId };
}

export async function facebookUnlike(client: FacebookClient, objectId: string): Promise<void> {
  await facebookRequest(client.accessToken, `/${encodeURIComponent(objectId)}/likes`, {
    method: "DELETE",
  });
}

/** Facebook has no native "repost"; share by posting a link back to the original. */
export async function facebookSharePost(
  client: FacebookClient,
  postId: string,
): Promise<{ uri: string }> {
  const post = await facebookRequest<FacebookPost>(
    client.accessToken,
    `/${encodeURIComponent(postId)}?fields=permalink_url,message`,
  );
  const link = post.permalink_url;
  if (!link) throw new Error("Facebook post has no permalink to share");
  const created = await facebookCreatePost(client, {
    text: post.message ? `Shared: ${post.message.slice(0, 200)}` : "Shared a post",
    link,
  });
  return { uri: created.uri };
}

export async function facebookSearchActors(
  client: FacebookClient,
  query: string,
  limit = 10,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  const q = query.trim().replace(/^@/, "");
  if (!q) return [];

  // Prefer resolving an exact Page/user id or username via Graph.
  try {
    const profile = await facebookGetProfile(client, q);
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
    /* fall through */
  }

  try {
    const response = await facebookRequest<{
      data?: Array<{
        id: string;
        name?: string;
        username?: string;
        about?: string;
        picture?: { data?: { url?: string } };
      }>;
    }>(
      client.accessToken,
      `/pages/search?q=${encodeURIComponent(q)}&fields=id,name,username,about,picture.type(large)&limit=${limit}`,
    );
    return (response.data ?? []).map((page) => ({
      did: page.id,
      handle: page.username?.trim() || page.name?.trim() || page.id,
      displayName: page.name?.trim() || page.username?.trim() || page.id,
      avatar: page.picture?.data?.url,
      description: page.about?.trim() || undefined,
    }));
  } catch {
    return [];
  }
}
