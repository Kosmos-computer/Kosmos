/**
 * Social gateway — Bluesky, Mastodon, Nostr, X, Facebook, Reddit, and Bitsocial connect/feed/engagement proxied server-side.
 */
import type {
  SocialAccountInfo,
  SocialBitsocialConnectInput,
  SocialBlueskyConnectInput,
  SocialCreatePostInput,
  SocialFacebookConnectInput,
  SocialFeedResponse,
  SocialFollowInput,
  SocialLikeInput,
  SocialMastodonConnectInput,
  SocialNostrConnectInput,
  SocialNostrRelaysUpdateInput,
  SocialProfileResponse,
  SocialRedditConnectInput,
  SocialReplyInput,
  SocialRepostInput,
  SocialSearchResponse,
  SocialSidebarResponse,
  SocialStatusResponse,
  SocialThreadResponse,
  SocialTwitterConnectInput,
} from "../../shared/social.js";
import {
  bitsocialCreatePost,
  bitsocialFollowCommunity,
  bitsocialGetPostThread,
  bitsocialGetProfile,
  bitsocialGetTimeline,
  bitsocialLike,
  bitsocialListCommunityLinks,
  bitsocialReply,
  bitsocialSearchCommunities,
  bitsocialVerifyConnection,
  decodeBitsocialService,
  encodeBitsocialService,
  normalizeBitsocialCommunities,
  normalizeBitsocialRpcUrl,
  type BitsocialSession,
} from "./adapters/bitsocial.js";
import {
  bitsocialDaemon,
  isManagedBitsocialRpcUrl,
} from "../services/bitsocialDaemon.js";
import {
  blueskyCreatePost,
  blueskyFollow,
  blueskyGetAuthorFeed,
  blueskyGetDiscoverFeeds,
  blueskyGetPostThread,
  blueskyGetProfile,
  blueskyGetSuggestions,
  blueskyGetTimeline,
  blueskyGetTrends,
  blueskyLike,
  blueskyLogin,
  blueskyReply,
  blueskyRepost,
  blueskyResumeSession,
  blueskySearchActors,
  blueskyUnfollow,
  blueskyUnlike,
  blueskyUnrepost,
  createBlueskyAgent,
} from "./adapters/bluesky.js";
import {
  createFacebookClient,
  facebookCreateComment,
  facebookCreatePost,
  facebookGetAuthorFeed,
  facebookGetHomeTimeline,
  facebookGetPostThread,
  facebookGetProfile,
  facebookLike,
  facebookSearchActors,
  facebookSharePost,
  facebookUnlike,
  facebookVerifyCredentials,
  type FacebookClient,
} from "./adapters/facebook.js";
import {
  createMastodonClient,
  mastodonCreateStatus,
  mastodonFavourite,
  mastodonFollow,
  mastodonGetAccountStatuses,
  mastodonGetHomeTimeline,
  mastodonGetProfile,
  mastodonGetStatusContext,
  mastodonGetSuggestions,
  mastodonGetTrendingLinks,
  mastodonGetTrendingTags,
  mastodonLookupAccount,
  mastodonReblog,
  mastodonSearchAccounts,
  mastodonUnfavourite,
  mastodonUnfollow,
  mastodonUnreblog,
  mastodonVerifyCredentials,
  normalizeInstanceUrl,
  type MastodonClient,
} from "./adapters/mastodon.js";
import {
  createNostrPool,
  NOSTR_DEFAULT_RELAYS,
  nostrCreatePost,
  nostrFollow,
  nostrGetAuthorFeed,
  nostrGetPostThread,
  nostrGetProfile,
  nostrGetSuggestions,
  nostrGetTimeline,
  nostrLike,
  nostrListRelays,
  nostrReply,
  nostrRepost,
  nostrSearchActors,
  nostrSessionFromSecret,
  nostrUnfollow,
  nostrUnlike,
  nostrUnrepost,
  parseNostrRelays,
  parseNostrSecretKey,
  type NostrSecretKey,
  type NostrSession,
} from "./adapters/nostr.js";
import {
  createRedditClient,
  normalizeSubreddit,
  redditCreateComment,
  redditCreatePost,
  redditCrosspost,
  redditGetAuthorFeed,
  redditGetHomeTimeline,
  redditGetPostThread,
  redditGetProfile,
  redditGetSuggestions,
  redditGetTrendingSubreddits,
  redditSearchActors,
  redditSubscribe,
  redditVerifyCredentials,
  redditVote,
  type RedditClient,
} from "./adapters/reddit.js";
import {
  createTwitterClient,
  twitterCreateTweet,
  twitterFollow,
  twitterGetAuthorFeed,
  twitterGetHomeTimeline,
  twitterGetProfile,
  twitterGetSuggestions,
  twitterGetTweetThread,
  twitterLike,
  twitterLookupUserId,
  twitterRetweet,
  twitterSearchUsers,
  twitterUnfollow,
  twitterUnlike,
  twitterUnretweet,
  twitterVerifyCredentials,
  type TwitterClient,
} from "./adapters/twitter.js";
import {
  BLUESKY_DEFAULT_SERVICE,
  decodeRelays,
  socialStore,
  type SocialAccountRecordPublic,
} from "./socialStore.js";

