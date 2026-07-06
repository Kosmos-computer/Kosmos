import { useEffect } from "react";
import { useAuthStore } from "../../os/auth/authStore";
import { SidebarPane } from "../../components/patterns";
import { Button, Input } from "../../components/ui";
import { EmailReadingPane, EmailThreadList } from "./EmailThreadList";
import { EmailSidebar } from "./EmailSidebar";
import { useEmail } from "./useEmail";

export function EmailApp() {
  const email = useEmail();
  const user = useAuthStore((s) => s.user);
  const userName = user?.displayName ?? user?.username ?? "You";
  const userEmail = email.connectedAccount?.email ?? (user?.username ? `${user.username}@local` : "you@local");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("mailConnected") || params.has("mailError")) {
      void email.refreshStatus();
      params.delete("mailConnected");
      params.delete("mailError");
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [email.refreshStatus]);

  return (
    <div className="arco-email">
      <SidebarPane width={email.sidebarWidth} onWidthChange={email.setSidebarWidth}>
        <EmailSidebar
          folders={email.folders}
          userName={userName}
          userEmail={userEmail}
          onSelectFolder={email.setActiveFolderId}
          isConnected={email.isConnected}
          oauthConfigured={email.oauthConfigured}
          onConnect={email.connectGmail}
          onDisconnect={() => void email.disconnect()}
        />
      </SidebarPane>

      <div className="arco-email__workspace">
        {!email.isConnected ? (
          <div className="arco-email__connect arco-scroll">
            <div className="arco-email__connect-card">
              <h2>Connect Gmail</h2>
              <p>
                Link your Google account to read and send mail from Arco. Messages stay live from Gmail —
                nothing is copied into a local store yet.
              </p>
              {!email.oauthConfigured ? (
                <p className="arco-email__connect-note">
                  Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> on the Arco server,
                  then add redirect URI <code>http://localhost:4600/api/mail/oauth/google/callback</code>.
                </p>
              ) : null}
              {email.error ? <p className="arco-email__connect-error">{email.error}</p> : null}
              <Button variant="primary" onClick={email.connectGmail} disabled={!email.oauthConfigured}>
                Connect Gmail
              </Button>
            </div>
          </div>
        ) : (
          <>
            <SidebarPane width={email.listWidth} onWidthChange={email.setListWidth} minWidth={280} maxWidth={520}>
              <EmailThreadList
                threads={email.threads}
                activeThreadId={email.activeThreadId ?? ""}
                searchQuery={email.searchQuery}
                inboxFilter={email.inboxFilter}
                unreadCount={email.unreadCount}
                starredCount={email.starredCount}
                loading={email.loading}
                error={email.error}
                onSearchChange={email.setSearchQuery}
                onFilterChange={email.setInboxFilter}
                onSelectThread={(id) => email.setActiveThreadId(id)}
                onToggleStar={(id) => void email.toggleStar(id)}
                onCompose={() => email.setComposeOpen(true)}
              />
            </SidebarPane>

            <EmailReadingPane subject={email.activeSubject} messages={email.activeMessages} />
          </>
        )}
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
              <Input
                placeholder="To"
                aria-label="To"
                value={email.composeTo}
                onChange={(event) => email.setComposeTo(event.target.value)}
              />
              <Input
                placeholder="Subject"
                aria-label="Subject"
                value={email.composeSubject}
                onChange={(event) => email.setComposeSubject(event.target.value)}
              />
              <textarea
                className="arco-input arco-email__compose-body"
                placeholder="Write your message…"
                aria-label="Message body"
                value={email.composeBody}
                onChange={(event) => email.setComposeBody(event.target.value)}
              />
            </div>
            <div className="arco-email__compose-actions">
              <Button variant="primary" onClick={() => void email.sendCompose()} disabled={email.sending}>
                {email.sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
