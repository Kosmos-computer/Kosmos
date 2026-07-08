import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Hash, Home, Bell, Folder, Bookmark, MessageSquare, Plus, Send, Users } from "lucide-react";
import { useAuthStore } from "../../os/auth/authStore";
import { ConnectServiceModal } from "../../components/patterns/ConnectServiceModal";
import { SidebarPane } from "../../components/patterns";
import { Avatar, Button, EmptyState, Input } from "../../components/ui";
import { useGroupsStub } from "./useGroupsStub";
import type { TeamChannel, TeamDirectMessage, TeamMessage } from "./types";
import { useTranslation } from "react-i18next";

const NAV_ICONS = {
  home: Home,
  chat: MessageSquare,
  bell: Bell,
  folder: Folder,
  bookmark: Bookmark,
} as const;

function MessageRow({ message }: { message: TeamMessage }) {
  const isMe = message.senderId === "me";
  return (
    <article className={`arco-groups__message${isMe ? " arco-groups__message--me" : ""}`}>
      {!isMe ? <Avatar name={message.senderName} size="sm" /> : null}
      <div className="arco-groups__message-body">
        {!isMe ? (
          <div className="arco-groups__message-meta">
            <strong>{message.senderName}</strong>
            <time>{message.timestamp}</time>
          </div>
        ) : null}
        <p>{message.content}</p>
        {isMe ? <time className="arco-groups__message-time">{message.timestamp}</time> : null}
      </div>
    </article>
  );
}

function ChannelRow({
  channel,
  active,
  onSelect,
}: {
  channel: TeamChannel;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`arco-groups__channel${active ? " arco-groups__channel--active" : ""}`}
      onClick={onSelect}
    >
      <span className="arco-groups__channel-icon" aria-hidden>
        {channel.icon?.emoji ?? "#"}
      </span>
      <span className="arco-groups__channel-name">{channel.name}</span>
      {channel.mentionCount ? <span className="arco-groups__badge">{channel.mentionCount}</span> : null}
    </button>
  );
}

function DmRow({ dm, active, onSelect }: { dm: TeamDirectMessage; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={`arco-groups__channel${active ? " arco-groups__channel--active" : ""}`}
      onClick={onSelect}
    >
      <Avatar name={dm.name} size="sm" status={dm.status === "online" ? "online" : dm.status ? "offline" : undefined} />
      <span className="arco-groups__channel-name">{dm.name}</span>
      {dm.unreadCount ? <span className="arco-groups__badge">{dm.unreadCount}</span> : null}
    </button>
  );
}

