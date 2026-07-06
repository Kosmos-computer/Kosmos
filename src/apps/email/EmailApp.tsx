import { useAuthStore } from "../../os/auth/authStore";
import { SidebarPane } from "../../components/patterns";
import { Button, Input } from "../../components/ui";
import { EmailReadingPane, EmailThreadList } from "./EmailThreadList";
import { EmailSidebar } from "./EmailSidebar";
import { useEmailStub } from "./useEmailStub";

export function EmailApp() {
  const email = useEmailStub();
  const user = useAuthStore((s) => s.user);
  const userName = user?.displayName ?? user?.username ?? "You";
  const userEmail = user?.username ? `${user.username}@local` : "you@local";

  return (
    <div className="arco-email">
      <SidebarPane width={email.sidebarWidth} onWidthChange={email.setSidebarWidth}>
        <EmailSidebar
          folders={email.folders}
          userName={userName}
          userEmail={userEmail}
          onSelectFolder={email.setActiveFolderId}
        />
      </SidebarPane>

      <div className="arco-email__workspace">
        <SidebarPane width={email.listWidth} onWidthChange={email.setListWidth} minWidth={280} maxWidth={520}>
          <EmailThreadList
            threads={email.threads}
            activeThreadId={email.activeThreadId}
            searchQuery={email.searchQuery}
            inboxFilter={email.inboxFilter}
            unreadCount={email.unreadCount}
            starredCount={email.starredCount}
            onSearchChange={email.setSearchQuery}
            onFilterChange={email.setInboxFilter}
            onSelectThread={email.setActiveThreadId}
            onToggleStar={email.toggleStar}
            onCompose={() => email.setComposeOpen(true)}
          />
        </SidebarPane>

        <EmailReadingPane subject={email.activeSubject} messages={email.activeMessages} />
      </div>

      {email.composeOpen ? (
        <div className="arco-email__compose-backdrop" role="presentation" onClick={() => email.setComposeOpen(false)}>
          <div
            className="arco-email__compose"
            role="dialog"
            aria-labelledby="email-compose-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="arco-email__compose-header">
              <h2 id="email-compose-title">New message</h2>
              <button type="button" className="arco-btn arco-btn--ghost" onClick={() => email.setComposeOpen(false)}>
                Close
              </button>
            </div>
            <div className="arco-email__compose-fields">
              <Input placeholder="To" aria-label="To" />
              <Input placeholder="Subject" aria-label="Subject" />
              <textarea
                className="arco-input arco-email__compose-body"
                placeholder="Write your message…"
                aria-label="Message body"
              />
            </div>
            <div className="arco-email__compose-actions">
              <Button variant="primary" onClick={() => email.setComposeOpen(false)}>
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
