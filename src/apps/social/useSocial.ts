/**
 * Live Bluesky / Mastodon / Nostr / X / Facebook social workspace via /api/social.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SocialAccountInfo,
  SocialFeedPost,
  SocialProfile,
  SocialProvider,
  SocialSidebarLink,
  SocialSuggestedActor,
  SocialThreadResponse,
  SocialTrendItem,
} from "@shared/social";
import type { ConnectServiceInput } from "../../connections/useConnectionStore";
import { useConnectionStore } from "../../connections/useConnectionStore";
import { api } from "../../lib/api";
import { SOCIAL_NETWORKS } from "./socialMock";
import type { SocialNavId } from "./SocialNav";
import type { SocialNetworkId, SocialPost } from "./types";

const LIVE_PROVIDERS = new Set<SocialNetworkId>([
  "bluesky",
  "mastodon",
  "nostr",
  "twitter",
  "facebook",
]);

export type SocialDetailView =
  | { kind: "home" }
  | { kind: "profile"; actor: string }
  | { kind: "thread"; uri: string };

/** Per-account UI session so switching rails doesn't clobber navigation. */
interface AccountUiSession {
  navId: SocialNavId;
  detailView: SocialDetailView;
  feedTab: string;
  composerValue: string;
  searchQuery: string;
}

const DEFAULT_ACCOUNT_SESSION: AccountUiSession = {
  navId: "home",
  detailView: { kind: "home" },
  feedTab: "following",
  composerValue: "",
  searchQuery: "",
};

function formatRelativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return iso;
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function toUiPost(post: SocialFeedPost): SocialPost & { feed: SocialFeedPost } {
  return {
    id: post.uri,
    authorName: post.author.displayName,
    authorHandle: `@${post.author.handle}`,
    timestamp: formatRelativeTime(post.createdAt),
    content: post.text,
    stats: {
      replies: post.counts.replies,
      reposts: post.counts.reposts,
      likes: post.counts.likes,
    },
    feed: post,
  };
}

function patchPosts(
  posts: (SocialPost & { feed: SocialFeedPost })[],
  uri: string,
  update: (feed: SocialFeedPost) => SocialFeedPost,
): (SocialPost & { feed: SocialFeedPost })[] {
  return posts.map((entry) => {
    if (entry.feed.uri !== uri) return entry;
    const nextFeed = update(entry.feed);
    return { ...toUiPost(nextFeed), feed: nextFeed };
  });
}

function isLiveProvider(id: SocialNetworkId): id is SocialProvider {
  return LIVE_PROVIDERS.has(id);
}