export function GroupsApp() {
  const { t } = useTranslation();
  const vm = useGroupsStub();
  const user = useAuthStore((s) => s.user);
  const userName = user?.displayName ?? user?.username ?? "You";

  if (!vm.hasConnection) {
    return (
      <div className="arco-groups arco-groups--empty">
        <EmptyState title={i18n.t(I18nKey.APPS$GROUPS_CONNECT_A_TEAM_CHAT_ACCOUNT)}>
          <p><T k={I18nKey.APPS$GROUPS_LINK_MATTERMOST_SLACK_OR_MATRIX_TO_READ_CHANNELS_AND_DMS} /></p>
          <Button variant="primary" onClick={() => vm.setConnectOpen(true)}><T k={I18nKey.APPS$GROUPS_CONNECT_ACCOUNT} /></Button>
        </EmptyState>
        <ConnectServiceModal
          open={vm.connectOpen}
          onClose={() => vm.setConnectOpen(false)}
          domain="teams"
          existingConnections={vm.connectionsAll}
          onConnect={(input) => {
            vm.addConnection(input);
          }}
        />
      </div>
    );
  }

  return (
    <div className="arco-groups">
      <aside className="arco-groups__rail" aria-label={i18n.t(I18nKey.APPS$GROUPS_TEAM_WORKSPACES)}>
        {vm.workspaces.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            className={`arco-groups__rail-tile${vm.activeConnectionId === workspace.id ? " arco-groups__rail-tile--active" : ""}`}
            style={{ ["--groups-accent" as string]: workspace.accent }}
            title={workspace.label}
            onClick={() => vm.setActiveConnectionId(workspace.id)}
          >
            <span>{workspace.initials}</span>
            {workspace.unreadCount ? <em>{workspace.unreadCount}</em> : null}
          </button>
        ))}
        <button
          type="button"
          className="arco-groups__rail-tile arco-groups__rail-tile--add"
          title={i18n.t(I18nKey.APPS$GROUPS_CONNECT_ANOTHER_WORKSPACE)}
          aria-label={i18n.t(I18nKey.APPS$GROUPS_CONNECT_ANOTHER_WORKSPACE)}
          onClick={() => vm.setConnectOpen(true)}
        >
          <Plus size={16} />
        </button>
      </aside>

      <SidebarPane width={vm.sidebarWidth} onWidthChange={vm.setSidebarWidth}>
        <div className="arco-groups__sidebar">
          <header className="arco-groups__sidebar-header">
            <h1>{vm.workspaces.find((w) => w.id === vm.activeConnectionId)?.label ?? "Workspace"}</h1>
          </header>
          <nav className="arco-groups__nav" aria-label={i18n.t(I18nKey.APPS$GROUPS_WORKSPACE_SECTIONS)}>
            {vm.navItems.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              return (
                <button key={item.id} type="button" className={`arco-groups__nav-item${item.active ? " arco-groups__nav-item--active" : ""}`}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {item.badgeCount ? <span className="arco-groups__badge">{item.badgeCount}</span> : null}
                </button>
              );
            })}
          </nav>
          <section className="arco-groups__channel-section">
            <h2><T k={I18nKey.APPS$GROUPS_CHANNELS} /></h2>
            {vm.channels.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                active={vm.activeConversationId === channel.id}
                onSelect={() => vm.setActiveConversationId(channel.id)}
              />
            ))}
          </section>
          <section className="arco-groups__channel-section">
            <h2><T k={I18nKey.APPS$GROUPS_DIRECT_MESSAGES} /></h2>
            {vm.directMessages.map((dm) => (
              <DmRow
                key={dm.id}
                dm={dm}
                active={vm.activeConversationId === dm.id}
                onSelect={() => vm.setActiveConversationId(dm.id)}
              />
            ))}
          </section>
          <footer className="arco-groups__sidebar-footer">
            <Avatar name={userName} size="sm" status="online" />
            <span>{userName}</span>
          </footer>
        </div>
      </SidebarPane>

      <main className="arco-groups__main">
        <header className="arco-groups__thread-header">
          <div>
            <h2>
              <Hash size={16} aria-hidden />
              {vm.conversationTitle.replace(/^#/, "")}
            </h2>
            {vm.conversationTopic ? <p>{vm.conversationTopic}</p> : null}
          </div>
          <div className="arco-groups__thread-actions">
            <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$GROUPS_MEMBERS)}>
              <Users size={16} />
            </Button>
          </div>
        </header>

        <div className="arco-groups__thread">
          {vm.threadMessages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>

        <footer className="arco-groups__composer">
          <Input
            value={vm.composerValue}
            onChange={(event) => vm.setComposerValue(event.target.value)}
            placeholder={`Message ${vm.conversationTitle}`}
            aria-label={i18n.t(I18nKey.APPS$SETTINGS_MESSAGE)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                vm.handleSubmit();
              }
            }}
          />
          <Button variant="primary" size="icon" aria-label={i18n.t(I18nKey.APPS$PAY_SEND)} onClick={vm.handleSubmit} disabled={!vm.composerValue.trim()}>
            <Send size={16} />
          </Button>
        </footer>
      </main>

      <ConnectServiceModal
        open={vm.connectOpen}
        onClose={() => vm.setConnectOpen(false)}
        domain="teams"
        existingConnections={vm.connectionsAll}
        onConnect={(input) => vm.addConnection(input)}
        onSelectExisting={(connection) => vm.setActiveConnectionId(connection.id)}
      />
    </div>
  );
}
