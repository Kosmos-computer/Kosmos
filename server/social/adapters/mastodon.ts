/**
 * Mastodon REST adapter — verify token, timeline, profile, thread, and engagement.
 * Maps Mastodon entities onto the shared Social* DTOs used by the Social app.
 */
import type {
  SocialAuthor,
  SocialEmbed,
  SocialFeedPost,
  SocialProfile,
  SocialThreadResponse,
} from "../../../shared/social.js";

export interface MastodonClient {
  instanceUrl: string;
  accessToken: string;
}

export interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  note?: string;
  avatar?: string;
  header?: string;
  followers_count?: number;
  following_count?: number;
  statuses_count?: number;
  url?: string;
}

export interface MastodonMediaAttachment {
  id: string;
  type: "image" | "video" | "gifv" | "audio" | "unknown" | string;
  url: string;
  preview_url?: string;
  description?: string | null;
}

export interface MastodonCard {
  url: string;
  title?: string;
  description?: string;
  image?: string | null;
}

export interface MastodonStatus {
  id: string;
  uri: string;
  url?: string;
  created_at: string;
  content: string;
  reblogs_count?: number;
  favourites_count?: number;
  replies_count?: number;
  favourited?: boolean;
  reblogged?: boolean;
  in_reply_to_id?: string | null;
  account: MastodonAccount;
  media_attachments?: MastodonMediaAttachment[];
  card?: MastodonCard | null;
  reblog?: MastodonStatus | null;
}

export interface MastodonContext {
  ancestors: MastodonStatus[];
  descendants: MastodonStatus[];
}

export interface MastodonRelationship {
  id: string;
  following?: boolean;
  followed_by?: boolean;
}

function normalizeInstanceUrl(raw: string): string {
  let value = raw.trim().replace(/\/$/, "");
  if (!value) throw new Error("Mastodon instance URL is required");
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Mastodon instance must be http(s)");
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    throw new Error("Invalid Mastodon instance URL");
  }
}

export function createMastodonClient(instanceUrl: string, accessToken: string): MastodonClient {
  return {
    instanceUrl: normalizeInstanceUrl(instanceUrl),
    accessToken: accessToken.trim(),
  };
}

