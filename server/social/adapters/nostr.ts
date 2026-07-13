/**
 * Nostr adapter — Snort-style short notes via nostr-tools (NIP-01/02/18/25).
 * Maps events into the shared SocialFeedPost DTO used by Bluesky.
 */
import {
  finalizeEvent,
  getPublicKey,
  kinds,
  nip19,
  type Event,
  type EventTemplate,
  type Filter,
} from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import type {
  SocialAuthor,
  SocialEmbed,
  SocialFeedPost,
  SocialProfile,
  SocialThreadResponse,
} from "../../../shared/social.js";

/** Snort-adjacent bootstrap relays when the user does not supply any. */
export const NOSTR_DEFAULT_RELAYS = [
  "wss://relay.snort.social",
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://relay.primal.net",
] as const;

export type NostrSecretKey = Uint8Array;

export interface NostrSession {
  pubkey: string;
  npub: string;
  relays: string[];
}

function normalizeRelay(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "wss:" && parsed.protocol !== "ws:") return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function normalizeNostrRelays(relays: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of relays) {
    for (const part of raw.split(/[\s,]+/)) {
      const relay = normalizeRelay(part);
      if (!relay || seen.has(relay)) continue;
      seen.add(relay);
      out.push(relay);
    }
  }
  return out.length ? out : [...NOSTR_DEFAULT_RELAYS];
}

export function parseNostrSecretKey(nsecOrHex: string): NostrSecretKey {
  const raw = nsecOrHex.trim();
  if (!raw) throw new Error("Nostr private key is required");
  if (raw.startsWith("nsec1")) {
    const decoded = nip19.decode(raw);
    if (decoded.type !== "nsec") throw new Error("Expected an nsec private key");
    return decoded.data as NostrSecretKey;
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i += 1) {
      bytes[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  throw new Error("Private key must be nsec… or 64-char hex");
}

export function nostrSessionFromSecret(
  secretKey: NostrSecretKey,
  relays: string[],
): NostrSession {
  const pubkey = getPublicKey(secretKey);
  return {
    pubkey,
    npub: nip19.npubEncode(pubkey),
    relays: normalizeNostrRelays(relays),
  };
}

export function createNostrPool(): SimplePool {
  return new SimplePool();
}

async function publishEvent(
  pool: SimplePool,
  relays: string[],
  secretKey: NostrSecretKey,
  template: EventTemplate,
): Promise<Event> {
  const event = finalizeEvent(template, secretKey);
  const results = await Promise.allSettled(pool.publish(relays, event));
  const ok = results.some((result) => result.status === "fulfilled");
  if (!ok) throw new Error("Could not publish event to any relay");
  return event;
}

function shortNpub(npub: string): string {
  if (npub.length <= 16) return npub;
  return `${npub.slice(0, 10)}…${npub.slice(-4)}`;
}

function parseProfileContent(content: string): {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
} {
  try {
    return JSON.parse(content) as {
      name?: string;
      display_name?: string;
      about?: string;
      picture?: string;
      banner?: string;
    };
  } catch {
    return {};
  }
}

function authorFromProfile(pubkey: string, profile?: Event): SocialAuthor {
  const meta = profile ? parseProfileContent(profile.content) : {};
  const npub = nip19.npubEncode(pubkey);
  const displayName =
    meta.display_name?.trim() || meta.name?.trim() || shortNpub(npub);
  return {
    did: pubkey,
    handle: npub,
    displayName,
    avatar: meta.picture,
  };
}

function replyTagsFromEvent(event: Event): { parentId?: string; rootId?: string } {
  const eTags = event.tags.filter((tag) => tag[0] === "e" && tag[1]);
  if (!eTags.length) return {};
  const root = eTags.find((tag) => tag[3] === "root")?.[1];
  const reply = eTags.find((tag) => tag[3] === "reply")?.[1];
  if (root || reply) {
    return { rootId: root ?? reply, parentId: reply ?? root };
  }
  // Legacy: first e = root, last e = parent when unmarked.
  if (eTags.length === 1) {
    return { rootId: eTags[0][1], parentId: eTags[0][1] };
  }
  return {
    rootId: eTags[0][1],
    parentId: eTags[eTags.length - 1][1],
  };
}

function extractImageEmbeds(content: string): SocialEmbed[] | undefined {
  const urls = content.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp)(?:\?\S*)?/gi);
  if (!urls?.length) return undefined;
  return [
    {
      type: "images",
      images: urls.slice(0, 4).map((url) => ({
        thumb: url,
        fullsize: url,
        alt: "",
      })),
    },
  ];
}

