import { Inbox, Mail, Search, Star } from "lucide-react";
import { Badge, Button, Chip, EmptyState, Input } from "../../components/ui";
import type { EmailThread } from "./types";

export function EmailThreadList({
  threads,
  activeThreadId,
  searchQuery,
  inboxFilter,
  unreadCount,
  starredCount,
  loading = false,
  error,
  onSearchChange,
  onFilterChange,
  onSelectThread,
  onToggleStar,
  onCompose,
}: {
  threads: EmailThread[];
  activeThreadId: string;
  searchQuery: string;
  inboxFilter: "all" | "unread" | "starred";
  unreadCount: number;
  starredCount: number;
  loading?: boolean;
  error?: string | null;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: "all" | "unread" | "starred") => void;
  onSelectThread: (id: string) => void;
  onToggleStar: (id: string) => void;
  onCompose: () => void;
}) {
  return (
    <div className="arco-email__list-pane">
      <div className="arco-email__list-header">
        <div className="arco-email__list-title">
          <Mail size={16} strokeWidth={1.75} />
          Inbox
          {unreadCount > 0 ? <Badge>{unreadCount}</Badge> : null}
        </div>
        <Button variant="primary" onClick={onCompose}>
          Compose
        </Button>
      </div>

      <div className="arco-email__list-toolbar">
        <div className="arco-email__search">
          <Search size={14} className="arco-icon--tertiary" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search mail"
            aria-label="Search mail"
            width="auto"
          />
        </div>
        <div className="arco-email__filters" role="tablist" aria-label="Inbox filters">
          <Chip active={inboxFilter === "all"} onClick={() => onFilterChange("all")}>
            All
          </Chip>
          <Chip active={inboxFilter === "unread"} onClick={() => onFilterChange("unread")}>
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </Chip>
          <Chip active={inboxFilter === "starred"} onClick={() => onFilterChange("starred")}>
            Starred{starredCount > 0 ? ` (${starredCount})` : ""}
          </Chip>
        </div>
      </div>

      <div className="arco-email__thread-list arco-scroll">
        {error ? (
          <EmptyState title="Could not load mail">{error}</EmptyState>
        ) : loading ? (
          <EmptyState title="Loading mail…" />
        ) : threads.length === 0 ? (
          <EmptyState title={searchQuery.trim() ? "No mail found" : "Inbox is empty"}>
            {searchQuery.trim()
              ? "Try a different sender, subject, or preview."
              : "Messages matching this filter will appear here."}
          </EmptyState>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={[
                "arco-email__thread",
                thread.id === activeThreadId ? "arco-email__thread--active" : "",
                thread.unread ? "arco-email__thread--unread" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectThread(thread.id)}
            >
              <span className="arco-email__thread-star">
                <button
                  type="button"
                  className={thread.starred ? "arco-email__star--active" : ""}
                  aria-label={thread.starred ? "Unstar" : "Star"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleStar(thread.id);
                  }}
                >
                  <Star size={14} fill={thread.starred ? "currentColor" : "none"} />
                </button>
              </span>
              <span className="arco-email__thread-body">
                <span className="arco-email__thread-top">
                  <span className="arco-email__thread-sender">{thread.senderName}</span>
                  <span className="arco-email__thread-time">{thread.timestamp}</span>
                </span>
                <span className="arco-email__thread-subject">{thread.subject}</span>
                <span className="arco-email__thread-preview">{thread.preview}</span>
              </span>
              {thread.unread ? <span className="arco-email__unread-dot" aria-hidden="true" /> : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function EmailReadingPane({
  subject,
  messages,
}: {
  subject?: string;
  messages: { id: string; senderName: string; timestamp: string; body: string }[];
}) {
  if (!subject || messages.length === 0) {
    return (
      <div className="arco-email__reading arco-email__reading--empty">
        <EmptyState title="Select a message">
          <Inbox size={22} className="arco-icon--tertiary" />
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="arco-email__reading arco-scroll">
      <h1 className="arco-email__reading-subject">{subject}</h1>
      {messages.map((message) => (
        <article key={message.id} className="arco-email__message">
          <header className="arco-email__message-header">
            <span className="arco-avatar arco-avatar--md" aria-hidden="true">
              {message.senderName
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div className="arco-email__message-meta">
              <strong>{message.senderName}</strong>
              <span>{message.timestamp}</span>
            </div>
          </header>
          <div className="arco-email__message-body">
            {message.body.split("\n").map((line, index) => (
              <p key={`${message.id}-${index}`}>{line || "\u00a0"}</p>
            ))}
          </div>
        </article>
      ))}
      <div className="arco-email__reply-bar">
        <Input placeholder="Reply…" aria-label="Reply" width="auto" />
        <Button variant="primary">Send</Button>
      </div>
    </div>
  );
}