async function mastodonRequest<T>(
  client: MastodonClient,
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; link?: string | null }> {
  const url = `${client.instanceUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${client.accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) detail = `: ${body.error}`;
    } catch {
      /* ignore */
    }
    throw new Error(`Mastodon ${response.status}${detail}`);
  }
  if (response.status === 204) {
    return { data: undefined as T, link: response.headers.get("Link") };
  }
  return {
    data: (await response.json()) as T,
    link: response.headers.get("Link"),
  };
}

/** Strip Mastodon HTML content down to readable plain text. */
export function stripMastodonHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapAuthor(account: MastodonAccount): SocialAuthor {
  const handle = account.acct || account.username;
  return {
    did: account.id,
    handle,
    displayName: account.display_name?.trim() || handle,
    avatar: account.avatar,
  };
}

function mapEmbeds(status: MastodonStatus): SocialEmbed[] | undefined {
  const out: SocialEmbed[] = [];
  const images = (status.media_attachments ?? []).filter(
    (media) => media.type === "image" && (media.preview_url || media.url),
  );
  if (images.length) {
    out.push({
      type: "images",
      images: images.map((image) => ({
        thumb: image.preview_url ?? image.url,
        fullsize: image.url,
        alt: image.description ?? "",
      })),
    });
  }
  const video = (status.media_attachments ?? []).find(
    (media) => (media.type === "video" || media.type === "gifv") && media.url,
  );
  if (video) {
    out.push({
      type: "video",
      video: {
        thumbnail: video.preview_url,
        playlist: video.url,
        alt: video.description ?? undefined,
      },
    });
  }
  if (status.card?.url) {
    out.push({
      type: "external",
      external: {
        uri: status.card.url,
        title: status.card.title ?? status.card.url,
        description: status.card.description ?? "",
        thumb: status.card.image ?? undefined,
      },
    });
  }
  return out.length ? out : undefined;
}

export function mapMastodonStatus(status: MastodonStatus): SocialFeedPost {
  const effective = status.reblog ?? status;
  const id = effective.id;
  return {
    uri: id,
    cid: id,
    author: mapAuthor(effective.account),
    text: stripMastodonHtml(effective.content),
    createdAt: effective.created_at,
    counts: {
      replies: effective.replies_count ?? 0,
      reposts: effective.reblogs_count ?? 0,
      likes: effective.favourites_count ?? 0,
    },
    viewer: {
      like: status.favourited || effective.favourited ? id : undefined,
      repost: status.reblogged || effective.reblogged ? id : undefined,
    },
    replyTarget: {
      parentUri: id,
      parentCid: id,
      rootUri: effective.in_reply_to_id ?? id,
      rootCid: effective.in_reply_to_id ?? id,
    },
    embeds: mapEmbeds(effective),
  };
}

function parseMaxIdFromLink(link: string | null | undefined): string | undefined {
  if (!link) return undefined;
  const match = link.match(/[?&]max_id=([^&>]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export async function mastodonVerifyCredentials(client: MastodonClient): Promise<MastodonAccount> {
  const { data } = await mastodonRequest<MastodonAccount>(client, "/api/v1/accounts/verify_credentials");
  return data;
}

export async function mastodonGetHomeTimeline(
  client: MastodonClient,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 30) });
  if (opts.cursor) params.set("max_id", opts.cursor);
  const { data, link } = await mastodonRequest<MastodonStatus[]>(
    client,
    `/api/v1/timelines/home?${params.toString()}`,
  );
  return {
    posts: data.map(mapMastodonStatus),
    cursor: parseMaxIdFromLink(link),
  };
}

export async function mastodonLookupAccount(
  client: MastodonClient,
  actor: string,
): Promise<MastodonAccount> {
  const cleaned = actor.trim().replace(/^@/, "");
  if (!cleaned) throw new Error("Account handle or id is required");
  if (/^\d+$/.test(cleaned)) {
    const { data } = await mastodonRequest<MastodonAccount>(
      client,
      `/api/v1/accounts/${encodeURIComponent(cleaned)}`,
    );
    return data;
  }
  const { data } = await mastodonRequest<MastodonAccount>(
    client,
    `/api/v1/accounts/lookup?acct=${encodeURIComponent(cleaned)}`,
  );
  return data;
}

export async function mastodonGetRelationships(
  client: MastodonClient,
  accountId: string,
): Promise<MastodonRelationship | undefined> {
  const list = await mastodonGetRelationshipsMany(client, [accountId]);
  return list[0];
}

export async function mastodonGetRelationshipsMany(
  client: MastodonClient,
  accountIds: string[],
): Promise<MastodonRelationship[]> {
  const unique = [...new Set(accountIds.filter(Boolean))];
  if (!unique.length) return [];
  const params = unique.map((id) => `id[]=${encodeURIComponent(id)}`).join("&");
  const { data } = await mastodonRequest<MastodonRelationship[]>(
    client,
    `/api/v1/accounts/relationships?${params}`,
  );
  return data ?? [];
}

export async function mastodonGetProfile(
  client: MastodonClient,
  actor: string,
): Promise<SocialProfile> {
  const account = await mastodonLookupAccount(client, actor);
  const relationship = await mastodonGetRelationships(client, account.id).catch(() => undefined);
  const handle = account.acct || account.username;
  return {
    did: account.id,
    handle,
    displayName: account.display_name?.trim() || handle,
    description: account.note ? stripMastodonHtml(account.note) : undefined,
    avatar: account.avatar,
    banner: account.header,
    followersCount: account.followers_count ?? 0,
    followsCount: account.following_count ?? 0,
    postsCount: account.statuses_count ?? 0,
    viewer: {
      following: relationship?.following ? account.id : undefined,
      followedBy: relationship?.followed_by ? account.id : undefined,
    },
  };
}

export async function mastodonGetAccountStatuses(
  client: MastodonClient,
  opts: { accountId: string; limit?: number; cursor?: string },
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 30) });
  if (opts.cursor) params.set("max_id", opts.cursor);
  const { data, link } = await mastodonRequest<MastodonStatus[]>(
    client,
    `/api/v1/accounts/${encodeURIComponent(opts.accountId)}/statuses?${params.toString()}`,
  );
  return {
    posts: data.map(mapMastodonStatus),
    cursor: parseMaxIdFromLink(link),
  };
}

export async function mastodonGetStatusContext(
  client: MastodonClient,
  statusId: string,
): Promise<SocialThreadResponse> {
  const id = statusId.trim();
  if (!id) throw new Error("Status id is required");
  const [{ data: status }, { data: context }] = await Promise.all([
    mastodonRequest<MastodonStatus>(client, `/api/v1/statuses/${encodeURIComponent(id)}`),
    mastodonRequest<MastodonContext>(client, `/api/v1/statuses/${encodeURIComponent(id)}/context`),
  ]);
  return {
    post: mapMastodonStatus(status),
    ancestors: context.ancestors.map(mapMastodonStatus),
    replies: context.descendants.map(mapMastodonStatus),
  };
}

export async function mastodonCreateStatus(
  client: MastodonClient,
  input: { text: string; inReplyToId?: string },
): Promise<{ uri: string; cid: string }> {
  const body: Record<string, string> = { status: input.text };
  if (input.inReplyToId) body.in_reply_to_id = input.inReplyToId;
  const { data } = await mastodonRequest<MastodonStatus>(client, "/api/v1/statuses", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { uri: data.id, cid: data.id };
}

export async function mastodonFavourite(
  client: MastodonClient,
  statusId: string,
): Promise<{ uri: string }> {
  const { data } = await mastodonRequest<MastodonStatus>(
    client,
    `/api/v1/statuses/${encodeURIComponent(statusId)}/favourite`,
    { method: "POST" },
  );
  return { uri: data.id };
}

export async function mastodonUnfavourite(client: MastodonClient, statusId: string): Promise<void> {
  await mastodonRequest(client, `/api/v1/statuses/${encodeURIComponent(statusId)}/unfavourite`, {
    method: "POST",
  });
}

export async function mastodonReblog(
  client: MastodonClient,
  statusId: string,
): Promise<{ uri: string }> {
  const { data } = await mastodonRequest<MastodonStatus>(
    client,
    `/api/v1/statuses/${encodeURIComponent(statusId)}/reblog`,
    { method: "POST" },
  );
  return { uri: data.id };
}

export async function mastodonUnreblog(client: MastodonClient, statusId: string): Promise<void> {
  await mastodonRequest(client, `/api/v1/statuses/${encodeURIComponent(statusId)}/unreblog`, {
    method: "POST",
  });
}

export async function mastodonFollow(
  client: MastodonClient,
  accountId: string,
): Promise<{ uri: string }> {
  await mastodonRequest(client, `/api/v1/accounts/${encodeURIComponent(accountId)}/follow`, {
    method: "POST",
  });
  return { uri: accountId };
}

export async function mastodonUnfollow(client: MastodonClient, accountId: string): Promise<void> {
  await mastodonRequest(client, `/api/v1/accounts/${encodeURIComponent(accountId)}/unfollow`, {
    method: "POST",
  });
}

function formatMastodonUses(history?: Array<{ uses?: string }>): string | undefined {
  if (!history?.length) return undefined;
  const total = history.reduce((sum, day) => sum + Number(day.uses ?? 0), 0);
  if (!Number.isFinite(total) || total <= 0) return undefined;
  if (total >= 1_000) return `${(total / 1_000).toFixed(1).replace(/\.0$/, "")}K posts`;
  return `${total} posts`;
}

export async function mastodonGetTrendingTags(
  client: MastodonClient,
  limit = 6,
): Promise<import("../../../shared/social.js").SocialTrendItem[]> {
  const { data } = await mastodonRequest<
    Array<{ name: string; url?: string; history?: Array<{ uses?: string }> }>
  >(client, `/api/v1/trends/tags?limit=${limit}`);
  return (data ?? []).map((tag) => ({
    id: tag.name,
    title: `#${tag.name}`,
    category: "Trending",
    postCount: formatMastodonUses(tag.history),
    query: `#${tag.name}`,
  }));
}