export function mapNostrNote(
  event: Event,
  opts: {
    profiles?: Map<string, Event>;
    counts?: { replies?: number; reposts?: number; likes?: number };
    viewer?: { like?: string; repost?: string; following?: string };
  } = {},
): SocialFeedPost {
  const reply = replyTagsFromEvent(event);
  const parentId = reply.parentId ?? event.id;
  const rootId = reply.rootId ?? event.id;
  return {
    uri: event.id,
    cid: event.id,
    author: authorFromProfile(event.pubkey, opts.profiles?.get(event.pubkey)),
    text: event.content,
    createdAt: new Date((event.created_at || 0) * 1000).toISOString(),
    counts: {
      replies: opts.counts?.replies ?? 0,
      reposts: opts.counts?.reposts ?? 0,
      likes: opts.counts?.likes ?? 0,
    },
    viewer: {
      like: opts.viewer?.like,
      repost: opts.viewer?.repost,
      following: opts.viewer?.following,
    },
    replyTarget: {
      parentUri: parentId,
      parentCid: parentId,
      rootUri: rootId,
      rootCid: rootId,
    },
    embeds: extractImageEmbeds(event.content),
  };
}

async function fetchProfiles(
  pool: SimplePool,
  relays: string[],
  pubkeys: string[],
): Promise<Map<string, Event>> {
  const unique = [...new Set(pubkeys.filter(Boolean))];
  const map = new Map<string, Event>();
  if (!unique.length) return map;
  const events = await pool.querySync(relays, {
    kinds: [kinds.Metadata],
    authors: unique,
  });
  for (const event of events) {
    const existing = map.get(event.pubkey);
    if (!existing || event.created_at > existing.created_at) {
      map.set(event.pubkey, event);
    }
  }
  return map;
}

async function fetchContactPubkeys(
  pool: SimplePool,
  relays: string[],
  pubkey: string,
): Promise<string[]> {
  const events = await pool.querySync(relays, {
    kinds: [kinds.Contacts],
    authors: [pubkey],
    limit: 1,
  });
  const latest = events.sort((a, b) => b.created_at - a.created_at)[0];
  if (!latest) return [];
  return latest.tags.filter((tag) => tag[0] === "p" && tag[1]).map((tag) => tag[1]!);
}

function decodeActor(actor: string): string {
  const cleaned = actor.trim().replace(/^@/, "");
  if (!cleaned) throw new Error("Actor npub or pubkey is required");
  if (cleaned.startsWith("npub1")) {
    const decoded = nip19.decode(cleaned);
    if (decoded.type !== "npub") throw new Error("Invalid npub");
    return decoded.data as string;
  }
  if (/^[0-9a-fA-F]{64}$/.test(cleaned)) return cleaned.toLowerCase();
  throw new Error("Actor must be npub… or 64-char hex pubkey");
}

export async function nostrGetTimeline(
  pool: SimplePool,
  session: NostrSession,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const limit = opts.limit ?? 30;
  const until = opts.cursor ? Number(opts.cursor) : undefined;
  const follows = await fetchContactPubkeys(pool, session.relays, session.pubkey);
  const authors = follows.length ? follows : [session.pubkey];
  const filter: Filter = {
    kinds: [kinds.ShortTextNote],
    authors,
    limit,
  };
  if (Number.isFinite(until) && until! > 0) filter.until = until! - 1;

  const notes = await pool.querySync(session.relays, filter);
  notes.sort((a, b) => b.created_at - a.created_at);
  const profiles = await fetchProfiles(
    pool,
    session.relays,
    notes.map((note) => note.pubkey),
  );
  const followSet = new Set(follows);
  const posts = notes.slice(0, limit).map((note) =>
    mapNostrNote(note, {
      profiles,
      viewer: {
        following: followSet.has(note.pubkey) ? `follow:${note.pubkey}` : undefined,
      },
    }),
  );
  const oldest = notes[notes.length - 1];
  return {
    posts,
    cursor: oldest ? String(oldest.created_at) : undefined,
  };
}