async function withBlueskyAgent<T>(
  userId: string,
  accountId: string | undefined,
  run: (agent: ReturnType<typeof createBlueskyAgent>, account: SocialAccountRecordPublic) => Promise<T>,
): Promise<T> {
  const account = socialStore.getForUser(userId, accountId);
  if (!account || account.provider !== "bluesky") {
    throw new Error("No Bluesky account connected");
  }

  const agent = createBlueskyAgent(account.service || BLUESKY_DEFAULT_SERVICE);
  const existingSession = socialStore.sessionFor(account);

  try {
    if (existingSession) {
      try {
        const resumed = await blueskyResumeSession(agent, existingSession);
        socialStore.saveSession(account.id, resumed);
      } catch {
        const password = socialStore.appPasswordFor(account);
        const session = await blueskyLogin(agent, {
          identifier: account.handle,
          password,
        });
        socialStore.saveSession(account.id, session);
      }
    } else {
      const password = socialStore.appPasswordFor(account);
      const session = await blueskyLogin(agent, {
        identifier: account.handle,
        password,
      });
      socialStore.saveSession(account.id, session);
    }

    return await run(agent, account);
  } catch (err) {
    socialStore.markStatus(account.id, "error");
    throw err;
  }
}

async function withMastodonClient<T>(
  userId: string,
  accountId: string | undefined,
  run: (client: MastodonClient, account: SocialAccountRecordPublic) => Promise<T>,
): Promise<T> {
  const account = socialStore.getForUser(userId, accountId);
  if (!account || account.provider !== "mastodon") {
    throw new Error("No Mastodon account connected");
  }

  try {
    const client = createMastodonClient(account.service, socialStore.accessTokenFor(account));
    return await run(client, account);
  } catch (err) {
    socialStore.markStatus(account.id, "error");
    throw err;
  }
}

async function withNostrSession<T>(
  userId: string,
  accountId: string | undefined,
  run: (
    pool: ReturnType<typeof createNostrPool>,
    session: NostrSession,
    secretKey: NostrSecretKey,
    account: SocialAccountRecordPublic,
  ) => Promise<T>,
): Promise<T> {
  const account = socialStore.getForUser(userId, accountId);
  if (!account || account.provider !== "nostr") {
    throw new Error("No Nostr account connected");
  }

  const pool = createNostrPool();
  let relays: string[] = decodeRelays(account.service);
  try {
    const secretKey = parseNostrSecretKey(socialStore.nsecFor(account));
    const session = nostrSessionFromSecret(secretKey, relays);
    relays = session.relays;
    return await run(pool, session, secretKey, account);
  } catch (err) {
    socialStore.markStatus(account.id, "error");
    throw err;
  } finally {
    pool.close(relays);
  }
}

async function withTwitterClient<T>(
  userId: string,
  accountId: string | undefined,
  run: (client: TwitterClient, account: SocialAccountRecordPublic) => Promise<T>,
): Promise<T> {
  const account = socialStore.getForUser(userId, accountId);
  if (!account || account.provider !== "twitter") {
    throw new Error("No X/Twitter account connected");
  }

  try {
    const client = createTwitterClient(socialStore.accessTokenFor(account), {
      id: account.did,
      username: account.handle,
    });
    return await run(client, account);
  } catch (err) {
    socialStore.markStatus(account.id, "error");
    throw err;
  }
}

async function withFacebookClient<T>(
  userId: string,
  accountId: string | undefined,
  run: (client: FacebookClient, account: SocialAccountRecordPublic) => Promise<T>,
): Promise<T> {
  const account = socialStore.getForUser(userId, accountId);
  if (!account || account.provider !== "facebook") {
    throw new Error("No Facebook account connected");
  }

  try {
    const client = createFacebookClient(
      socialStore.accessTokenFor(account),
      {
        id: account.did,
        name: account.displayName ?? account.handle,
        username: account.handle,
        picture: account.avatar,
      },
      account.service === "page",
    );
    return await run(client, account);
  } catch (err) {
    socialStore.markStatus(account.id, "error");
    throw err;
  }
}