export function useSocial() {
  const connections = useConnectionStore((s) => s.connectionsForDomain("social"));
  const connectionByProvider = useConnectionStore((s) => s.connectionByProvider);
  const addConnection = useConnectionStore((s) => s.addConnection);
  const connectionsAll = useConnectionStore((s) => s.connections);

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SocialAccountInfo[]>([]);
  const [feedPosts, setFeedPosts] = useState<(SocialPost & { feed: SocialFeedPost })[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [feedTab, setFeedTab] = useState("following");
  const [navId, setNavId] = useState<SocialNavId>("home");
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectProvider, setConnectProvider] = useState<SocialNetworkId | undefined>();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingToUri, setReplyingToUri] = useState<string | null>(null);
  const [replyValue, setReplyValue] = useState("");
  const [detailView, setDetailView] = useState<SocialDetailView>({ kind: "home" });
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [profilePosts, setProfilePosts] = useState<(SocialPost & { feed: SocialFeedPost })[]>([]);
  const [thread, setThread] = useState<SocialThreadResponse | null>(null);
  const [trends, setTrends] = useState<SocialTrendItem[]>([]);
  const [suggestions, setSuggestions] = useState<SocialSuggestedActor[]>([]);
  const [sidebarLinks, setSidebarLinks] = useState<SocialSidebarLink[]>([]);
  const [sidebarLinksModule, setSidebarLinksModule] = useState<
    "discover-feeds" | "trending-links" | "relays" | undefined
  >();
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialSuggestedActor[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const sessionsRef = useRef<Record<string, AccountUiSession>>({});
  const pendingRestoreRef = useRef<AccountUiSession | null>(null);

  const liveAccount = useMemo(() => {
    if (accounts.length === 0) return undefined;
    return accounts.find((account) => account.id === activeAccountId) ?? accounts[0];
  }, [accounts, activeAccountId]);

  const activeNetworkId = (liveAccount?.provider ?? "bluesky") as SocialNetworkId;
  const isLiveNetwork = Boolean(liveAccount && isLiveProvider(liveAccount.provider));
  const stubConnection = useMemo(
    () => connectionByProvider("social", activeNetworkId),
    [connectionByProvider, activeNetworkId],
  );

  const activeConnection = useMemo(() => {
    if (isLiveNetwork) {
      if (!liveAccount) return undefined;
      return {
        id: liveAccount.id,
        domain: "social" as const,
        provider: liveAccount.provider,
        label: liveAccount.displayName ?? liveAccount.handle,
        accountHint: `@${liveAccount.handle}`,
        status: liveAccount.status,
        connectedAt: liveAccount.connectedAt,
        instanceUrl: liveAccount.instanceUrl,
      };
    }
    return stubConnection;
  }, [isLiveNetwork, liveAccount, stubConnection]);

  const connectedNetworkIds = useMemo(() => {
    const ids = new Set(connections.map((c) => c.provider as SocialNetworkId));
    for (const account of accounts) ids.add(account.provider as SocialNetworkId);
    return ids;
  }, [accounts, connections]);

  const applyAccountSession = useCallback((session: AccountUiSession) => {
    pendingRestoreRef.current = session;
    setNavId(session.navId);
    setFeedTab(session.feedTab);
    setComposerValue(session.composerValue);
    setSearchQuery(session.searchQuery);
    setSearchResults([]);
    setSearchLoading(false);
    setReplyingToUri(null);
    setReplyValue("");
    setError(null);
    setFeedPosts([]);
    setProfile(null);
    setProfilePosts([]);
    setThread(null);
    setDetailView(session.detailView);
  }, []);

  useEffect(() => {
    if (accounts.length === 0) {
      if (activeAccountId !== null) setActiveAccountId(null);
      return;
    }
    if (!activeAccountId || !accounts.some((account) => account.id === activeAccountId)) {
      const nextId = accounts[0].id;
      applyAccountSession(sessionsRef.current[nextId] ?? { ...DEFAULT_ACCOUNT_SESSION });
      setActiveAccountId(nextId);
    }
  }, [accounts, activeAccountId, applyAccountSession]);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await api.socialStatus();
      setAccounts(status.accounts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load social status");
    }
  }, []);

  const refreshFeed = useCallback(async () => {
    if (!isLiveNetwork || !liveAccount) {
      setFeedPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const feed = await api.listSocialFeed({ accountId: liveAccount.id });
      setFeedPosts(feed.posts.map(toUiPost));
      setError(null);
    } catch (err) {
      setFeedPosts([]);
      setError(err instanceof Error ? err.message : "Could not load timeline");
    } finally {
      setLoading(false);
    }
  }, [isLiveNetwork, liveAccount]);

  const refreshSidebar = useCallback(async () => {
    if (!isLiveNetwork || !liveAccount) {
      setTrends([]);
      setSuggestions([]);
      setSidebarLinks([]);
      setSidebarLinksModule(undefined);
      setSidebarLoading(false);
      return;
    }
    setSidebarLoading(true);
    try {
      const sidebar = await api.getSocialSidebar({ accountId: liveAccount.id });
      setTrends(sidebar.trends);
      setSuggestions(sidebar.suggestions);
      setSidebarLinks(sidebar.links);
      setSidebarLinksModule(
        sidebar.linksModule === "discover-feeds" ||
          sidebar.linksModule === "trending-links" ||
          sidebar.linksModule === "relays"
          ? sidebar.linksModule
          : undefined,
      );
    } catch {
      setTrends([]);
      setSuggestions([]);
      setSidebarLinks([]);
      setSidebarLinksModule(undefined);
    } finally {
      setSidebarLoading(false);
    }
  }, [isLiveNetwork, liveAccount]);

  const runSearch = useCallback(
    async (query: string) => {
      const cleaned = query.trim();
      setSearchQuery(query);
      if (!isLiveNetwork || !liveAccount || !cleaned) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        const result = await api.searchSocialActors({
          query: cleaned,
          accountId: liveAccount.id,
        });
        setSearchResults(result.actors);
      } catch (err) {
        setSearchResults([]);
        setError(err instanceof Error ? err.message : "Could not search");
      } finally {
        setSearchLoading(false);
      }
    },
    [isLiveNetwork, liveAccount],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchLoading(false);
  }, []);

  const openHome = useCallback(() => {
    setDetailView({ kind: "home" });
    setProfile(null);
    setProfilePosts([]);
    setThread(null);
  }, []);

  const openProfile = useCallback(
    async (actor: string) => {
      if (!liveAccount) return;
      const cleaned = actor.trim().replace(/^@/, "");
      if (!cleaned) return;
      setDetailView({ kind: "profile", actor: cleaned });
      setThread(null);
      setDetailLoading(true);
      try {
        const result = await api.getSocialProfile({
          actor: cleaned,
          accountId: liveAccount.id,
        });
        setProfile(result.profile);
        setProfilePosts(result.feed.posts.map(toUiPost));
        setError(null);
      } catch (err) {
        setProfile(null);
        setProfilePosts([]);
        setError(err instanceof Error ? err.message : "Could not load profile");
      } finally {
        setDetailLoading(false);
      }
    },
    [liveAccount],
  );

  const openThread = useCallback(
    async (uri: string) => {
      if (!liveAccount) return;
      setDetailView({ kind: "thread", uri });
      setProfile(null);
      setProfilePosts([]);
      setDetailLoading(true);
      try {
        const result = await api.getSocialThread({ uri, accountId: liveAccount.id });
        setThread(result);
        setError(null);
      } catch (err) {
        setThread(null);
        setError(err instanceof Error ? err.message : "Could not load thread");
      } finally {
        setDetailLoading(false);
      }
    },
    [liveAccount],
  );

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed]);

  useEffect(() => {
    void refreshSidebar();
  }, [refreshSidebar]);

  useEffect(() => {
    if (!isLiveNetwork) openHome();
  }, [isLiveNetwork, openHome]);

  const openConnect = useCallback((provider?: SocialNetworkId) => {
    setConnectProvider(provider);
    setConnectOpen(true);
  }, []);

  const snapshotActiveSession = useCallback(() => {
    if (!liveAccount) return;
    sessionsRef.current[liveAccount.id] = {
      navId,
      detailView,
      feedTab,
      composerValue,
      searchQuery,
    };
  }, [composerValue, detailView, feedTab, liveAccount, navId, searchQuery]);

  const selectAccount = useCallback(
    (accountId: string) => {
      if (accountId === liveAccount?.id) return;
      snapshotActiveSession();
      applyAccountSession(sessionsRef.current[accountId] ?? { ...DEFAULT_ACCOUNT_SESSION });
      setActiveAccountId(accountId);
    },
    [applyAccountSession, liveAccount?.id, snapshotActiveSession],
  );

  // After the active account settles, restore that account's detail surface.
  useEffect(() => {
    const pending = pendingRestoreRef.current;
    if (!pending || !liveAccount) return;
    pendingRestoreRef.current = null;
    if (pending.detailView.kind === "profile") {
      void openProfile(pending.detailView.actor);
      return;
    }
    if (pending.detailView.kind === "thread") {
      void openThread(pending.detailView.uri);
      return;
    }
    openHome();
  }, [activeAccountId, liveAccount, openHome, openProfile, openThread]);

  const activateConnectedAccount = useCallback(
    (accountId: string) => {
      snapshotActiveSession();
      const session = { ...DEFAULT_ACCOUNT_SESSION };
      sessionsRef.current[accountId] = session;
      applyAccountSession(session);
      setActiveAccountId(accountId);
    },
    [applyAccountSession, snapshotActiveSession],
  );

  const handleConnect = useCallback(
    async (input: ConnectServiceInput) => {
      if (input.provider === "bluesky") {
        const handle = (input.accountHint ?? "").trim();
        const appPassword = (input.token ?? "").trim();
        if (!handle || !appPassword) {
          setError("Bluesky handle and app password are required");
          return;
        }
        setLoading(true);
        try {
          const account = await api.connectBluesky({ handle, appPassword });
          await refreshStatus();
          activateConnectedAccount(account.id);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not connect Bluesky");
        } finally {
          setLoading(false);
        }
        return;
      }

      if (input.provider === "mastodon") {
        const instanceUrl = (input.instanceUrl ?? "").trim();
        const accessToken = (input.token ?? "").trim();
        if (!instanceUrl || !accessToken) {
          setError("Mastodon instance URL and access token are required");
          return;
        }
        setLoading(true);
        try {
          const account = await api.connectMastodon({ instanceUrl, accessToken });
          await refreshStatus();
          activateConnectedAccount(account.id);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not connect Mastodon");
        } finally {
          setLoading(false);
        }
        return;
      }

      if (input.provider === "nostr") {
        const nsec = (input.token ?? "").trim();
        const relays = (input.instanceUrl ?? "")
          .split(/[\s,]+/)
          .map((part) => part.trim())
          .filter(Boolean);
        if (!nsec) {
          setError("Nostr private key (nsec) is required");
          return;
        }
        setLoading(true);
        try {
          const account = await api.connectNostr({ nsec, relays });
          await refreshStatus();
          activateConnectedAccount(account.id);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not connect Nostr");
        } finally {
          setLoading(false);
        }
        return;
      }

      if (input.provider === "twitter") {
        const accessToken = (input.token ?? "").trim();
        if (!accessToken) {
          setError("X/Twitter access token is required");
          return;
        }
        setLoading(true);
        try {
          const account = await api.connectTwitter({ accessToken });
          await refreshStatus();
          activateConnectedAccount(account.id);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not connect X/Twitter");
        } finally {
          setLoading(false);
        }
        return;
      }

      if (input.provider === "facebook") {
        const accessToken = (input.token ?? "").trim();
        const pageId = (input.accountHint ?? "").trim() || undefined;
        if (!accessToken) {
          setError("Facebook access token is required");
          return;
        }
        setLoading(true);
        try {
          const account = await api.connectFacebook({ accessToken, pageId });
          await refreshStatus();
          activateConnectedAccount(account.id);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not connect Facebook");
        } finally {
          setLoading(false);
        }
        return;
      }

      addConnection(input);
    },
    [activateConnectedAccount, addConnection, refreshStatus],
  );

  const disconnectLiveAccount = useCallback(
    async (accountId?: string) => {
      const targetId = accountId ?? liveAccount?.id;
      if (!targetId) return;
      try {
        await api.disconnectSocialAccount(targetId);
        const remaining = accounts.filter((account) => account.id !== targetId);
        setAccounts(remaining);
        delete sessionsRef.current[targetId];
        if (activeAccountId === targetId) {
          const nextId = remaining[0]?.id ?? null;
          if (nextId) {
            applyAccountSession(sessionsRef.current[nextId] ?? { ...DEFAULT_ACCOUNT_SESSION });
            setActiveAccountId(nextId);
          } else {
            setActiveAccountId(null);
            applyAccountSession({ ...DEFAULT_ACCOUNT_SESSION });
            openHome();
          }
        }
        await refreshStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not disconnect");
      }
    },
    [accounts, activeAccountId, applyAccountSession, liveAccount, openHome, refreshStatus],
  );

  /** @deprecated Prefer disconnectLiveAccount — kept for Bluesky call sites. */
  const disconnectBluesky = disconnectLiveAccount;
  const disconnectAccount = disconnectLiveAccount;

  const handleSubmit = useCallback(async () => {
    if (!composerValue.trim() || !activeConnection) return;
    if (!isLiveNetwork || !liveAccount) return;
    setPosting(true);
    try {
      await api.createSocialPost({ text: composerValue.trim(), accountId: liveAccount.id });
      setComposerValue("");
      await refreshFeed();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setPosting(false);
    }
  }, [activeConnection, composerValue, isLiveNetwork, liveAccount, refreshFeed]);

  const refreshDetail = useCallback(async () => {
    if (detailView.kind === "profile") await openProfile(detailView.actor);
    if (detailView.kind === "thread") await openThread(detailView.uri);
  }, [detailView, openProfile, openThread]);

  const applyLikeLocal = useCallback((uri: string, liked: boolean, likeUri?: string) => {
    const update = (feed: SocialFeedPost): SocialFeedPost => ({
      ...feed,
      viewer: { ...feed.viewer, like: liked ? likeUri : undefined },
      counts: {
        ...feed.counts,
        likes: Math.max(0, feed.counts.likes + (liked ? 1 : -1)),
      },
    });
    setFeedPosts((prev) => patchPosts(prev, uri, update));
    setProfilePosts((prev) => patchPosts(prev, uri, update));
    setThread((prev) => {
      if (!prev) return prev;
      const mapOne = (post: SocialFeedPost) => (post.uri === uri ? update(post) : post);
      return {
        post: mapOne(prev.post),
        ancestors: prev.ancestors.map(mapOne),
        replies: prev.replies.map(mapOne),
      };
    });
  }, []);

  const toggleLike = useCallback(
    async (post: SocialFeedPost) => {
      if (!liveAccount) return;
      const liked = Boolean(post.viewer.like);
      applyLikeLocal(post.uri, !liked, liked ? undefined : "pending");
      try {
        const result = await api.likeSocialPost({
          uri: post.uri,
          cid: post.cid,
          unlike: liked,
          likeUri: post.viewer.like,
          accountId: liveAccount.id,
        });
        if (!liked && result.likeUri) applyLikeLocal(post.uri, true, result.likeUri);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not like post");
        void refreshFeed();
        void refreshDetail();
      }
    },
    [applyLikeLocal, liveAccount, refreshDetail, refreshFeed],
  );

  const toggleRepost = useCallback(
    async (post: SocialFeedPost) => {
      if (!liveAccount) return;
      const reposted = Boolean(post.viewer.repost);
      const update = (feed: SocialFeedPost): SocialFeedPost => ({
        ...feed,
        viewer: { ...feed.viewer, repost: reposted ? undefined : "pending" },
        counts: {
          ...feed.counts,
          reposts: Math.max(0, feed.counts.reposts + (reposted ? -1 : 1)),
        },
      });
      setFeedPosts((prev) => patchPosts(prev, post.uri, update));
      setProfilePosts((prev) => patchPosts(prev, post.uri, update));
      try {
        const result = await api.repostSocialPost({
          uri: post.uri,
          cid: post.cid,
          unrepost: reposted,
          repostUri: post.viewer.repost,
          accountId: liveAccount.id,
        });
        if (!reposted && result.repostUri) {
          const finalize = (feed: SocialFeedPost): SocialFeedPost => ({
            ...feed,
            viewer: { ...feed.viewer, repost: result.repostUri },
          });
          setFeedPosts((prev) => patchPosts(prev, post.uri, finalize));
          setProfilePosts((prev) => patchPosts(prev, post.uri, finalize));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not repost");
        void refreshFeed();
        void refreshDetail();
      }
    },
    [liveAccount, refreshDetail, refreshFeed],
  );

  const toggleFollow = useCallback(
    async (did: string, followingUri?: string) => {
      if (!liveAccount) return;
      if (did === liveAccount.did) return;
      const following = Boolean(followingUri);
      try {
        const result = await api.followSocialActor({
          did,
          unfollow: following,
          followUri: followingUri,
          accountId: liveAccount.id,
        });
        setProfile((prev) =>
          prev && prev.did === did
            ? {
                ...prev,
                viewer: {
                  ...prev.viewer,
                  following: following ? undefined : result.followUri,
                },
                followersCount: Math.max(0, prev.followersCount + (following ? -1 : 1)),
              }
            : prev,
        );
        const updateAuthor = (feed: SocialFeedPost): SocialFeedPost =>
          feed.author.did === did
            ? {
                ...feed,
                viewer: {
                  ...feed.viewer,
                  following: following ? undefined : result.followUri ?? "pending",
                },
              }
            : feed;
        setFeedPosts((prev) =>
          prev.map((entry) => ({ ...toUiPost(updateAuthor(entry.feed)), feed: updateAuthor(entry.feed) })),
        );
        setProfilePosts((prev) =>
          prev.map((entry) => ({ ...toUiPost(updateAuthor(entry.feed)), feed: updateAuthor(entry.feed) })),
        );
        const nextFollowing = following ? undefined : result.followUri ?? "pending";
        const patchActor = (actor: SocialSuggestedActor): SocialSuggestedActor =>
          actor.did === did
            ? {
                ...actor,
                viewer: {
                  ...actor.viewer,
                  following: nextFollowing,
                },
              }
            : actor;
        setSuggestions((prev) => prev.map(patchActor));
        setSearchResults((prev) => prev.map(patchActor));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not follow");
        void refreshDetail();
      }
    },
    [liveAccount, refreshDetail],
  );

  const toggleFollowFromPost = useCallback(
    async (post: SocialFeedPost) => {
      await toggleFollow(post.author.did, post.viewer.following);
    },
    [toggleFollow],
  );

  const submitReply = useCallback(async () => {
    if (!liveAccount || !replyingToUri || !replyValue.trim()) return;
    const fromFeed = feedPosts.find((entry) => entry.feed.uri === replyingToUri)?.feed;
    const fromProfile = profilePosts.find((entry) => entry.feed.uri === replyingToUri)?.feed;
    const fromThread =
      thread?.post.uri === replyingToUri
        ? thread.post
        : thread?.replies.find((reply) => reply.uri === replyingToUri) ??
          thread?.ancestors.find((ancestor) => ancestor.uri === replyingToUri);
    const target = fromFeed ?? fromProfile ?? fromThread;
    if (!target) return;
    setPosting(true);
    try {
      await api.replySocialPost({
        text: replyValue.trim(),
        parentUri: target.replyTarget.parentUri,
        parentCid: target.replyTarget.parentCid,
        rootUri: target.replyTarget.rootUri,
        rootCid: target.replyTarget.rootCid,
        accountId: liveAccount.id,
      });
      setReplyValue("");
      setReplyingToUri(null);
      await refreshFeed();
      await refreshDetail();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reply");
    } finally {
      setPosting(false);
    }
  }, [
    feedPosts,
    liveAccount,
    profilePosts,
    refreshDetail,
    refreshFeed,
    replyValue,
    replyingToUri,
    thread,
  ]);

  const posts = useMemo(() => {
    if (isLiveNetwork) return feedPosts;
    return [];
  }, [feedPosts, isLiveNetwork]);

  return {
    networks: SOCIAL_NETWORKS,
    accounts,
    activeAccountId: liveAccount?.id ?? null,
    selectAccount,
    activeNetworkId,
    activeConnection,
    connectedNetworkIds,
    posts,
    trends,
    suggestions,
    sidebarLinks,
    sidebarLinksModule,
    sidebarLoading,
    searchQuery,
    searchResults,
    searchLoading,
    runSearch,
    clearSearch,
    composerValue,
    setComposerValue,
    handleSubmit,
    feedTab,
    setFeedTab,
    navId,
    setNavId,
    connectOpen,
    setConnectOpen,
    connectProvider,
    openConnect,
    handleConnect,
    disconnectAccount,
    disconnectLiveAccount,
    disconnectBluesky,
    connectionsAll,
    loading,
    detailLoading,
    posting,
    error,
    liveAccount,
    blueskyAccount: liveAccount?.provider === "bluesky" ? liveAccount : undefined,
    isLiveNetwork,
    toggleLike,
    toggleRepost,
    toggleFollowFromPost,
    toggleFollow,
    replyingToUri,
    setReplyingToUri,
    replyValue,
    setReplyValue,
    submitReply,
    refreshFeed,
    detailView,
    openHome,
    openProfile,
    openThread,
    profile,
    profilePosts,
    thread,
  };
}

export type SocialViewModel = ReturnType<typeof useSocial>;
