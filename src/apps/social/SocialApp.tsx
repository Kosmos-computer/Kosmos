import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Heart, MessageCircle, Plus, Repeat2, Send } from "lucide-react";
import { useAuthStore } from "../../os/auth/authStore";
import { ConnectServiceModal } from "../../components/patterns/ConnectServiceModal";
import { Avatar, Button, Chip, EmptyState, Input } from "../../components/ui";
import { formatCount } from "./socialMock";
import { useSocialStub } from "./useSocialStub";
import type { SocialPost } from "./types";
import { useTranslation } from "react-i18next";

function PostCard({ post }: { post: SocialPost }) {
  const { t } = useTranslation();
  return (
    <article className="arco-social__post">
      <Avatar name={post.authorName} size="md" />
      <div className="arco-social__post-body">
        <header className="arco-social__post-header">
          <strong>{post.authorName}</strong>
          {post.verified ? (
            <span className="arco-social__verified" aria-label={i18n.t(I18nKey.APPS$SOCIAL_VERIFIED)}>
              {"\u2713"}
            </span>
          ) : null}
          <span className="arco-social__handle">{post.authorHandle}</span>
          {/* eslint-disable-next-line i18next/no-literal-string -- separator */}
          <span className="arco-social__dot">·</span>
          <time>{post.timestamp}</time>
        </header>
        <p>{post.content}</p>
        <footer className="arco-social__post-stats">
          <span><MessageCircle size={14} /> {formatCount(post.stats.replies)}</span>
          <span><Repeat2 size={14} /> {formatCount(post.stats.reposts)}</span>
          <span><Heart size={14} /> {formatCount(post.stats.likes)}</span>
        </footer>
      </div>
    </article>
  );
}

export function SocialApp() {
  const { t } = useTranslation();
  const vm = useSocialStub();
  const user = useAuthStore((s) => s.user);
  const userName = user?.displayName ?? user?.username ?? "You";

  return (
    <div className="arco-social">
      <aside className="arco-social__rail" aria-label={i18n.t(I18nKey.APPS$SOCIAL_SOCIAL_NETWORKS)}>
        {vm.networks.map((network) => {
          const connected = vm.connectedNetworkIds.has(network.id);
          return (
            <button
              key={network.id}
              type="button"
              className={`arco-social__rail-tile${vm.activeNetworkId === network.id ? " arco-social__rail-tile--active" : ""}${connected ? "" : " arco-social__rail-tile--disconnected"}`}
              style={{ ["--social-accent" as string]: network.accent }}
              title={connected ? network.label : `${network.label} — not connected`}
              onClick={() => vm.setActiveNetworkId(network.id)}
            >
              <span>{network.initials}</span>
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

      <section className="arco-social__feed-column">
        <header className="arco-social__feed-header">
          <h1>{vm.networks.find((n) => n.id === vm.activeNetworkId)?.label ?? "Social"}</h1>
          <div className="arco-social__tabs">
            <Chip className={vm.feedTab === "for-you" ? "arco-social__tab--active" : ""} onClick={() => vm.setFeedTab("for-you")}><T k={I18nKey.APPS$SOCIAL_FOR_YOU} /></Chip>
            <Chip className={vm.feedTab === "following" ? "arco-social__tab--active" : ""} onClick={() => vm.setFeedTab("following")}><T k={I18nKey.APPS$SOCIAL_FOLLOWING} /></Chip>
          </div>
        </header>

        {!vm.activeConnection ? (
          <div className="arco-social__connect-banner">
            <EmptyState title={`Connect ${vm.networks.find((n) => n.id === vm.activeNetworkId)?.label}`}>
              <p><T k={I18nKey.APPS$SOCIAL_LINK_AN_ACCOUNT_TO_LOAD_YOUR_TIMELINE_AND_POST_FROM_KOSM} /></p>
              <Button variant="primary" onClick={() => vm.openConnect(vm.activeNetworkId)}><T k={I18nKey.APPS$SOCIAL_CONNECT_ACCOUNT} /></Button>
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="arco-social__composer">
              <Avatar name={userName} size="sm" />
              <Input
                value={vm.composerValue}
                onChange={(event) => vm.setComposerValue(event.target.value)}
                placeholder={i18n.t(I18nKey.APPS$SOCIAL_WHAT_S_HAPPENING)}
                aria-label={i18n.t(I18nKey.APPS$SOCIAL_COMPOSE_POST)}
              />
              <Button variant="primary" size="icon" aria-label={i18n.t(I18nKey.APPS$SOCIAL_POST)} onClick={vm.handleSubmit} disabled={!vm.composerValue.trim()}>
                <Send size={16} />
              </Button>
            </div>
            <div className="arco-social__feed">
              {vm.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="arco-social__sidebar">
        <section className="arco-social__panel">
          <h2><T k={I18nKey.APPS$SOCIAL_TRENDS_FOR_YOU} /></h2>
          <ul>
            {vm.trends.map((trend) => (
              <li key={trend.id}>
                <span>{trend.category}</span>
                <strong>{trend.title}</strong>
                <small>{trend.postCount}</small>
              </li>
            ))}
          </ul>
        </section>
        <section className="arco-social__panel">
          <h2><T k={I18nKey.APPS$SOCIAL_WHO_TO_FOLLOW} /></h2>
          <ul className="arco-social__suggestions">
            {vm.suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <Avatar name={suggestion.name} size="sm" />
                <div>
                  <strong>{suggestion.name}</strong>
                  <span>{suggestion.handle}</span>
                </div>
                <Button variant="ghost"><T k={I18nKey.APPS$SOCIAL_FOLLOW} /></Button>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <ConnectServiceModal
        open={vm.connectOpen}
        onClose={() => vm.setConnectOpen(false)}
        domain="social"
        initialProvider={vm.connectProvider}
        existingConnections={vm.connectionsAll}
        onConnect={(input) => vm.addConnection(input)}
      />
    </div>
  );
}