export async function nostrGetProfile(
  pool: SimplePool,
  session: NostrSession,
  actor: string,
): Promise<SocialProfile> {
  const pubkey = decodeActor(actor);
  const [profiles, follows, notes] = await Promise.all([
    fetchProfiles(pool, session.relays, [pubkey, session.pubkey]),
    fetchContactPubkeys(pool, session.relays, pubkey),
    pool.querySync(session.relays, {
      kinds: [kinds.ShortTextNote],
      authors: [pubkey],
      limit: 1,
    }),
  ]);
  const profileEvent = profiles.get(pubkey);
  const meta = profileEvent ? parseProfileContent(profileEvent.content) : {};
  const npub = nip19.npubEncode(pubkey);
  const myFollows = await fetchContactPubkeys(pool, session.relays, session.pubkey);
  return {
    did: pubkey,
    handle: npub,
    displayName: meta.display_name?.trim() || meta.name?.trim() || shortNpub(npub),
    description: meta.about,
    avatar: meta.picture,
    banner: meta.banner,
    followersCount: 0,
    followsCount: follows.length,
    postsCount: notes.length,
    viewer: {
      following: myFollows.includes(pubkey) ? `follow:${pubkey}` : undefined,
    },
  };
}

export async function nostrGetAuthorFeed(
  pool: SimplePool,
  session: NostrSession,
  opts: { actor: string; limit?: number; cursor?: string },
): Promise<{ posts: SocialFeedPost[]; cursor?: string }> {
  const pubkey = decodeActor(opts.actor);
  const limit = opts.limit ?? 30;
  const until = opts.cursor ? Number(opts.cursor) : undefined;
  const filter: Filter = {
    kinds: [kinds.ShortTextNote],
    authors: [pubkey],
    limit,
  };
  if (Number.isFinite(until) && until! > 0) filter.until = until! - 1;
  const notes = await pool.querySync(session.relays, filter);
  notes.sort((a, b) => b.created_at - a.created_at);
  const profiles = await fetchProfiles(pool, session.relays, [pubkey]);
  const myFollows = await fetchContactPubkeys(pool, session.relays, session.pubkey);
  const followSet = new Set(myFollows);
  const posts = notes.slice(0, limit).map((note) =>
    mapNostrNote(note, {
      profiles,
      viewer: {
        following: followSet.has(note.pubkey) ? `follow:${note.pubkey}` : undefined,
      },
    }),
  );
  const oldest = notes[notes.length - 1];
  return {
    posts,
    cursor: oldest ? String(oldest.created_at) : undefined,
  };
}

export async function nostrGetPostThread(
  pool: SimplePool,
  session: NostrSession,
  uri: string,
): Promise<SocialThreadResponse> {
  const id = uri.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(id)) throw new Error("Post id must be a 64-char hex event id");

  const rootEvents = await pool.querySync(session.relays, { ids: [id], limit: 1 });
  const root = rootEvents[0];
  if (!root) throw new Error("Post not found on connected relays");

  const replies = await pool.querySync(session.relays, {
    kinds: [kinds.ShortTextNote],
    "#e": [id],
    limit: 80,
  });
  replies.sort((a, b) => a.created_at - b.created_at);

  const ancestors: Event[] = [];
  let walk = replyTagsFromEvent(root).parentId;
  const seen = new Set<string>([root.id]);
  while (walk && !seen.has(walk)) {
    seen.add(walk);
    const parentEvents = await pool.querySync(session.relays, { ids: [walk], limit: 1 });
    const parent = parentEvents[0];
    if (!parent) break;
    ancestors.unshift(parent);
    walk = replyTagsFromEvent(parent).parentId;
    if (walk === parent.id) break;
  }

  const all = [root, ...ancestors, ...replies];
  const profiles = await fetchProfiles(
    pool,
    session.relays,
    all.map((event) => event.pubkey),
  );
  const myFollows = await fetchContactPubkeys(pool, session.relays, session.pubkey);
  const followSet = new Set(myFollows);
  const mapOne = (event: Event) =>
    mapNostrNote(event, {
      profiles,
      viewer: {
        following: followSet.has(event.pubkey) ? `follow:${event.pubkey}` : undefined,
      },
    });

  return {
    post: mapOne(root),
    ancestors: ancestors.map(mapOne),
    replies: replies.filter((event) => event.id !== root.id).map(mapOne),
  };
}