export async function mastodonGetSuggestions(
  client: MastodonClient,
  limit = 8,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  const { data } = await mastodonRequest<
    Array<{ account: MastodonAccount; source?: string }>
  >(client, `/api/v2/suggestions?limit=${limit}`);
  const accounts = (data ?? []).map((item) => item.account).filter(Boolean);
  const ids = accounts.map((account) => account.id);
  const relationships = ids.length ? await mastodonGetRelationshipsMany(client, ids) : [];
  const byId = new Map(relationships.map((rel) => [rel.id, rel]));
  return accounts.map((account) => {
    const author = mapAuthor(account);
    const following = byId.get(account.id)?.following ? account.id : undefined;
    return {
      ...author,
      description: account.note ? stripMastodonHtml(account.note).slice(0, 140) : undefined,
      viewer: following ? { following } : undefined,
    };
  });
}

export async function mastodonGetTrendingLinks(
  client: MastodonClient,
  limit = 5,
): Promise<import("../../../shared/social.js").SocialSidebarLink[]> {
  const { data } = await mastodonRequest<
    Array<{ url: string; title?: string; description?: string }>
  >(client, `/api/v1/trends/links?limit=${limit}`);
  return (data ?? []).map((link, index) => ({
    id: link.url || String(index),
    title: link.title?.trim() || link.url,
    subtitle: link.description?.trim() || undefined,
    url: link.url,
  }));
}

export async function mastodonSearchAccounts(
  client: MastodonClient,
  query: string,
  limit = 10,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await mastodonRequest<{ accounts?: MastodonAccount[] }>(
    client,
    `/api/v2/search?q=${encodeURIComponent(q)}&type=accounts&limit=${limit}&resolve=true`,
  );
  const accounts = data.accounts ?? [];
  const ids = accounts.map((account) => account.id);
  const relationships = ids.length ? await mastodonGetRelationshipsMany(client, ids) : [];
  const byId = new Map(relationships.map((rel) => [rel.id, rel]));
  return accounts.map((account) => {
    const author = mapAuthor(account);
    const following = byId.get(account.id)?.following ? account.id : undefined;
    return {
      ...author,
      description: account.note ? stripMastodonHtml(account.note).slice(0, 140) : undefined,
      viewer: following ? { following } : undefined,
    };
  });
}

export { normalizeInstanceUrl };
