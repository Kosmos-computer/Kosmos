/**
 * Bitsocial adapter — PKC RPC (bitsocial-cli daemon) → shared Social* DTOs.
 *
 * Bitsocial is a serverless P2P social protocol (IPFS / libp2p pubsub). Clients talk
 * to a local or remote bitsocial-cli node over WebSocket JSON-RPC. See
 * https://github.com/bitsocialnet and https://bitsocial.net
 */
import type {
  SocialAuthor,
  SocialEmbed,
  SocialFeedPost,
  SocialFeedResponse,
  SocialProfile,
  SocialSidebarLink,
  SocialSuggestedActor,
  SocialThreadResponse,
} from "../../../shared/social.js";

/** Default PKC RPC endpoint when bitsocial daemon runs locally. */
export const BITSOCIAL_DEFAULT_RPC = "ws://localhost:9138";

/**
 * Public communities from bitsocialnet/lists (seeder compatibility list).
 * Used when the user does not supply community addresses.
 */
export const BITSOCIAL_DEFAULT_COMMUNITIES = [
  "askseedit.bso",
  "news-posting.bso",
  "interestingasfuck.bso",
  "til-posting.bso",
  "gaming-posting.bso",
  "funny-posting.bso",
  "memes-posting.bso",
  "pics-posting.bso",
  "aww-posting.bso",
  "videos-posting.bso",
  "blog.bitsocial.bso",
] as const;

const COMMUNITY_START_TIMEOUT_MS = 45_000;
const RPC_CALL_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 15_000;

export interface BitsocialSession {
  rpcUrl: string;
  communities: string[];
}

interface BitsocialAuthor {
  address?: string;
  displayName?: string;
  shortAddress?: string;
}

interface BitsocialCommentIpfs {
  content?: string;
  title?: string;
  link?: string;
  timestamp?: number;
  depth?: number;
  parentCid?: string;
  postCid?: string;
  author?: BitsocialAuthor;
  signature?: { publicKey?: string };
  communityAddress?: string;
  thumbnailUrl?: string;
}

interface BitsocialCommentUpdate {
  cid?: string;
  upvoteCount?: number;
  downvoteCount?: number;
  replyCount?: number;
  edit?: { content?: string; deleted?: boolean };
}

export interface BitsocialPageComment {
  comment: BitsocialCommentIpfs;
  commentUpdate: BitsocialCommentUpdate;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params: unknown[];
  id: number;
}

interface JsonRpcSuccess {
  jsonrpc: "2.0";
  result: unknown;
  id: number;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  error: { code?: number | string; message?: string; data?: unknown };
  id: number | null;
}

type JsonRpcMessage = JsonRpcSuccess | JsonRpcError | {
  jsonrpc: "2.0";
  method?: string;
  params?: { subscription?: number; event?: string; result?: unknown };
};

type PendingCall = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type SubscriptionHandler = (event: string, result: unknown) => void;

/** Minimal JSON-RPC WebSocket client compatible with bitsocial-cli / PKC RPC. */
export class BitsocialRpcClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, PendingCall>();
  private readonly subscriptions = new Map<number, SubscriptionHandler>();
  private openPromise: Promise<void> | null = null;

  constructor(readonly rpcUrl: string) {}

  async connect(timeoutMs = CONNECT_TIMEOUT_MS): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out connecting to Bitsocial RPC at ${this.rpcUrl}`));
      }, timeoutMs);

      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
        this.openPromise = null;
      };

      try {
        this.ws = new WebSocket(this.rpcUrl);
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      this.ws.addEventListener("open", () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      });

      this.ws.addEventListener("error", () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Could not connect to Bitsocial RPC at ${this.rpcUrl}`));
      });

      this.ws.addEventListener("close", () => {
        this.rejectAllPending(new Error("Bitsocial RPC connection closed"));
        this.ws = null;
      });

      this.ws.addEventListener("message", (event) => {
        this.handleMessage(String(event.data));
      });
    });

    return this.openPromise;
  }

  async destroy(): Promise<void> {
    this.rejectAllPending(new Error("Bitsocial RPC client destroyed"));
    this.subscriptions.clear();
    const socket = this.ws;
    this.ws = null;
    this.openPromise = null;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  }

  onSubscription(subscriptionId: number, handler: SubscriptionHandler): void {
    this.subscriptions.set(subscriptionId, handler);
  }

  offSubscription(subscriptionId: number): void {
    this.subscriptions.delete(subscriptionId);
  }

  async call<T = unknown>(
    method: string,
    params: unknown[] = [],
    timeoutMs = RPC_CALL_TIMEOUT_MS,
  ): Promise<T> {
    await this.connect();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Bitsocial RPC is not connected");
    }

    const id = this.nextId++;
    const payload: JsonRpcRequest = { jsonrpc: "2.0", method, params, id };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Bitsocial RPC call timed out: ${method}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });

      try {
        this.ws!.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private handleMessage(raw: string): void {
    let message: JsonRpcMessage;
    try {
      message = JSON.parse(raw) as JsonRpcMessage;
    } catch {
      return;
    }

    if ("params" in message && message.params && typeof message.params.subscription === "number") {
      const handler = this.subscriptions.get(message.params.subscription);
      const event = message.params.event ?? "message";
      handler?.(event, message.params.result);
      return;
    }

    if (!("id" in message) || typeof message.id !== "number") return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);

    if ("error" in message && message.error) {
      const msg =
        typeof message.error.message === "string" && message.error.message
          ? message.error.message
          : `Bitsocial RPC error (${String(message.error.code ?? "unknown")})`;
      pending.reject(new Error(msg));
      return;
    }

    pending.resolve("result" in message ? message.result : undefined);
  }

  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }
}

export function normalizeBitsocialRpcUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return BITSOCIAL_DEFAULT_RPC;
  let candidate = trimmed;
  if (!/^[a-z]+:\/\//i.test(candidate)) {
    candidate = `ws://${candidate}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Bitsocial RPC URL must be a valid ws:// or wss:// address");
  }
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new Error("Bitsocial RPC URL must use ws:// or wss://");
  }
  // Keep trailing path (auth key) but drop a lone trailing slash on the root.
  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
  return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
}

export function normalizeBitsocialCommunities(communities: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of communities) {
    for (const part of raw.split(/[\s,]+/)) {
      const address = part.trim();
      if (!address || seen.has(address)) continue;
      seen.add(address);
      out.push(address);
    }
  }
  return out.length ? out : [...BITSOCIAL_DEFAULT_COMMUNITIES];
}

export function encodeBitsocialService(session: BitsocialSession): string {
  return JSON.stringify({
    rpcUrl: session.rpcUrl,
    communities: session.communities,
  });
}

export function decodeBitsocialService(service: string): BitsocialSession {
  try {
    const parsed = JSON.parse(service) as Partial<BitsocialSession>;
    if (parsed && typeof parsed.rpcUrl === "string") {
      return {
        rpcUrl: normalizeBitsocialRpcUrl(parsed.rpcUrl),
        communities: normalizeBitsocialCommunities(
          Array.isArray(parsed.communities) ? parsed.communities.map(String) : [],
        ),
      };
    }
  } catch {
    /* Fall through — older / plain URL storage. */
  }
  return {
    rpcUrl: normalizeBitsocialRpcUrl(service || BITSOCIAL_DEFAULT_RPC),
    communities: [...BITSOCIAL_DEFAULT_COMMUNITIES],
  };
}

function shortId(value: string, head = 10, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function authorFromComment(comment: BitsocialCommentIpfs): SocialAuthor {
  const address =
    comment.author?.address?.trim() ||
    comment.signature?.publicKey?.trim() ||
    "unknown";
  const displayName =
    comment.author?.displayName?.trim() ||
    comment.author?.shortAddress?.trim() ||
    shortId(address);
  return {
    did: address,
    handle: address,
    displayName,
  };
}

function textFromComment(comment: BitsocialCommentIpfs, update: BitsocialCommentUpdate): string {
  const edited = update.edit?.content?.trim();
  if (edited) return edited;
  const title = comment.title?.trim() ?? "";
  const content = comment.content?.trim() ?? "";
  const link = comment.link?.trim() ?? "";
  if (title && content) return `${title}\n\n${content}`;
  if (title && link) return `${title}\n${link}`;
  if (title) return title;
  if (content) return content;
  if (link) return link;
  return "";
}

function embedsFromComment(comment: BitsocialCommentIpfs): SocialEmbed[] | undefined {
  const embeds: SocialEmbed[] = [];
  const link = comment.link?.trim();
  if (link) {
    const isImage = /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(link);
    if (isImage || comment.thumbnailUrl) {
      const thumb = comment.thumbnailUrl || link;
      embeds.push({
        type: "images",
        images: [{ thumb, fullsize: link, alt: comment.title?.trim() || "" }],
      });
    } else {
      embeds.push({
        type: "external",
        external: {
          uri: link,
          title: comment.title?.trim() || link,
          description: comment.content?.trim() || "",
          thumb: comment.thumbnailUrl,
        },
      });
    }
  }
  return embeds.length ? embeds : undefined;
}

/** Map a Bitsocial page comment onto the shared feed DTO. */
export function mapBitsocialComment(
  pageComment: BitsocialPageComment,
  communityAddress?: string,
): SocialFeedPost | null {
  const { comment, commentUpdate } = pageComment;
  if (commentUpdate.edit?.deleted) return null;
  const cid = commentUpdate.cid?.trim();
  if (!cid) return null;

  const postCid = comment.postCid?.trim() || (comment.depth === 0 ? cid : cid);
  const parentCid = comment.parentCid?.trim() || cid;
  const createdAtMs =
    typeof comment.timestamp === "number" && Number.isFinite(comment.timestamp)
      ? comment.timestamp * 1000
      : Date.now();
  const author = authorFromComment(comment);
  const community = communityAddress || comment.communityAddress;
  const text = textFromComment(comment, commentUpdate);
  const prefix = community ? `[${community}] ` : "";

  return {
    uri: cid,
    cid,
    author,
    text: prefix + text,
    createdAt: new Date(createdAtMs).toISOString(),
    counts: {
      replies: commentUpdate.replyCount ?? 0,
      reposts: 0,
      likes: commentUpdate.upvoteCount ?? 0,
    },
    viewer: {},
    replyTarget: {
      parentUri: parentCid,
      parentCid,
      rootUri: postCid,
      rootCid: postCid,
    },
    embeds: embedsFromComment(comment),
  };
}

async function waitForCommunityPosts(
  client: BitsocialRpcClient,
  communityAddress: string,
  timeoutMs = COMMUNITY_START_TIMEOUT_MS,
): Promise<BitsocialPageComment[]> {
  const startResult = await client.call<{ subscriptionId: number }>("startCommunity", [
    { name: communityAddress },
  ]);
  const subscriptionId = startResult?.subscriptionId;
  if (typeof subscriptionId !== "number") {
    throw new Error(`Could not start Bitsocial community ${communityAddress}`);
  }

  return new Promise<BitsocialPageComment[]>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      finish([]);
    }, timeoutMs);

    const finish = (comments: BitsocialPageComment[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.offSubscription(subscriptionId);
      void client.call("unsubscribe", [{ subscriptionId }]).catch(() => undefined);
      resolve(comments);
    };

    client.onSubscription(subscriptionId, (event, result) => {
      if (event === "error") {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        client.offSubscription(subscriptionId);
        reject(new Error(`Bitsocial community error: ${communityAddress}`));
        return;
      }
      if (event !== "update" || !result || typeof result !== "object") return;
      const community = result as {
        posts?: {
          pages?: Record<string, { comments?: BitsocialPageComment[]; nextCid?: string }>;
          pageCids?: Record<string, string>;
        };
        address?: string;
      };
      const pages = community.posts?.pages;
      if (pages) {
        const preferred = pages.new ?? pages.hot ?? pages.active ?? Object.values(pages)[0];
        if (preferred?.comments?.length) {
          finish(preferred.comments);
          return;
        }
      }
      const pageCid =
        community.posts?.pageCids?.new ||
        community.posts?.pageCids?.hot ||
        community.posts?.pageCids?.active;
      if (pageCid) {
        void client
          .call<{ page?: { comments?: BitsocialPageComment[] } }>("getCommunityPage", [
            { cid: pageCid, type: "posts", pageMaxSize: 50 },
          ])
          .then((pageResult) => finish(pageResult?.page?.comments ?? []))
          .catch(() => finish([]));
      }
    });
  });
}

export async function createBitsocialClient(rpcUrl: string): Promise<BitsocialRpcClient> {
  const client = new BitsocialRpcClient(normalizeBitsocialRpcUrl(rpcUrl));
  await client.connect();
  return client;
}

/** Verify the daemon is reachable and return its known community addresses. */
export async function bitsocialVerifyConnection(rpcUrl: string): Promise<{
  communities: string[];
  handle: string;
}> {
  const client = await createBitsocialClient(rpcUrl);
  try {
    const sub = await client.call<{ subscriptionId: number }>("communitiesSubscribe", []);
    const subscriptionId = sub?.subscriptionId;
    let communities: string[] = [];
    if (typeof subscriptionId === "number") {
      communities = await new Promise<string[]>((resolve) => {
        const timer = setTimeout(() => resolve([]), 3_000);
        client.onSubscription(subscriptionId, (event, result) => {
          if (event !== "communitieschange") return;
          clearTimeout(timer);
          const list =
            result && typeof result === "object" && Array.isArray((result as { communities?: unknown }).communities)
              ? ((result as { communities: string[] }).communities)
              : [];
          resolve(list.map(String));
        });
      });
      void client.call("unsubscribe", [{ subscriptionId }]).catch(() => undefined);
      client.offSubscription(subscriptionId);
    }

    const parsed = new URL(normalizeBitsocialRpcUrl(rpcUrl));
    const handle = parsed.host || "bitsocial";
    return { communities, handle };
  } finally {
    await client.destroy();
  }
}

export async function bitsocialGetTimeline(
  session: BitsocialSession,
  opts: { cursor?: string; limit?: number } = {},
): Promise<SocialFeedResponse> {
  const limit = opts.limit ?? 30;
  const client = await createBitsocialClient(session.rpcUrl);
  try {
    const offset = opts.cursor ? Number.parseInt(opts.cursor, 10) : 0;
    const startIndex = Number.isFinite(offset) && offset > 0 ? offset : 0;
    const batch = session.communities.slice(startIndex, startIndex + 4);
    if (!batch.length) return { posts: [] };

    const pages = await Promise.all(
      batch.map(async (address) => {
        try {
          const comments = await waitForCommunityPosts(client, address);
          return comments
            .map((entry) => mapBitsocialComment(entry, address))
            .filter((post): post is SocialFeedPost => Boolean(post));
        } catch {
          return [] as SocialFeedPost[];
        }
      }),
    );

    const posts = pages
      .flat()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit);

    const nextIndex = startIndex + batch.length;
    return {
      posts,
      cursor: nextIndex < session.communities.length ? String(nextIndex) : undefined,
    };
  } finally {
    await client.destroy();
  }
}

async function waitForCommentUpdate(
  client: BitsocialRpcClient,
  cid: string,
  timeoutMs = 20_000,
): Promise<{
  comment?: BitsocialCommentIpfs;
  commentUpdate?: BitsocialCommentUpdate & {
    replies?: {
      pages?: Record<string, { comments?: BitsocialPageComment[] }>;
      pageCids?: Record<string, string>;
    };
  };
}> {
  const sub = await client.call<{ subscriptionId: number }>("commentUpdateSubscribe", [{ cid }]);
  const subscriptionId = sub?.subscriptionId;
  if (typeof subscriptionId !== "number") return {};

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      client.offSubscription(subscriptionId);
      void client.call("unsubscribe", [{ subscriptionId }]).catch(() => undefined);
      resolve({});
    }, timeoutMs);

    client.onSubscription(subscriptionId, (event, result) => {
      if (event !== "update" || !result || typeof result !== "object") return;
      clearTimeout(timer);
      client.offSubscription(subscriptionId);
      void client.call("unsubscribe", [{ subscriptionId }]).catch(() => undefined);
      resolve(result as {
        comment?: BitsocialCommentIpfs;
        commentUpdate?: BitsocialCommentUpdate & {
          replies?: {
            pages?: Record<string, { comments?: BitsocialPageComment[] }>;
            pageCids?: Record<string, string>;
          };
        };
      });
    });
  });
}

export async function bitsocialGetPostThread(
  session: BitsocialSession,
  uri: string,
): Promise<SocialThreadResponse> {
  const cid = uri.trim();
  if (!cid) throw new Error("Post CID is required");
  const client = await createBitsocialClient(session.rpcUrl);
  try {
    const comment = (await client.call<BitsocialCommentIpfs>("getComment", [{ cid }])) ?? {};
    const updatePayload = await waitForCommentUpdate(client, cid);
    const commentUpdate = updatePayload.commentUpdate ?? { cid };
    const rootComment = updatePayload.comment ?? comment;

    const rootEntry: BitsocialPageComment = {
      comment: rootComment,
      commentUpdate: { ...commentUpdate, cid: commentUpdate.cid ?? cid },
    };
    const post = mapBitsocialComment(rootEntry);
    if (!post) throw new Error("Could not load Bitsocial post");

    let replyComments: BitsocialPageComment[] = [];
    const replyPages = commentUpdate.replies?.pages;
    if (replyPages) {
      const preferred = replyPages.new ?? replyPages.best ?? Object.values(replyPages)[0];
      replyComments = preferred?.comments ?? [];
    } else {
      const pageCid =
        commentUpdate.replies?.pageCids?.new ||
        commentUpdate.replies?.pageCids?.best ||
        commentUpdate.replies?.pageCids?.old;
      if (pageCid) {
        const pageResult = await client
          .call<{ page?: { comments?: BitsocialPageComment[] } }>("getCommentPage", [
            { cid: pageCid, commentCid: cid, pageMaxSize: 50 },
          ])
          .catch(() => null);
        replyComments = pageResult?.page?.comments ?? [];
      }
    }

    const replies = replyComments
      .map((entry) => mapBitsocialComment(entry))
      .filter((item): item is SocialFeedPost => item !== null && item.uri !== cid);

    return { post, ancestors: [], replies };
  } finally {
    await client.destroy();
  }
}

export async function bitsocialGetProfile(
  session: BitsocialSession,
  actor: string,
): Promise<{ profile: SocialProfile; feed: SocialFeedResponse }> {
  const address = actor.trim().replace(/^@/, "");
  if (!address) throw new Error("Author address is required");

  let displayName = shortId(address);
  try {
    const client = await createBitsocialClient(session.rpcUrl);
    try {
      const resolved = await client
        .call<{ resolvedAuthorName: string | null }>("resolveAuthorName", [{ name: address }])
        .catch(() => ({ resolvedAuthorName: null }));
      displayName = resolved.resolvedAuthorName?.trim() || displayName;
    } finally {
      await client.destroy();
    }
  } catch {
    /* Name resolution is optional. */
  }

  const timeline = await bitsocialGetTimeline(session, { limit: 40 });
  const feedPosts = timeline.posts.filter(
    (post) => post.author.did === address || post.author.handle === address,
  );
  return {
    profile: {
      did: address,
      handle: address,
      displayName,
      description: "Bitsocial author (public-key identity)",
      followersCount: 0,
      followsCount: 0,
      postsCount: feedPosts.length,
    },
    feed: { posts: feedPosts },
  };
}

export function bitsocialListCommunityLinks(session: BitsocialSession): SocialSidebarLink[] {
  return session.communities.map((address) => ({
    id: address,
    title: address,
    subtitle: "Bitsocial community",
    url: `https://bitsocial.net`,
  }));
}