export async function nostrCreatePost(
  pool: SimplePool,
  session: NostrSession,
  secretKey: NostrSecretKey,
  text: string,
): Promise<{ uri: string; cid: string }> {
  const event = await publishEvent(pool, session.relays, secretKey, {
    kind: kinds.ShortTextNote,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: text,
  });
  return { uri: event.id, cid: event.id };
}

export async function nostrReply(
  pool: SimplePool,
  session: NostrSession,
  secretKey: NostrSecretKey,
  input: { text: string; parentUri: string; rootUri: string },
): Promise<{ uri: string; cid: string }> {
  const parentId = input.parentUri.trim();
  const rootId = input.rootUri.trim() || parentId;
  const tags: string[][] = [
    ["e", rootId, "", "root"],
    ["e", parentId, "", "reply"],
  ];
  const parentEvents = await pool.querySync(session.relays, { ids: [parentId], limit: 1 });
  const parent = parentEvents[0];
  if (parent) tags.push(["p", parent.pubkey]);

  const event = await publishEvent(pool, session.relays, secretKey, {
    kind: kinds.ShortTextNote,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: input.text,
  });
  return { uri: event.id, cid: event.id };
}

export async function nostrLike(
  pool: SimplePool,
  session: NostrSession,
  secretKey: NostrSecretKey,
  eventId: string,
): Promise<{ uri: string }> {
  const targets = await pool.querySync(session.relays, { ids: [eventId], limit: 1 });
  const target = targets[0];
  const tags: string[][] = [["e", eventId, "", ""]];
  if (target) tags.push(["p", target.pubkey], ["k", String(target.kind)]);
  const event = await publishEvent(pool, session.relays, secretKey, {
    kind: kinds.Reaction,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "+",
  });
  return { uri: event.id };
}

export async function nostrUnlike(
  pool: SimplePool,
  session: NostrSession,
  secretKey: NostrSecretKey,
  likeUri: string,
): Promise<void> {
  await publishEvent(pool, session.relays, secretKey, {
    kind: kinds.EventDeletion,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["e", likeUri]],
    content: "",
  });
}

export async function nostrRepost(
  pool: SimplePool,
  session: NostrSession,
  secretKey: NostrSecretKey,
  eventId: string,
): Promise<{ uri: string }> {
  const targets = await pool.querySync(session.relays, { ids: [eventId], limit: 1 });
  const target = targets[0];
  const tags: string[][] = [["e", eventId]];
  if (target) {
    tags.push(["p", target.pubkey]);
  }
  const event = await publishEvent(pool, session.relays, secretKey, {
    kind: kinds.Repost,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: target ? JSON.stringify(target) : "",
  });
  return { uri: event.id };
}

export async function nostrUnrepost(
  pool: SimplePool,
  session: NostrSession,
  secretKey: NostrSecretKey,
  repostUri: string,
): Promise<void> {
  await publishEvent(pool, session.relays, secretKey, {
    kind: kinds.EventDeletion,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["e", repostUri]],
    content: "",
  });
}

export async function nostrFollow(
  pool: SimplePool,
  session: NostrSession,
  secretKey: NostrSecretKey,
  pubkey: string,
): Promise<{ uri: string }> {
  const target = decodeActor(pubkey);
  const existing = await fetchContactPubkeys(pool, session.relays, session.pubkey);
  const next = existing.includes(target) ? existing : [...existing, target];
  await publishEvent(pool, session.relays, secretKey, {
    kind: kinds.Contacts,
    created_at: Math.floor(Date.now() / 1000),
    tags: next.map((pk) => ["p", pk]),
    content: "",
  });
  return { uri: `follow:${target}` };
}

export async function nostrUnfollow(
  pool: SimplePool,
  session: NostrSession,
  secretKey: NostrSecretKey,
  followUri: string,
): Promise<void> {
  const target = followUri.startsWith("follow:")
    ? followUri.slice("follow:".length)
    : decodeActor(followUri);
  const existing = await fetchContactPubkeys(pool, session.relays, session.pubkey);
  const next = existing.filter((pk) => pk !== target);
  await publishEvent(pool, session.relays, secretKey, {
    kind: kinds.Contacts,
    created_at: Math.floor(Date.now() / 1000),
    tags: next.map((pk) => ["p", pk]),
    content: "",
  });
}

