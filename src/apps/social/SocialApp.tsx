import { useEffect, useRef, type MouseEvent, type KeyboardEvent } from "react";
import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { ArrowLeft, Heart, MessageCircle, Plus, Repeat2, Send, UserPlus, UserMinus } from "lucide-react";
import { useAuthStore } from "../../os/auth/authStore";
import { ConnectServiceModal } from "../../components/patterns/ConnectServiceModal";
import { Avatar, Button, EmptyState, Input } from "../../components/ui";
import { SocialNetworkIcon } from "./SocialNetworkIcon";
import { SocialNav, type SocialNavId } from "./SocialNav";
import { SocialSidebar } from "./SocialSidebar";
import { PostMedia } from "./PostMedia";
import { formatCount } from "./socialMock";
import { useSocial, toUiPost } from "./useSocial";
import type { SocialFeedPost } from "@shared/social";
import { useTranslation } from "react-i18next";

function PostCard({
  feed,
  isSelf,
  replyOpen,
  replyValue,
  posting,
  highlighted,
  onOpenPost,
  onOpenAuthor,
  onToggleReply,
  onReplyChange,
  onSubmitReply,
  onLike,
  onRepost,
  onFollow,
}: {
  feed: SocialFeedPost;
  isSelf: boolean;
  replyOpen: boolean;
  replyValue: string;
  posting: boolean;
  highlighted?: boolean;
  onOpenPost?: () => void;
  onOpenAuthor?: () => void;
  onToggleReply: () => void;
  onReplyChange: (value: string) => void;
  onSubmitReply: () => void;
  onLike: () => void;
  onRepost: () => void;
  onFollow: () => void;
}) {
  const { t } = useTranslation();
  const post = toUiPost(feed);
  const liked = Boolean(feed.viewer.like);
  const reposted = Boolean(feed.viewer.repost);
  const following = Boolean(feed.viewer.following);

  function stop(event: MouseEvent) {
    event.stopPropagation();
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onOpenPost) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenPost();
    }
  }

  return (
    <article
      className={`arco-social__post${highlighted ? " arco-social__post--highlight" : ""}${onOpenPost ? " arco-social__post--clickable" : ""}`}
      role={onOpenPost ? "link" : undefined}
      tabIndex={onOpenPost ? 0 : undefined}
      aria-label={onOpenPost ? i18n.t(I18nKey.APPS$SOCIAL_OPEN_POST) : undefined}
      onClick={onOpenPost}
      onKeyDown={onCardKeyDown}
    >
      <button
        type="button"
        className="arco-social__avatar-btn"
        aria-label={i18n.t(I18nKey.APPS$SOCIAL_VIEW_PROFILE)}
        onClick={(event) => {
          stop(event);
          onOpenAuthor?.();
        }}
      >
        <Avatar name={post.authorName} src={feed.author.avatar} size="md" />
      </button>
      <div className="arco-social__post-body">
        <header className="arco-social__post-header">
          <button
            type="button"
            className="arco-social__author-btn"
            onClick={(event) => {
              stop(event);
              onOpenAuthor?.();
            }}
          >
            <strong>{post.authorName}</strong>
            <span className="arco-social__handle">{post.authorHandle}</span>
          </button>
          {/* eslint-disable-next-line i18next/no-literal-string -- separator */}
          <span className="arco-social__dot">·</span>
          <time>{post.timestamp}</time>
          {!isSelf ? (
            <Button
              variant="ghost"
              className="arco-social__follow-btn"
              onClick={(event) => {
                stop(event);
                onFollow();
              }}
              aria-label={following ? i18n.t(I18nKey.APPS$SOCIAL_UNFOLLOW) : i18n.t(I18nKey.APPS$SOCIAL_FOLLOW)}
            >
              {following ? <UserMinus size={14} /> : <UserPlus size={14} />}
              {following ? <T k={I18nKey.APPS$SOCIAL_UNFOLLOW} /> : <T k={I18nKey.APPS$SOCIAL_FOLLOW} />}
            </Button>
          ) : null}
        </header>
        <p>{post.content}</p>
        <PostMedia post={feed} />
        <footer className="arco-social__post-stats">
          <button
            type="button"
            className={`arco-social__stat-btn${replyOpen ? " arco-social__stat-btn--active" : ""}`}
            onClick={(event) => {
              stop(event);
              onToggleReply();
            }}
            aria-label={i18n.t(I18nKey.APPS$SOCIAL_REPLY)}
          >
            <MessageCircle size={14} /> {formatCount(post.stats.replies)}
          </button>
          <button
            type="button"
            className={`arco-social__stat-btn${reposted ? " arco-social__stat-btn--active" : ""}`}
            onClick={(event) => {
              stop(event);
              onRepost();
            }}
            aria-label={i18n.t(I18nKey.APPS$SOCIAL_REPOST)}
          >
            <Repeat2 size={14} /> {formatCount(post.stats.reposts)}
          </button>
          <button
            type="button"
            className={`arco-social__stat-btn${liked ? " arco-social__stat-btn--liked" : ""}`}
            onClick={(event) => {
              stop(event);
              onLike();
            }}
            aria-label={liked ? i18n.t(I18nKey.APPS$SOCIAL_UNLIKE) : i18n.t(I18nKey.APPS$SOCIAL_LIKE)}
          >
            <Heart size={14} /> {formatCount(post.stats.likes)}
          </button>
        </footer>
        {replyOpen ? (
          <div className="arco-social__reply" onClick={stop}>
            <Input
              value={replyValue}
              onChange={(event) => onReplyChange(event.target.value)}
              placeholder={t(I18nKey.APPS$SOCIAL_REPLY_PLACEHOLDER)}
              aria-label={i18n.t(I18nKey.APPS$SOCIAL_REPLY)}
            />
            <Button
              variant="primary"
              disabled={!replyValue.trim() || posting}
              onClick={onSubmitReply}
            >
              <T k={I18nKey.APPS$SOCIAL_REPLY} />
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function sectionTitle(id: SocialNavId): string {
  switch (id) {
    case "explore":
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_EXPLORE);
    case "notifications":
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_NOTIFICATIONS);
    case "chat":
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_CHAT);
    case "feeds":
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_FEEDS);
    case "lists":
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_LISTS);
    case "saved":
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_SAVED);
    case "profile":
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_PROFILE);
    case "settings":
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_SETTINGS);
    case "new-post":
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_NEW_POST);
    case "home":
    default:
      return i18n.t(I18nKey.APPS$SOCIAL_NAV_HOME);
  }
}