async function withRedditClient<T>(
  userId: string,
  accountId: string | undefined,
  run: (client: RedditClient, account: SocialAccountRecordPublic) => Promise<T>,
): Promise<T> {
  const account = socialStore.getForUser(userId, accountId);
  if (!account || account.provider !== "reddit") {
    throw new Error("No Reddit account connected");
  }

  try {
    const client = createRedditClient(
      socialStore.accessTokenFor(account),
      account.handle,
      account.service || undefined,
    );
    return await run(client, account);
  } catch (err) {
    socialStore.markStatus(account.id, "error");
    throw err;
  }
}

async function withBitsocialSession<T>(
  userId: string,
  accountId: string | undefined,
  run: (session: BitsocialSession, account: SocialAccountRecordPublic) => Promise<T>,
): Promise<T> {
  const account = socialStore.getForUser(userId, accountId);
  if (!account || account.provider !== "bitsocial") {
    throw new Error("No Bitsocial account connected");
  }

  try {
    const session = decodeBitsocialService(account.service);
    return await run(session, account);
  } catch (err) {
    socialStore.markStatus(account.id, "error");
    throw err;
  }
}

function resolveAccount(userId: string, accountId?: string): SocialAccountRecordPublic {
  const account = socialStore.getForUser(userId, accountId);
  if (!account) throw new Error("No social account connected");
  return account;
}

