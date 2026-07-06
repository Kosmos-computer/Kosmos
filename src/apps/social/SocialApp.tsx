import { Heart, MessageCircle, Plus, Repeat2, Send } from "lucide-react";
import { useAuthStore } from "../../os/auth/authStore";
import { ConnectServiceModal } from "../../components/patterns/ConnectServiceModal";
import { Avatar, Button, Chip, EmptyState, Input } from "../../components/ui";
import { formatCount } from "./socialMock";
import { useSocialStub } from "./useSocialStub";
import type { SocialPost } from "./types";

function PostCard({ post }: { post: SocialPost }) {
  return (
    <article className="arco-social__post">
      <Avatar name={post.authorName} size="md" />
      <div className="arco-social__post-body">
        <header className="arco-social__post-header">
          <strong>{post.authorName}</strong>
          {post.verified ? <span className="arco-social__verified" aria-label="Verified">✓</span> : null}
          <span className="arco-social__handle">{post.authorHandle}</span>
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
  const vm = useSocialStub();
  const user = useAuthStore((s) => s.user);
  const userName = user?.displayName ?? user?.username ?? "You";

  return (
    <div className="arco-social">
      <aside className="arco-social__rail" aria-label="Social networks">
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
          aria-label="Connect another network"
          onClick={() => vm.openConnect()}
        >
          <Plus size={16} />
        </button>
      </aside>

      <section className="arco-social__feed-column">
        <header className="arco-social__feed-header">
          <h1>{vm.networks.find((n) => n.id === vm.activeNetworkId)?.label ?? "Social"}</h1>
          <div className="arco-social__tabs">
            <Chip className={vm.feedTab === "for-you" ? "arco-social__tab--active" : ""} onClick={() => vm.setFeedTab("for-you")}>
              For you
            </Chip>
            <Chip className={vm.feedTab === "following" ? "arco-social__tab--active" : ""} onClick={() => vm.setFeedTab("following")}>
              Following
            </Chip>
          </div>
        </header>

        {!vm.activeConnection ? (
          <div className="arco-social__connect-banner">
            <EmptyState title={`Connect ${vm.networks.find((n) => n.id === vm.activeNetworkId)?.label}`}>
              <p>Link an account to load your timeline and post from Kosmos.</p>
              <Button variant="primary" onClick={() => vm.openConnect(vm.activeNetworkId)}>
                Connect account
              </Button>
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="arco-social__composer">
              <Avatar name={userName} size="sm" />
              <Input
                value={vm.composerValue}
                onChange={(event) => vm.setComposerValue(event.target.value)}
                placeholder="What's happening?"
                aria-label="Compose post"
              />
              <Button variant="primary" size="icon" aria-label="Post" onClick={vm.handleSubmit} disabled={!vm.composerValue.trim()}>
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
          <h2>Trends for you</h2>
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
          <h2>Who to follow</h2>
          <ul className="arco-social__suggestions">
            {vm.suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <Avatar name={suggestion.name} size="sm" />
                <div>
                  <strong>{suggestion.name}</strong>
                  <span>{suggestion.handle}</span>
                </div>
                <Button variant="ghost">Follow</Button>
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