export function SocialApp() {
  const { t } = useTranslation();
  const vm = useSocial();
  const user = useAuthStore((s) => s.user);
  const userName = user?.displayName ?? user?.username ?? "You";
  const isLiveNetwork = vm.isLiveNetwork;
  const navId = vm.navId;
  const composerRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLiveNetwork) vm.setNavId("home");
  }, [isLiveNetwork, vm.setNavId]);

  function handleNavSelect(id: SocialNavId) {
    if (id === "new-post") {
      vm.setNavId("home");
      vm.openHome();
      requestAnimationFrame(() => {
        composerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        composerInputRef.current?.focus();
      });
      return;
    }
    if (id === "home") {
      vm.setNavId("home");
      vm.openHome();
      return;
    }
    if (id === "profile" && vm.liveAccount) {
      vm.setNavId("profile");
      void vm.openProfile(vm.liveAccount.handle);
      return;
    }
    vm.setNavId(id);
    if (id !== "settings") vm.openHome();
  }

  const detailKind = vm.detailView.kind;
  const showDetail = isLiveNetwork && (detailKind === "profile" || detailKind === "thread");
  const showHome = !isLiveNetwork || (navId === "home" && detailKind === "home");
  const showSettings = isLiveNetwork && navId === "settings" && detailKind === "home";
  const showPlaceholder = isLiveNetwork && !showHome && !showSettings && !showDetail;

  function renderPostList(
    posts: Array<{ id: string; feed: SocialFeedPost }>,
    opts: { openOnClick?: boolean; highlightUri?: string } = {},
  ) {
    return posts.map((post) => (
      <PostCard
        key={post.id}
        feed={post.feed}
        isSelf={post.feed.author.did === vm.liveAccount?.did}
        highlighted={opts.highlightUri === post.feed.uri}
        replyOpen={vm.replyingToUri === post.feed.uri}
        replyValue={vm.replyValue}
        posting={vm.posting}
        onOpenPost={opts.openOnClick === false ? undefined : () => void vm.openThread(post.feed.uri)}
        onOpenAuthor={() => void vm.openProfile(post.feed.author.handle)}
        onToggleReply={() =>
          vm.setReplyingToUri(vm.replyingToUri === post.feed.uri ? null : post.feed.uri)
        }
        onReplyChange={vm.setReplyValue}
        onSubmitReply={() => void vm.submitReply()}
        onLike={() => void vm.toggleLike(post.feed)}
        onRepost={() => void vm.toggleRepost(post.feed)}
        onFollow={() => void vm.toggleFollowFromPost(post.feed)}
      />
    ));
  }

  const headerTitle = showDetail
    ? detailKind === "profile"
      ? (vm.profile?.displayName ?? i18n.t(I18nKey.APPS$SOCIAL_NAV_PROFILE))
      : i18n.t(I18nKey.APPS$SOCIAL_THREAD)
    : isLiveNetwork && !showHome
      ? sectionTitle(navId)
      : (vm.networks.find((n) => n.id === vm.activeNetworkId)?.label ?? "Social");

  return (
    <div className="arco-social">
      <aside className="arco-social__rail" aria-label={i18n.t(I18nKey.APPS$SOCIAL_SOCIAL_NETWORKS)}>
        {vm.accounts.map((account) => {
          const network = vm.networks.find((item) => item.id === account.provider);
          const label =
            account.displayName ??
            (account.provider === "nostr" || account.provider === "bitsocial"
              ? account.handle
              : `@${account.handle}`);
          const active = vm.activeAccountId === account.id;
          return (
            <button
              key={account.id}
              type="button"
              className={`arco-social__rail-tile arco-social__rail-tile--account${active ? " arco-social__rail-tile--active" : ""}`}
              style={{ ["--social-accent" as string]: network?.accent }}
              title={`${label} · ${network?.label ?? account.provider}`}
              aria-label={`${label} (${network?.label ?? account.provider})`}
              aria-pressed={active}
              onClick={() => vm.selectAccount(account.id)}
            >
              <Avatar
                name={label}
                src={account.avatar}
                size="md"
                className="arco-social__rail-avatar"
              />
              <span className="arco-social__rail-badge" aria-hidden="true">
                <SocialNetworkIcon
                  network={account.provider}
                  size={10}
                  className="arco-social__rail-badge-icon"
                />
              </span>
            </button>
          );
        })}
        <button
          type="button"
          className="arco-social__rail-tile arco-social__rail-tile--add"
          aria-label={i18n.t(I18nKey.APPS$SOCIAL_CONNECT_ANOTHER_NETWORK)}
          onClick={() => vm.openConnect()}
        >
          <Plus size={16} />
        </button>
      </aside>

      <div className="arco-social__main">
        <div className="arco-social__left">
          {isLiveNetwork ? (
            <SocialNav
              activeId={navId}
              onSelect={handleNavSelect}
              displayName={vm.liveAccount?.displayName}
              handle={vm.liveAccount?.handle}
              avatar={vm.liveAccount?.avatar}
              network={vm.activeNetworkId}
              accent={vm.networks.find((n) => n.id === vm.activeNetworkId)?.accent}
              onDisconnect={
                vm.liveAccount
                  ? () => void vm.disconnectAccount(vm.liveAccount!.id)
                  : undefined
              }
            />
          ) : null}
        </div>

        <section className="arco-social__feed-column">
        <header className="arco-social__feed-header">
          {!showHome ? (
            <div className="arco-social__feed-title-row">
              {showDetail ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={i18n.t(I18nKey.APPS$SOCIAL_BACK)}
                  onClick={() => {
                    vm.setNavId("home");
                    vm.openHome();
                  }}
                >
                  <ArrowLeft size={18} />
                </Button>
              ) : null}
              <h1>{headerTitle}</h1>
            </div>
          ) : (
            <div className="arco-social__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={`arco-social__tab${vm.feedTab === "for-you" ? " arco-social__tab--active" : ""}`}
                aria-selected={vm.feedTab === "for-you"}
                onClick={() => vm.setFeedTab("for-you")}
              >
                <T k={I18nKey.APPS$SOCIAL_FOR_YOU} />
              </button>
              <button
                type="button"
                role="tab"
                className={`arco-social__tab${vm.feedTab === "following" ? " arco-social__tab--active" : ""}`}
                aria-selected={vm.feedTab === "following"}
                onClick={() => vm.setFeedTab("following")}
              >
                <T k={I18nKey.APPS$SOCIAL_FOLLOWING} />
              </button>
            </div>
          )}
        </header>

        {vm.error ? <p className="arco-social__error" role="alert">{vm.error}</p> : null}

        {!vm.liveAccount ? (
          <div className="arco-social__connect-banner">
            <EmptyState title={i18n.t(I18nKey.APPS$SOCIAL_CONNECT_ACCOUNT)}>
              <p><T k={I18nKey.APPS$SOCIAL_LINK_AN_ACCOUNT_TO_LOAD_YOUR_TIMELINE_AND_POST_FROM_KOSM} /></p>
              <Button variant="primary" onClick={() => vm.openConnect()}><T k={I18nKey.APPS$SOCIAL_CONNECT_ACCOUNT} /></Button>
            </EmptyState>
          </div>
        ) : showSettings ? (
          <div className="arco-social__section-pane">
            <EmptyState
              title={`${vm.networks.find((n) => n.id === vm.activeNetworkId)?.label ?? "Social"} settings`}
            >
              <ul className="arco-social__account-list">
                {vm.accounts
                  .filter((account) => account.provider === vm.activeNetworkId)
                  .map((account) => {
                    const network = vm.networks.find((item) => item.id === account.provider);
                    const handleLabel =
                      account.provider === "nostr" || account.provider === "bitsocial"
                        ? account.handle
                        : `@${account.handle}`;
                    const detailParts = [
                      network?.label ?? account.provider,
                      account.instanceUrl,
                      account.defaultSubreddit
                        ? `r/${account.defaultSubreddit}`
                        : undefined,
                      account.pageId ? `Page ${account.pageId}` : undefined,
                      account.rpcUrl,
                      account.relays?.length
                        ? `${account.relays.length} relay${account.relays.length === 1 ? "" : "s"}`
                        : undefined,
                    ].filter(Boolean);
                    return (
                      <li key={account.id} className="arco-social__account-list-item">
                        <div className="arco-social__account-list-meta">
                          <Avatar
                            name={account.displayName ?? account.handle}
                            src={account.avatar}
                            size="sm"
                          />
                          <div className="arco-social__account-list-copy">
                            <strong title={account.displayName ?? handleLabel}>
                              {account.displayName ?? handleLabel}
                            </strong>
                            <span title={[handleLabel, ...detailParts].join(" · ")}>
                              {detailParts.join(" · ")}
                              {/* eslint-disable-next-line i18next/no-literal-string -- separator */}
                              {" · "}
                              {handleLabel}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          className="arco-social__account-list-action"
                          onClick={() => void vm.disconnectAccount(account.id)}
                        >
                          <T k={I18nKey.APPS$SOCIAL_DISCONNECT} />
                        </Button>
                      </li>
                    );
                  })}
              </ul>
              <Button variant="primary" onClick={() => vm.openConnect(vm.activeNetworkId)}>
                <T k={I18nKey.APPS$SOCIAL_CONNECT_ACCOUNT} />
              </Button>
            </EmptyState>
          </div>
        ) : showPlaceholder ? (
          <div className="arco-social__section-pane">
            <EmptyState title={sectionTitle(navId)}>
              <p><T k={I18nKey.APPS$SOCIAL_SECTION_COMING_SOON} /></p>
            </EmptyState>
          </div>
        ) : showDetail && detailKind === "profile" ? (
          <div className="arco-social__feed">
            {vm.detailLoading ? (
              <p className="arco-social__feed-status"><T k={I18nKey.APPS$SOCIAL_LOADING_PROFILE} /></p>
            ) : null}
            {vm.profile ? (
              <div className="arco-social__profile">
                {vm.profile.banner ? (
                  <div className="arco-social__profile-banner">
                    <img src={vm.profile.banner} alt="" />
                  </div>
                ) : (
                  <div className="arco-social__profile-banner arco-social__profile-banner--empty" />
                )}
                <div className="arco-social__profile-body">
                  <Avatar name={vm.profile.displayName} src={vm.profile.avatar} size="lg" />
                  <div className="arco-social__profile-meta">
                    <div className="arco-social__profile-title-row">
                      <h2>{vm.profile.displayName}</h2>
                      {vm.liveAccount && vm.profile.did !== vm.liveAccount.did ? (
                        <Button
                          variant="primary"
                          className="arco-social__profile-follow"
                          onClick={() => void vm.toggleFollow(vm.profile!.did, vm.profile!.viewer?.following)}
                        >
                          {vm.profile.viewer?.following ? (
                            <>
                              <UserMinus size={14} />
                              <T k={I18nKey.APPS$SOCIAL_UNFOLLOW} />
                            </>
                          ) : (
                            <>
                              <Plus size={14} />
                              <T k={I18nKey.APPS$SOCIAL_FOLLOW} />
                            </>
                          )}
                        </Button>
                      ) : null}
                    </div>
                    <span>@{vm.profile.handle}</span>
                    {vm.profile.description ? <p>{vm.profile.description}</p> : null}
                    <div className="arco-social__profile-stats">
                      <span><strong>{formatCount(vm.profile.postsCount)}</strong> <T k={I18nKey.APPS$SOCIAL_POSTS_COUNT} /></span>
                      <span><strong>{formatCount(vm.profile.followersCount)}</strong> <T k={I18nKey.APPS$SOCIAL_FOLLOWERS} /></span>
                      <span><strong>{formatCount(vm.profile.followsCount)}</strong> <T k={I18nKey.APPS$SOCIAL_FOLLOWING_COUNT} /></span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {renderPostList(vm.profilePosts)}
          </div>
        ) : showDetail && detailKind === "thread" ? (
          <div className="arco-social__feed">
            {vm.detailLoading ? (
              <p className="arco-social__feed-status"><T k={I18nKey.APPS$SOCIAL_LOADING_THREAD} /></p>
            ) : null}
            {vm.thread ? (
              <>
                {renderPostList(
                  vm.thread.ancestors.map((post) => ({ id: post.uri, feed: post })),
                )}
                {renderPostList([{ id: vm.thread.post.uri, feed: vm.thread.post }], {
                  openOnClick: false,
                  highlightUri: vm.thread.post.uri,
                })}
                {vm.thread.replies.length > 0 ? (
                  <h2 className="arco-social__thread-heading"><T k={I18nKey.APPS$SOCIAL_REPLIES} /></h2>
                ) : null}
                {renderPostList(
                  vm.thread.replies.map((post) => ({ id: post.uri, feed: post })),
                )}
              </>
            ) : null}
          </div>
        ) : (
          <>
            <div className="arco-social__composer" ref={composerRef}>
              <Avatar
                name={vm.liveAccount?.displayName ?? userName}
                src={vm.liveAccount?.avatar}
                size="sm"
              />
              <Input
                ref={composerInputRef}
                value={vm.composerValue}
                onChange={(event) => vm.setComposerValue(event.target.value)}
                placeholder={i18n.t(I18nKey.APPS$SOCIAL_WHAT_S_HAPPENING)}
                aria-label={i18n.t(I18nKey.APPS$SOCIAL_COMPOSE_POST)}
                disabled={!isLiveNetwork || vm.posting}
              />
              <Button
                variant="primary"
                size="icon"
                aria-label={i18n.t(I18nKey.APPS$SOCIAL_POST)}
                onClick={() => void vm.handleSubmit()}
                disabled={!isLiveNetwork || !vm.composerValue.trim() || vm.posting}
              >
                <Send size={16} />
              </Button>
            </div>
            <div className="arco-social__feed">
              {vm.loading ? (
                <p className="arco-social__feed-status"><T k={I18nKey.APPS$SOCIAL_LOADING_FEED} /></p>
              ) : null}
              {!vm.loading && isLiveNetwork && vm.posts.length === 0 ? (
                <p className="arco-social__feed-status"><T k={I18nKey.APPS$SOCIAL_EMPTY_FEED} /></p>
              ) : null}
              {!isLiveNetwork ? (
                <p className="arco-social__feed-status">
                  {t(I18nKey.APPS$SOCIAL_LINK_AN_ACCOUNT_TO_LOAD_YOUR_TIMELINE_AND_POST_FROM_KOSM)}
                </p>
              ) : null}
              {isLiveNetwork ? renderPostList(vm.posts) : null}
            </div>
          </>
        )}
      </section>

        <div className="arco-social__right">
          <SocialSidebar
            network={vm.activeNetworkId}
            enabled={isLiveNetwork}
            canFollow={isLiveNetwork && vm.activeNetworkId !== "facebook"}
            trends={vm.trends}
            suggestions={vm.suggestions}
            links={vm.sidebarLinks}
            linksModule={vm.sidebarLinksModule}
            loading={vm.sidebarLoading}
            searchQuery={vm.searchQuery}
            searchResults={vm.searchResults}
            searchLoading={vm.searchLoading}
            onSearch={vm.runSearch}
            onClearSearch={vm.clearSearch}
            onOpenActor={(actor) => {
              vm.setNavId("profile");
              void vm.openProfile(actor);
            }}
            onToggleFollow={(did, followingUri) => void vm.toggleFollow(did, followingUri)}
          />
        </div>
      </div>

      <ConnectServiceModal
        open={vm.connectOpen}
        onClose={() => vm.setConnectOpen(false)}
        domain="social"
        initialProvider={vm.connectProvider}
        allowedProviders={vm.connectProvider ? [vm.connectProvider] : undefined}
        existingConnections={vm.connectionsAll}
        onConnect={(input) => {
          void vm.handleConnect(input);
          vm.setConnectOpen(false);
        }}
      />
    </div>
  );
}