export function bitsocialSearchCommunities(
  session: BitsocialSession,
  query: string,
): SocialSuggestedActor[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return session.communities
    .filter((address) => address.toLowerCase().includes(q))
    .slice(0, 20)
    .map((address) => ({
      did: address,
      handle: address,
      displayName: address,
      description: "Bitsocial community",
    }));
}

export async function bitsocialCreatePost(): Promise<never> {
  throw new Error(
    "Bitsocial posting uses anti-spam challenges — publish from Seedit, 5chan, or bitsocial-cli for now",
  );
}

export async function bitsocialReply(): Promise<never> {
  throw new Error(
    "Bitsocial replies use anti-spam challenges — reply from Seedit, 5chan, or bitsocial-cli for now",
  );
}

export async function bitsocialLike(): Promise<never> {
  throw new Error(
    "Bitsocial votes use anti-spam challenges — vote from Seedit, 5chan, or bitsocial-cli for now",
  );
}

export async function bitsocialFollowCommunity(
  session: BitsocialSession,
  communityAddress: string,
): Promise<BitsocialSession> {
  const address = communityAddress.trim();
  if (!address) throw new Error("Community address is required");
  const communities = normalizeBitsocialCommunities([...session.communities, address]);
  const client = await createBitsocialClient(session.rpcUrl);
  try {
    // Warm the community so the next feed load is faster.
    await waitForCommunityPosts(client, address).catch(() => []);
  } finally {
    await client.destroy();
  }
  return { ...session, communities };
}
