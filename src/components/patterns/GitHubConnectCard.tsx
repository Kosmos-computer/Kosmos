import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
/**
 * GitHubConnectCard — OAuth or PAT connect UI for cloning and pushing to GitHub repos.
 * Used in Settings → Connected accounts, Studio project picker, and Git tab.
 */
import { Github, Loader2, LogOut, Plug } from "lucide-react";
import { useState } from "react";
import type { GitHubConnectionState } from "../../connections/useGitHubConnection";
import { Button, PasswordInput } from "../ui";

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
    connectWithPat,
    disconnect,
  } = connection;

  const [patToken, setPatToken] = useState("");
  const [patSubmitting, setPatSubmitting] = useState(false);
  const [patError, setPatError] = useState<string | null>(null);

  const rootClass = [
    variant === "card" ? "arco-github-connect" : "arco-github-connect arco-github-connect--inline",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handlePatConnect = async () => {
    const trimmed = patToken.trim();
    if (!trimmed) return;
    setPatSubmitting(true);
    setPatError(null);
    try {
      await connectWithPat(trimmed);
      setPatToken("");
    } catch (err) {
      setPatError(err instanceof Error ? err.message : "Could not connect GitHub account");
    } finally {
      setPatSubmitting(false);
    }
  };

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

  const displayError = patError ?? oauthError;

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
          <T
            k={
              oauthConfigured
                ? I18nKey.APPS$GITHUB_CONNECT_LEAD
                : I18nKey.APPS$GITHUB_CONNECT_PAT_LEAD
            }
          />
        </p>
        {showRepoHint ? (
          <p className="arco-github-connect__hint">
            <T k={I18nKey.APPS$GITHUB_CONNECT_REPO_HINT} />
          </p>
        ) : null}

        {oauthConfigured ? (
          <>
            {displayError ? <p className="arco-github-connect__error">{displayError}</p> : null}
            <Button variant="primary" onClick={connect} className="arco-github-connect__btn">
              <Plug size={14} />
              <T k={I18nKey.APPS$GITHUB_CONNECT_OAUTH} />
            </Button>
            <p className="arco-github-connect__divider">
              <T k={I18nKey.APPS$GITHUB_CONNECT_OR_PAT} />
            </p>
          </>
        ) : null}

        <label className="arco-github-connect__field">
          <span className="arco-github-connect__field-label">
            <T k={I18nKey.APPS$GITHUB_CONNECT_PAT_LABEL} />
          </span>
          <PasswordInput
            value={patToken}
            onChange={(event) => setPatToken(event.target.value)}
            placeholder="ghp_…"
            width="full"
            autoComplete="off"
            disabled={patSubmitting}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handlePatConnect();
            }}
          />
        </label>

        {!oauthConfigured && displayError ? (
          <p className="arco-github-connect__error">{displayError}</p>
        ) : null}

        <Button
          variant={oauthConfigured ? "default" : "primary"}
          onClick={() => void handlePatConnect()}
          disabled={patSubmitting || !patToken.trim()}
          className="arco-github-connect__btn"
        >
          {patSubmitting ? <Loader2 size={14} className="arco-spin" aria-hidden /> : <Plug size={14} />}
          <T k={I18nKey.APPS$GITHUB_CONNECT_WITH_PAT} />
        </Button>

        {!oauthConfigured ? (
          <p className="arco-github-connect__note">
            <T
              k={I18nKey.APPS$GITHUB_CONNECT_OAUTH_ADMIN_NOTE}
              values={{ callbackUrl: "/api/github/oauth/callback" }}
            />
          </p>
        ) : null}
      </div>
    </div>
  );
}