export function nostrListRelays(
  session: NostrSession,
): import("../../../shared/social.js").SocialSidebarLink[] {
  return session.relays.map((relay) => {
    let host = relay;
    try {
      host = new URL(relay).host || relay;
    } catch {
      /* keep raw */
    }
    return {
      id: relay,
      title: host,
      subtitle: relay,
      url: relay.replace(/^ws/i, "http"),
    };
  });
}

export async function nostrGetSuggestions(
  pool: SimplePool,
  session: NostrSession,
  limit = 8,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  const myFollows = await fetchContactPubkeys(pool, session.relays, session.pubkey);
  const followSet = new Set(myFollows);
  followSet.add(session.pubkey);

  const sample = myFollows.slice(0, 12);
  const candidateCounts = new Map<string, number>();
  await Promise.all(
    sample.map(async (pubkey) => {
      const theirFollows = await fetchContactPubkeys(pool, session.relays, pubkey);
      for (const candidate of theirFollows.slice(0, 40)) {
        if (followSet.has(candidate)) continue;
        candidateCounts.set(candidate, (candidateCounts.get(candidate) ?? 0) + 1);
      }
    }),
  );

  const ranked = [...candidateCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pubkey]) => pubkey);

  if (!ranked.length) return [];
  const profiles = await fetchProfiles(pool, session.relays, ranked);
  return ranked.map((pubkey) => {
    const author = authorFromProfile(pubkey, profiles.get(pubkey));
    const meta = profiles.get(pubkey) ? parseProfileContent(profiles.get(pubkey)!.content) : {};
    return {
      ...author,
      description: meta.about?.trim()?.slice(0, 140),
    };
  });
}

export async function nostrSearchActors(
  pool: SimplePool,
  session: NostrSession,
  query: string,
  limit = 10,
): Promise<import("../../../shared/social.js").SocialSuggestedActor[]> {
  const q = query.trim();
  if (!q) return [];

  // Direct npub / hex lookup.
  try {
    const pubkey = decodeActor(q);
    const profiles = await fetchProfiles(pool, session.relays, [pubkey]);
    const myFollows = await fetchContactPubkeys(pool, session.relays, session.pubkey);
    const author = authorFromProfile(pubkey, profiles.get(pubkey));
    const meta = profiles.get(pubkey) ? parseProfileContent(profiles.get(pubkey)!.content) : {};
    return [
      {
        ...author,
        description: meta.about?.trim()?.slice(0, 140),
        viewer: myFollows.includes(pubkey) ? { following: `follow:${pubkey}` } : undefined,
      },
    ];
  } catch {
    /* fall through to NIP-50 / name scan */
  }

  let events: Event[] = [];
  try {
    events = await pool.querySync(session.relays, {
      kinds: [kinds.Metadata],
      search: q,
      limit,
    } as Filter);
  } catch {
    events = [];
  }

  if (!events.length) {
    // Fallback: scan recent metadata events for a name match (best-effort).
    const recent = await pool.querySync(session.relays, {
      kinds: [kinds.Metadata],
      limit: 80,
    });
    const needle = q.toLowerCase();
    events = recent.filter((event) => {
      const meta = parseProfileContent(event.content);
      const hay = `${meta.display_name ?? ""} ${meta.name ?? ""} ${meta.about ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  const byPubkey = new Map<string, Event>();
  for (const event of events) {
    const existing = byPubkey.get(event.pubkey);
    if (!existing || event.created_at > existing.created_at) {
      byPubkey.set(event.pubkey, event);
    }
  }
  const pubkeys = [...byPubkey.keys()].slice(0, limit);
  const myFollows = await fetchContactPubkeys(pool, session.relays, session.pubkey);
  const followSet = new Set(myFollows);
  return pubkeys.map((pubkey) => {
    const profile = byPubkey.get(pubkey);
    const author = authorFromProfile(pubkey, profile);
    const meta = profile ? parseProfileContent(profile.content) : {};
    return {
      ...author,
      description: meta.about?.trim()?.slice(0, 140),
      viewer: followSet.has(pubkey) ? { following: `follow:${pubkey}` } : undefined,
    };
  });
}
