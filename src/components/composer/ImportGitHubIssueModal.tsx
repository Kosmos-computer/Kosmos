import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * ImportGitHubIssueModal — paste a GitHub issue URL (or owner/repo#n),
 * fetch it via the connected GitHub account, and hand markdown back to
 * the composer.
 */
import { useCallback, useEffect, useState } from "react";
import { CircleDashed, X } from "lucide-react";
import { api } from "../../lib/api";
import { useGitHubConnection } from "../../connections/useGitHubConnection";
import { openSettingsApp } from "../../apps/settings/settingsStore";
import { Button, Input } from "../ui";
import type { GitHubIssueDetail } from "@shared/github";

export interface ImportGitHubIssueModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (markdown: string, issue: GitHubIssueDetail) => void;
}

export function formatGitHubIssueMarkdown(issue: GitHubIssueDetail): string {
  const labels = issue.labels.length > 0 ? `\nLabels: ${issue.labels.join(", ")}` : "";
  const body = issue.body?.trim() ? `\n\n${issue.body.trim()}` : "\n\n_(no description)_";
  return [
    `Imported GitHub issue: ${issue.htmlUrl}`,
    "",
    `#${issue.number} ${issue.title}`,
    `State: ${issue.state} · Author: @${issue.userLogin}${labels}`,
    body,
    "",
    "Please work from this issue.",
  ].join("\n");
}

export function ImportGitHubIssueModal({ open, onClose, onImport }: ImportGitHubIssueModalProps) {
  const github = useGitHubConnection();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUrl("");
    setError(null);
    setLoading(false);
  }, [open]);

  const importIssue = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a GitHub issue URL or owner/repo#123");
      return;
    }
    if (!github.isConnected) {
      setError("Connect a GitHub account in Settings first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const issue = await api.fetchGitHubIssue(trimmed);
      onImport(formatGitHubIssueMarkdown(issue), issue);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import issue");
    } finally {
      setLoading(false);
    }
  }, [url, github.isConnected, onImport, onClose]);

  if (!open) return null;

  return (
    <div className="arco-connect-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-connect-modal"
        role="dialog"
        aria-labelledby="import-github-issue-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-connect-modal__header">
          <div className="arco-connect-modal__title-row">
            <CircleDashed size={18} aria-hidden />
            <h2 id="import-github-issue-title">
              <T k={I18nKey.COMPONENTS$COMPOSER_IMPORT_GITHUB_ISSUE} />
            </h2>
          </div>
          <button
            type="button"
            className="arco-btn arco-btn--ghost arco-btn--icon"
            onClick={onClose}
            aria-label={i18n.t(I18nKey.COMMON$CLOSE)}
          >
            <X size={16} />
          </button>
        </header>

        <div className="arco-connect-modal__body">
          {!github.isConnected ? (
            <section className="arco-connect-modal__section">
              <p className="arco-connect-modal__hint">
                Connect GitHub under Settings → Connected accounts to import issues.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  openSettingsApp("accounts");
                }}
              >
                Open Connected accounts
              </Button>
            </section>
          ) : (
            <section className="arco-connect-modal__section">
              <label className="arco-connect-modal__label" htmlFor="github-issue-url">
                Issue URL
              </label>
              <Input
                id="github-issue-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/issues/123"
                spellCheck={false}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void importIssue();
                  }
                }}
              />
              <p className="arco-connect-modal__hint">
                Connected as @{github.account?.login}. Also accepts owner/repo#123.
              </p>
              {error ? <p className="arco-connect-modal__error">{error}</p> : null}
            </section>
          )}
        </div>

        {github.isConnected ? (
          <footer className="arco-connect-modal__footer">
            <Button variant="ghost" onClick={onClose}>
              <T k={I18nKey.COMMON$CANCEL} />
            </Button>
            <Button variant="primary" onClick={() => void importIssue()} disabled={loading || !url.trim()}>
              {loading ? "Importing…" : "Import"}
            </Button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