export const socialGateway = {
  status(userId: string): SocialStatusResponse {
    return { accounts: socialStore.listForUser(userId) };
  },

  listAccounts(userId: string): SocialAccountInfo[] {
    return socialStore.listForUser(userId);
  },

  disconnect(userId: string, accountId: string): boolean {
    return socialStore.disconnect(userId, accountId);
  },

  async connectWithAppPassword(
    userId: string,
    input: SocialBlueskyConnectInput,
  ): Promise<SocialAccountInfo> {
    const handle = input.handle.trim().replace(/^@/, "");
    const appPassword = input.appPassword.trim();
    if (!handle) throw new Error("Bluesky handle is required");
    if (!appPassword) throw new Error("Bluesky app password is required");

    const service = (input.service?.trim() || BLUESKY_DEFAULT_SERVICE).replace(/\/$/, "");
    const agent = createBlueskyAgent(service);
    const session = await blueskyLogin(agent, {
      identifier: handle,
      password: appPassword,
    });

    let displayName: string | undefined;
    let avatar: string | undefined;
    try {
      const profile = await blueskyGetProfile(agent, session.did);
      displayName = profile.displayName;
      avatar = profile.avatar;
    } catch {
      /* Profile metadata is optional for connect. */
    }

    return socialStore.upsertBlueskyAccount({
      userId,
      handle: session.handle,
      did: session.did,
      service,
      appPassword,
      session,
      displayName,
      avatar,
    });
  },

  async connectMastodon(
    userId: string,
    input: SocialMastodonConnectInput,
  ): Promise<SocialAccountInfo> {
    const accessToken = input.accessToken.trim();
    if (!accessToken) throw new Error("Mastodon access token is required");
    const instanceUrl = normalizeInstanceUrl(input.instanceUrl);
    const client = createMastodonClient(instanceUrl, accessToken);
    const account = await mastodonVerifyCredentials(client);
    const handle = account.acct || account.username;
    if (!handle) throw new Error("Could not verify Mastodon credentials");

    return socialStore.upsertMastodonAccount({
      userId,
      handle,
      accountId: account.id,
      instanceUrl,
      accessToken,
      displayName: account.display_name?.trim() || handle,
      avatar: account.avatar,
    });
  },

  async connectWithNostrKey(
    userId: string,
    input: SocialNostrConnectInput,
  ): Promise<SocialAccountInfo> {
    const nsec = input.nsec.trim();
    if (!nsec) throw new Error("Nostr private key is required");
    const secretKey = parseNostrSecretKey(nsec);
    const session = nostrSessionFromSecret(secretKey, input.relays ?? []);

    let displayName: string | undefined;
    let avatar: string | undefined;
    const pool = createNostrPool();
    try {
      const profile = await nostrGetProfile(pool, session, session.pubkey);
      displayName = profile.displayName;
      avatar = profile.avatar;
    } catch {
      /* Profile metadata is optional for connect. */
    } finally {
      pool.close(session.relays);
    }

    return socialStore.upsertNostrAccount({
      userId,
      npub: session.npub,
      pubkey: session.pubkey,
      relays: session.relays,
      nsec,
      displayName,
      avatar,
    });
  },

  /** Update relays for a connected Nostr account without re-entering nsec. */
  updateNostrRelays(
    userId: string,
    accountId: string,
    input: SocialNostrRelaysUpdateInput,
  ): SocialAccountInfo {
    const raw = input.relays ?? [];
    const hasInput = raw.some((relay) => relay.trim().length > 0);
    const parsed = parseNostrRelays(raw);
    if (hasInput && parsed.length === 0) {
      throw new Error("No valid wss:// or ws:// relay URLs");
    }
    const relays = parsed.length ? parsed : [...NOSTR_DEFAULT_RELAYS];
    return socialStore.updateNostrRelays(userId, accountId, relays);
  },

  async connectTwitter(
    userId: string,
    input: SocialTwitterConnectInput,
  ): Promise<SocialAccountInfo> {
    const accessToken = input.accessToken.trim();
    if (!accessToken) throw new Error("X/Twitter access token is required");
    const user = await twitterVerifyCredentials(accessToken);
    return socialStore.upsertTwitterAccount({
      userId,
      handle: user.username,
      userIdOnNetwork: user.id,
      accessToken,
      displayName: user.name?.trim() || user.username,
      avatar: user.profile_image_url,
    });
  },

  async connectFacebook(
    userId: string,
    input: SocialFacebookConnectInput,
  ): Promise<SocialAccountInfo> {
    const accessToken = input.accessToken.trim();
    if (!accessToken) throw new Error("Facebook access token is required");
    const { actor, isPage } = await facebookVerifyCredentials(accessToken, input.pageId);
    const handle = actor.username?.trim() || actor.name?.trim() || actor.id;
    const avatar =
      typeof actor.picture === "string" ? actor.picture : actor.picture?.data?.url;
    return socialStore.upsertFacebookAccount({
      userId,
      handle,
      actorId: actor.id,
      accessToken,
      isPage,
      displayName: actor.name?.trim() || handle,
      avatar,
    });
  },

  async connectReddit(
    userId: string,
    input: SocialRedditConnectInput,
  ): Promise<SocialAccountInfo> {
    const accessToken = input.accessToken.trim();
    if (!accessToken) throw new Error("Reddit access token is required");
    const me = await redditVerifyCredentials(accessToken);
    const avatar = (me.snoovatar_img || me.icon_img || "")
      .split("?")[0]
      .replace(/&amp;/g, "&");
    return socialStore.upsertRedditAccount({
      userId,
      handle: me.name,
      redditId: me.id || me.name,
      accessToken,
      defaultSubreddit: normalizeSubreddit(input.defaultSubreddit),
      displayName: me.name,
      avatar: avatar || undefined,
    });
  },

  async connectBitsocial(
    userId: string,
    input: SocialBitsocialConnectInput,
  ): Promise<SocialAccountInfo> {
    const rpcUrl = normalizeBitsocialRpcUrl(input.rpcUrl ?? "");
    const communities = normalizeBitsocialCommunities(input.communities ?? []);

    if (isManagedBitsocialRpcUrl(rpcUrl)) {
      const daemon = await bitsocialDaemon.ensureRunning();
      if (daemon.phase !== "running") {
        throw new Error(
          daemon.detail ||
            "Bitsocial daemon is not running. Install @bitsocial/bitsocial-cli or start it with npm run bitsocial.",
        );
      }
    }

    try {
      const verified = await bitsocialVerifyConnection(rpcUrl);
      const service = encodeBitsocialService({ rpcUrl, communities });
      return socialStore.upsertBitsocialAccount({
        userId,
        handle: verified.handle,
        did: rpcUrl,
        service,
        displayName: "Bitsocial",
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      if (/Could not connect to Bitsocial RPC/i.test(detail)) {
        throw new Error(
          `${detail}. Start the daemon with Connect (auto-start) or \`npm run bitsocial\`. Install CLI: npm i -g @bitsocial/bitsocial-cli`,
        );
      }
      throw err;
    }
  },

  async getHomeFeed(
    userId: string,
    opts: { cursor?: string; accountId?: string } = {},
  ): Promise<SocialFeedResponse> {
    const account = resolveAccount(userId, opts.accountId);
    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, (client) =>
        mastodonGetHomeTimeline(client, { cursor: opts.cursor, limit: 30 }),
      );
    }
    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, (pool, session) =>
        nostrGetTimeline(pool, session, { cursor: opts.cursor, limit: 30 }),
      );
    }
    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, (client) =>
        twitterGetHomeTimeline(client, { cursor: opts.cursor, limit: 30 }),
      );
    }
    if (account.provider === "facebook") {
      return withFacebookClient(userId, account.id, (client) =>
        facebookGetHomeTimeline(client, { cursor: opts.cursor, limit: 25 }),
      );
    }
    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, (client) =>
        redditGetHomeTimeline(client, { cursor: opts.cursor, limit: 25 }),
      );
    }
    if (account.provider === "bitsocial") {
      return withBitsocialSession(userId, account.id, (session) =>
        bitsocialGetTimeline(session, { cursor: opts.cursor, limit: 30 }),
      );
    }
    return withBlueskyAgent(userId, account.id, async (agent) => {
      return blueskyGetTimeline(agent, { cursor: opts.cursor, limit: 30 });
    });
  },

  async getProfile(
    userId: string,
    opts: { actor: string; cursor?: string; accountId?: string },
  ): Promise<SocialProfileResponse> {
    const actor = opts.actor.trim().replace(/^@/, "");
    if (!actor) throw new Error("Actor handle or DID is required");
    const account = resolveAccount(userId, opts.accountId);
    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, async (client) => {
        const profile = await mastodonGetProfile(client, actor);
        const feed = await mastodonGetAccountStatuses(client, {
          accountId: profile.did,
          cursor: opts.cursor,
          limit: 30,
        });
        return { profile, feed };
      });
    }
    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, async (pool, session) => {
        const [profile, feed] = await Promise.all([
          nostrGetProfile(pool, session, actor),
          nostrGetAuthorFeed(pool, session, { actor, cursor: opts.cursor, limit: 30 }),
        ]);
        return { profile, feed };
      });
    }
    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, async (client) => {
        const profile = await twitterGetProfile(client, actor);
        const feed = await twitterGetAuthorFeed(client, {
          userId: profile.did,
          cursor: opts.cursor,
          limit: 30,
        });
        return { profile, feed };
      });
    }
    if (account.provider === "facebook") {
      return withFacebookClient(userId, account.id, async (client) => {
        const profile = await facebookGetProfile(client, actor);
        const feed = await facebookGetAuthorFeed(client, {
          actorId: profile.did,
          cursor: opts.cursor,
          limit: 25,
        });
        return { profile, feed };
      });
    }
    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, async (client) => {
        const username = actor.replace(/^\/?u\//i, "");
        const profile = await redditGetProfile(client, username);
        const feed = await redditGetAuthorFeed(client, {
          username: profile.handle,
          cursor: opts.cursor,
          limit: 25,
        });
        return { profile, feed };
      });
    }
    if (account.provider === "bitsocial") {
      return withBitsocialSession(userId, account.id, (session) =>
        bitsocialGetProfile(session, actor),
      );
    }
    return withBlueskyAgent(userId, account.id, async (agent) => {
      const [profile, feed] = await Promise.all([
        blueskyGetProfile(agent, actor),
        blueskyGetAuthorFeed(agent, { actor, cursor: opts.cursor, limit: 30 }),
      ]);
      return { profile, feed };
    });
  },

  async getThread(
    userId: string,
    opts: { uri: string; accountId?: string },
  ): Promise<SocialThreadResponse> {
    const uri = opts.uri.trim();
    if (!uri) throw new Error("Post URI is required");
    const account = resolveAccount(userId, opts.accountId);
    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, (client) =>
        mastodonGetStatusContext(client, uri),
      );
    }
    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, (pool, session) =>
        nostrGetPostThread(pool, session, uri),
      );
    }
    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, (client) =>
        twitterGetTweetThread(client, uri),
      );
    }
    if (account.provider === "facebook") {
      return withFacebookClient(userId, account.id, (client) =>
        facebookGetPostThread(client, uri),
      );
    }
    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, (client) =>
        redditGetPostThread(client, uri),
      );
    }
    if (account.provider === "bitsocial") {
      return withBitsocialSession(userId, account.id, (session) =>
        bitsocialGetPostThread(session, uri),
      );
    }
    return withBlueskyAgent(userId, account.id, (agent) => blueskyGetPostThread(agent, uri));
  },

  async createPost(
    userId: string,
    input: SocialCreatePostInput,
  ): Promise<{ uri: string; cid: string }> {
    const text = input.text.trim();
    if (!text) throw new Error("Post text is required");
    const account = resolveAccount(userId, input.accountId);
    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, (client) =>
        mastodonCreateStatus(client, { text }),
      );
    }
    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, (pool, session, secretKey) =>
        nostrCreatePost(pool, session, secretKey, text),
      );
    }
    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, (client) =>
        twitterCreateTweet(client, { text }),
      );
    }
    if (account.provider === "facebook") {
      return withFacebookClient(userId, account.id, (client) =>
        facebookCreatePost(client, { text }),
      );
    }
    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, (client) =>
        redditCreatePost(client, { text }),
      );
    }
    if (account.provider === "bitsocial") {
      return bitsocialCreatePost();
    }
    return withBlueskyAgent(userId, account.id, (agent) => blueskyCreatePost(agent, text));
  },

  async replyToPost(
    userId: string,
    input: SocialReplyInput,
  ): Promise<{ uri: string; cid: string }> {
    const text = input.text.trim();
    if (!text) throw new Error("Reply text is required");
    if (!input.parentUri || !input.parentCid || !input.rootUri || !input.rootCid) {
      throw new Error("Reply parent/root refs are required");
    }
    const account = resolveAccount(userId, input.accountId);
    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, (client) =>
        mastodonCreateStatus(client, { text, inReplyToId: input.parentUri }),
      );
    }
    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, (pool, session, secretKey) =>
        nostrReply(pool, session, secretKey, {
          text,
          parentUri: input.parentUri,
          rootUri: input.rootUri,
        }),
      );
    }
    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, (client) =>
        twitterCreateTweet(client, { text, inReplyToId: input.parentUri }),
      );
    }
    if (account.provider === "facebook") {
      return withFacebookClient(userId, account.id, (client) =>
        facebookCreateComment(client, { postId: input.parentUri, text }),
      );
    }
    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, (client) =>
        redditCreateComment(client, { parentId: input.parentUri, text }),
      );
    }
    if (account.provider === "bitsocial") {
      return bitsocialReply();
    }
    return withBlueskyAgent(userId, account.id, (agent) =>
      blueskyReply(agent, {
        text,
        parentUri: input.parentUri,
        parentCid: input.parentCid,
        rootUri: input.rootUri,
        rootCid: input.rootCid,
      }),
    );
  },

  async likePost(
    userId: string,
    input: SocialLikeInput,
  ): Promise<{ ok: true; likeUri?: string }> {
    const account = resolveAccount(userId, input.accountId);
    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, async (client) => {
        if (input.unlike) {
          const statusId = input.likeUri || input.uri;
          if (!statusId) throw new Error("Status id is required to unfavourite");
          await mastodonUnfavourite(client, statusId);
          return { ok: true as const };
        }
        const result = await mastodonFavourite(client, input.uri);
        return { ok: true as const, likeUri: result.uri };
      });
    }
    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, async (pool, session, secretKey) => {
        if (input.unlike) {
          if (!input.likeUri) throw new Error("likeUri is required to unlike");
          await nostrUnlike(pool, session, secretKey, input.likeUri);
          return { ok: true as const };
        }
        const result = await nostrLike(pool, session, secretKey, input.uri);
        return { ok: true as const, likeUri: result.uri };
      });
    }
    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, async (client) => {
        if (input.unlike) {
          const tweetId = input.likeUri || input.uri;
          if (!tweetId) throw new Error("Tweet id is required to unlike");
          await twitterUnlike(client, tweetId);
          return { ok: true as const };
        }
        const result = await twitterLike(client, input.uri);
        return { ok: true as const, likeUri: result.uri };
      });
    }
    if (account.provider === "facebook") {
      return withFacebookClient(userId, account.id, async (client) => {
        if (input.unlike) {
          const objectId = input.likeUri || input.uri;
          if (!objectId) throw new Error("Post id is required to unlike");
          await facebookUnlike(client, objectId);
          return { ok: true as const };
        }
        const result = await facebookLike(client, input.uri);
        return { ok: true as const, likeUri: result.uri };
      });
    }
    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, async (client) => {
        const thingId = input.likeUri || input.uri;
        if (!thingId) throw new Error("Post id is required to vote");
        await redditVote(client, thingId, input.unlike ? 0 : 1);
        return { ok: true as const, likeUri: input.unlike ? undefined : thingId };
      });
    }
    if (account.provider === "bitsocial") {
      return bitsocialLike();
    }
    return withBlueskyAgent(userId, input.accountId, async (agent) => {
      if (input.unlike) {
        if (!input.likeUri) throw new Error("likeUri is required to unlike");
        await blueskyUnlike(agent, input.likeUri);
        return { ok: true as const };
      }
      const result = await blueskyLike(agent, input.uri, input.cid);
      return { ok: true as const, likeUri: result.uri };
    });
  },

  async repostPost(
    userId: string,
    input: SocialRepostInput,
  ): Promise<{ ok: true; repostUri?: string }> {
    const account = resolveAccount(userId, input.accountId);
    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, async (client) => {
        if (input.unrepost) {
          const statusId = input.repostUri || input.uri;
          if (!statusId) throw new Error("Status id is required to unreblog");
          await mastodonUnreblog(client, statusId);
          return { ok: true as const };
        }
        const result = await mastodonReblog(client, input.uri);
        return { ok: true as const, repostUri: result.uri };
      });
    }
    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, async (pool, session, secretKey) => {
        if (input.unrepost) {
          if (!input.repostUri) throw new Error("repostUri is required to unrepost");
          await nostrUnrepost(pool, session, secretKey, input.repostUri);
          return { ok: true as const };
        }
        const result = await nostrRepost(pool, session, secretKey, input.uri);
        return { ok: true as const, repostUri: result.uri };
      });
    }
    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, async (client) => {
        if (input.unrepost) {
          const tweetId = input.repostUri || input.uri;
          if (!tweetId) throw new Error("Tweet id is required to unrepost");
          await twitterUnretweet(client, tweetId);
          return { ok: true as const };
        }
        const result = await twitterRetweet(client, input.uri);
        return { ok: true as const, repostUri: result.uri };
      });
    }
    if (account.provider === "facebook") {
      return withFacebookClient(userId, account.id, async (client) => {
        if (input.unrepost) {
          throw new Error("Facebook does not support unsharing via Graph API");
        }
        const result = await facebookSharePost(client, input.uri);
        return { ok: true as const, repostUri: result.uri };
      });
    }
    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, async (client) => {
        if (input.unrepost) {
          throw new Error("Reddit does not support uncrosspost via API");
        }
        const result = await redditCrosspost(client, input.uri);
        return { ok: true as const, repostUri: result.uri };
      });
    }
    if (account.provider === "bitsocial") {
      throw new Error("Bitsocial does not support reposts — subscribe to communities instead");
    }
    return withBlueskyAgent(userId, input.accountId, async (agent) => {
      if (input.unrepost) {
        if (!input.repostUri) throw new Error("repostUri is required to unrepost");
        await blueskyUnrepost(agent, input.repostUri);
        return { ok: true as const };
      }
      const result = await blueskyRepost(agent, input.uri, input.cid);
      return { ok: true as const, repostUri: result.uri };
    });
  },

  async followActor(
    userId: string,
    input: SocialFollowInput,
  ): Promise<{ ok: true; followUri?: string }> {
    const account = resolveAccount(userId, input.accountId);
    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, async (client) => {
        if (input.unfollow) {
          const targetId = input.followUri || input.did;
          if (!targetId) throw new Error("Account id is required to unfollow");
          await mastodonUnfollow(client, targetId);
          return { ok: true as const };
        }
        const did = input.did.trim();
        if (!did) throw new Error("Account id is required");
        const target = /^\d+$/.test(did) ? did : (await mastodonLookupAccount(client, did)).id;
        const result = await mastodonFollow(client, target);
        return { ok: true as const, followUri: result.uri };
      });
    }
    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, async (pool, session, secretKey) => {
        if (input.unfollow) {
          if (!input.followUri) throw new Error("followUri is required to unfollow");
          await nostrUnfollow(pool, session, secretKey, input.followUri);
          return { ok: true as const };
        }
        const did = input.did.trim();
        if (!did) throw new Error("Actor pubkey is required");
        const result = await nostrFollow(pool, session, secretKey, did);
        return { ok: true as const, followUri: result.uri };
      });
    }
    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, async (client) => {
        if (input.unfollow) {
          const targetId = input.followUri || input.did;
          if (!targetId) throw new Error("User id is required to unfollow");
          const resolved = await twitterLookupUserId(client, targetId);
          await twitterUnfollow(client, resolved);
          return { ok: true as const };
        }
        const did = input.did.trim();
        if (!did) throw new Error("User id is required");
        const target = await twitterLookupUserId(client, did);
        const result = await twitterFollow(client, target);
        return { ok: true as const, followUri: result.uri };
      });
    }
    if (account.provider === "facebook") {
      throw new Error("Facebook follow is not supported via Graph API for Pages");
    }
    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, async (client) => {
        const target = (input.followUri || input.did).trim();
        if (!target) throw new Error("Subreddit or username is required");
        const result = await redditSubscribe(
          client,
          target,
          input.unfollow ? "unsub" : "sub",
        );
        return { ok: true as const, followUri: input.unfollow ? undefined : result.uri };
      });
    }
    if (account.provider === "bitsocial") {
      return withBitsocialSession(userId, account.id, async (session, bitsocialAccount) => {
        if (input.unfollow) {
          throw new Error("Unsubscribe from communities in Bitsocial settings for now");
        }
        const next = await bitsocialFollowCommunity(session, input.did);
        socialStore.updateBitsocialService(bitsocialAccount.id, encodeBitsocialService(next));
        return { ok: true as const, followUri: input.did.trim() };
      });
    }
    return withBlueskyAgent(userId, input.accountId, async (agent) => {
      if (input.unfollow) {
        if (!input.followUri) throw new Error("followUri is required to unfollow");
        await blueskyUnfollow(agent, input.followUri);
        return { ok: true as const };
      }
      const did = input.did.trim();
      if (!did) throw new Error("Actor DID is required");
      const result = await blueskyFollow(agent, did);
      return { ok: true as const, followUri: result.uri };
    });
  },

  async getSidebar(
    userId: string,
    opts: { accountId?: string } = {},
  ): Promise<SocialSidebarResponse> {
    const account = resolveAccount(userId, opts.accountId);

    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, async (client) => {
        const [trends, suggestions, links] = await Promise.all([
          mastodonGetTrendingTags(client).catch(() => []),
          mastodonGetSuggestions(client).catch(() => []),
          mastodonGetTrendingLinks(client).catch(() => []),
        ]);
        return {
          provider: "mastodon",
          trends,
          suggestions,
          links,
          linksModule: links.length ? "trending-links" : undefined,
        };
      });
    }

    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, async (pool, session) => {
        const [suggestions, links] = await Promise.all([
          nostrGetSuggestions(pool, session).catch(() => []),
          Promise.resolve(nostrListRelays(session)),
        ]);
        return {
          provider: "nostr",
          trends: [],
          suggestions,
          links,
          linksModule: links.length ? "relays" : undefined,
        };
      });
    }

    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, async (client) => {
        const suggestions = await twitterGetSuggestions(client).catch(() => []);
        return {
          provider: "twitter",
          trends: [],
          suggestions,
          links: [],
        };
      });
    }

    if (account.provider === "facebook") {
      return {
        provider: "facebook",
        trends: [],
        suggestions: [],
        links: [],
      };
    }

    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, async (client) => {
        const [trends, suggestions] = await Promise.all([
          redditGetTrendingSubreddits(client).catch(() => []),
          redditGetSuggestions(client).catch(() => []),
        ]);
        return {
          provider: "reddit",
          trends,
          suggestions,
          links: [],
          linksModule: undefined,
        };
      });
    }

    if (account.provider === "bitsocial") {
      return withBitsocialSession(userId, account.id, async (session) => {
        const links = bitsocialListCommunityLinks(session);
        return {
          provider: "bitsocial",
          trends: [],
          suggestions: [],
          links,
          linksModule: links.length ? "communities" : undefined,
        };
      });
    }

    return withBlueskyAgent(userId, account.id, async (agent) => {
      const [trends, suggestions, links] = await Promise.all([
        blueskyGetTrends(agent).catch(() => []),
        blueskyGetSuggestions(agent).catch(() => []),
        blueskyGetDiscoverFeeds(agent).catch(() => []),
      ]);
      return {
        provider: "bluesky",
        trends,
        suggestions,
        links,
        linksModule: links.length ? "discover-feeds" : undefined,
      };
    });
  },

  async searchActors(
    userId: string,
    opts: { query: string; accountId?: string },
  ): Promise<SocialSearchResponse> {
    const query = opts.query.trim();
    if (!query) return { actors: [] };
    const account = resolveAccount(userId, opts.accountId);

    if (account.provider === "mastodon") {
      return withMastodonClient(userId, account.id, async (client) => ({
        actors: await mastodonSearchAccounts(client, query),
      }));
    }
    if (account.provider === "nostr") {
      return withNostrSession(userId, account.id, async (pool, session) => ({
        actors: await nostrSearchActors(pool, session, query),
      }));
    }
    if (account.provider === "twitter") {
      return withTwitterClient(userId, account.id, async (client) => ({
        actors: await twitterSearchUsers(client, query),
      }));
    }
    if (account.provider === "facebook") {
      return withFacebookClient(userId, account.id, async (client) => ({
        actors: await facebookSearchActors(client, query),
      }));
    }
    if (account.provider === "reddit") {
      return withRedditClient(userId, account.id, async (client) => ({
        actors: await redditSearchActors(client, query),
      }));
    }
    if (account.provider === "bitsocial") {
      return withBitsocialSession(userId, account.id, async (session) => ({
        actors: bitsocialSearchCommunities(session, query),
      }));
    }
    return withBlueskyAgent(userId, account.id, async (agent) => ({
      actors: await blueskySearchActors(agent, query),
    }));
  },
};
