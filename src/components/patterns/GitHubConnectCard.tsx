import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
/**
 * GitHubConnectCard — OAuth connect UI for cloning and pushing to GitHub repos.
 * Used in Settings → Connected accounts, Studio project picker, and Git tab.
 */
import { Github, Loader2, LogOut, Plug } from "lucide-react";
import type { GitHubConnectionState } from "../../connections/useGitHubConnection";
import { Button } from "../ui";

export interface GitHubConnectCardProps {
  connection: GitHubConnectionState;
  /** Full centered card vs compact inline panel. */
  variant?: "card" | "inline";
  /** Show clone/repos hint below the lead copy. */
  showRepoHint?: boolean;
  className?: string;
}

export function GitHubConnectCard({
  connection,
  variant = "card",
  showRepoHint = true,
  className,
}: GitHubConnectCardProps) {
  const {
    loading,
    oauthConfigured,
    account,
    isConnected,
    oauthError,
    connect,
    disconnect,
  } = connection;

  const rootClass = [
    variant === "card" ? "arco-github-connect" : "arco-github-connect arco-github-connect--inline",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <div className={rootClass}>
        <div className="arco-github-connect__card">
          <Loader2 size={18} className="arco-spin" aria-hidden />
          <span className="arco-github-connect__loading">
            <T k={I18nKey.APPS$GITHUB_CONNECT_LOADING} />
          </span>
        </div>
      </div>
    );
  }

  if (isConnected && account) {
    return (
      <div className={rootClass}>
        <div className="arco-github-connect__card arco-github-connect__card--connected">
          <div className="arco-github-connect__brand">
            <Github size={20} />
            <div>
              <h2 className="arco-github-connect__title">
                <T k={I18nKey.APPS$GITHUB_CONNECTED_TITLE} />
              </h2>
              <p className="arco-github-connect__meta">@{account.login}</p>
            </div>
          </div>
          <p className="arco-github-connect__lead">
            <T k={I18nKey.APPS$GITHUB_CONNECTED_LEAD} />
          </p>
          <Button variant="ghost" onClick={() => void disconnect()} className="arco-github-connect__btn">
            <LogOut size={14} />
            <T k={I18nKey.COMMON$DISCONNECT} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <div className="arco-github-connect__card">
        <div className="arco-github-connect__brand">
          <Github size={20} />
          <h2 className="arco-github-connect__title">
            <T k={I18nKey.APPS$GITHUB_CONNECT_TITLE} />
          </h2>
        </div>
        <p className="arco-github-connect__lead">
          <T k={I18nKey.APPS$GITHUB_CONNECT_LEAD} />
        </p>
        {showRepoHint ? (
          <p className="arco-github-connect__hint">
            <T k={I18nKey.APPS$GITHUB_CONNECT_REPO_HINT} />
          </p>
        ) : null}
        {!oauthConfigured ? (
          <p className="arco-github-connect__note">
            <T k={I18nKey.APPS$GITHUB_CONNECT_NOT_CONFIGURED} />
            <code>GITHUB_CLIENT_ID</code>
            <T k={I18nKey.APPS$EMAIL_AND} />
            <code>GITHUB_CLIENT_SECRET</code>
            <T k={I18nKey.APPS$GITHUB_CONNECT_CALLBACK_HINT} />
            <code>/api/github/oauth/callback</code>.
          </p>
        ) : null}
        {oauthError ? <p className="arco-github-connect__error">{oauthError}</p> : null}
        <Button
          variant="primary"
          onClick={connect}
          disabled={!oauthConfigured}
          className="arco-github-connect__btn"
        >
          <Plug size={14} />
          <T k={I18nKey.APPS$STUDIO_GITHUB_CONNECT} />
        </Button>
      </div>
    </div>
  );
}
