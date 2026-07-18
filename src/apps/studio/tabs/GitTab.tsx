import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { T } from "../../../i18n/T";
/**
 * GitTab — source control for the open folder: branch + ahead/behind, the
 * working-tree change list with expandable Monaco diffs (HEAD vs working
 * tree), and commit / push / pull. Falls back to the session-snapshot diff
 * view (DiffsTab) when the active root isn't a git repo — e.g. the sandbox.
 *
 * Status refetches whenever agent activity bumps filesVersion, so the list
 * tracks the agent's edits and git commands live.
 */
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  GitBranch,
  RotateCw,
  SquarePen,
} from "lucide-react";
import type { GitFileChange, GitInfo } from "@shared/types";
import { api } from "../../../lib/api";
import { useGitHubConnection } from "../../../connections/useGitHubConnection";
import { Button } from "../../../components/ui";
import { useOsStore } from "../../../os/osStore";
import { useStudioStore, useSessionActivity } from "../studioStore";
import { DiffsTab } from "./DiffsTab";

const DiffViewer = lazy(() => import("../editor/DiffViewer"));

/** Single-letter badges in git's own vocabulary (M/A/D/R/U/!). */
const STATE_BADGE: Record<GitFileChange["state"], string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  untracked: "U",
  conflicted: "!",
};

type FileDiff = {
  before: string | null;
  after: string | null;
  unavailable?: "directory" | "binary" | "too_large";
};

const UNAVAILABLE_COPY: Record<NonNullable<FileDiff["unavailable"]>, string> = {
  directory: "This is a directory — expand individual files to see diffs.",
  binary: "Binary file — content preview is unavailable.",
  too_large: "File is too large to preview inline.",
};

/** Skip auto-expand for paths that will never show a useful text diff. */
const BINARY_EXT = /\.(apk|aab|png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|wasm|woff2?|ttf|otf|mp[34]|mov|dmg|exe|dll|so|dylib|o|a)$/i;

function canPreviewPath(p: string): boolean {
  return !p.endsWith("/") && !BINARY_EXT.test(p);
}

function ChangeRow({
  change,
  theme,
  defaultOpen = false,
}: {
  change: GitFileChange;
  theme: "light" | "dark";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestFile = useStudioStore((s) => s.requestFile);
  const setActiveTab = useStudioStore((s) => s.setActiveTab);

  // Lazy-load on first expand (and when defaultOpen mounts already open).
  const loadDiff = useCallback(async () => {
    if (diff || loading) return;
    setLoading(true);
    setError(null);
    try {
      setDiff(await api.gitDiff(change.path));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load diff");
    } finally {
      setLoading(false);
    }
  }, [change.path, diff, loading]);

  useEffect(() => {
    if (open) void loadDiff();
  }, [open, loadDiff]);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const openInFiles = useCallback(() => {
    requestFile(change.path);
    setActiveTab("files");
  }, [change.path, requestFile, setActiveTab]);

  return (
    <div className="arco-studio__diffcard">
      <div className="arco-studio__diffrow">
        <button
          type="button"
          className="arco-studio__diffrow-main"
          onClick={toggle}
          aria-expanded={open}
        >
          <ChevronRight
            size={12}
            className="arco-studio__treechevron"
            style={{ transform: open ? "rotate(90deg)" : undefined }}
          />
          <span className={`arco-studio__gitstate arco-studio__gitstate--${change.state}`}>
            {STATE_BADGE[change.state]}
          </span>
          <span className="arco-studio__diffpath">{change.path}</span>
        </button>
        {change.state !== "deleted" && (
          <button type="button" className="arco-toolcard__open" onClick={openInFiles}>
            <SquarePen size={11} style={{ verticalAlign: "-1px" }} />
            <T k={I18nKey.COMMON$EDIT} />
          </button>
        )}
      </div>
      {open && (
        <div className="arco-studio__diffhost">
          {loading && !diff && (
            <div className="arco-empty">
              <T k={I18nKey.APPS$STUDIO_LOADING_DIFF} />
            </div>
          )}
          {error && <div className="arco-empty">{error}</div>}
          {diff?.unavailable && (
            <div className="arco-empty">{UNAVAILABLE_COPY[diff.unavailable]}</div>
          )}
          {diff && !diff.unavailable && (
            <Suspense
              fallback={
                <div className="arco-empty">
                  <T k={I18nKey.APPS$STUDIO_LOADING_DIFF} />
                </div>
              }
            >
              <DiffViewer
                path={change.path}
                before={diff.before}
                after={diff.after ?? ""}
                theme={theme}
              />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}

export function GitTab() {
  const theme = useOsStore((s) => s.theme);
  const github = useGitHubConnection();
  const { filesVersion } = useSessionActivity();
  const workspace = useStudioStore((s) => s.workspace);
  const [info, setInfo] = useState<GitInfo | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"commit" | "push" | "pull" | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    if (workspace.backend === "drive") {
      setInfo({ isRepo: false, branch: "", ahead: 0, behind: 0, upstream: "", changes: [] });
      useStudioStore.setState({ gitChangeCount: 0 });
      return;
    }
    try {
      const next = await api.gitInfo();
      setInfo(next);
      // The drawer tab badge lives outside this component.
      useStudioStore.setState({ gitChangeCount: next.isRepo ? next.changes.length : 0 });
    } catch {
      // Server unreachable — keep the last known state.
    }
  }, [workspace.backend]);

  useEffect(() => {
    void refresh();
  }, [refresh, filesVersion, workspace.worktreePath, workspace.roots]);

  // Wraps commit/push/pull with busy state, feedback, and a status refresh.
  const runAction = useCallback(
    async (kind: "commit" | "push" | "pull", fn: () => Promise<{ output: string }>) => {
      setBusy(kind);
      setFeedback(null);
      try {
        const res = await fn();
        setFeedback({ ok: true, text: res.output || `${kind} ok` });
        if (kind === "commit") setMessage("");
      } catch (err) {
        setFeedback({ ok: false, text: err instanceof Error ? err.message : `${kind} failed` });
      } finally {
        setBusy(null);
        void refresh();
      }
    },
    [refresh],
  );

  if (workspace.backend === "drive") {
    return (
      <div className="arco-empty" style={{ padding: "var(--arco-space-m)" }}>
        Git is unavailable while the workspace backend is Drive.
      </div>
    );
  }

  if (!info) return <div className="arco-empty"><T k={I18nKey.APPS$STUDIO_CHECKING_GIT_STATUS} /></div>;

  // Sandbox / non-repo folder: session snapshots are the best we can show.
  if (!info.isRepo) return <DiffsTab />;

  const firstPreviewable = info.changes.find((c) => canPreviewPath(c.path))?.path;

  return (
    <div className="arco-studio__git">
      {/* ── Branch bar ─────────────────────────────────────────────────── */}
      <div className="arco-studio__gitbar">
        <GitBranch size={13} style={{ color: "var(--arco-accent)" }} />
        <span className="arco-studio__gitbranch">{info.branch}</span>
        {info.ahead > 0 && (
          <span className="arco-studio__gitcount" title={`${info.ahead} commit(s) ahead of ${info.upstream}`}>
            <ArrowUp size={11} />
            {info.ahead}
          </span>
        )}
        {info.behind > 0 && (
          <span className="arco-studio__gitcount" title={`${info.behind} commit(s) behind ${info.upstream}`}>
            <ArrowDown size={11} />
            {info.behind}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button
          className="arco-btn"
          disabled={busy !== null}
          onClick={() => void runAction("pull", api.gitPull)}
        >
          {busy === "pull" ? "Pulling…" : "Pull"}
        </button>
        <button
          className="arco-btn"
          disabled={busy !== null || info.ahead === 0}
          onClick={() => void runAction("push", api.gitPush)}
        >
          {busy === "push" ? "Pushing…" : "Push"}
        </button>
        {!github.isConnected && github.oauthConfigured ? (
          <Button variant="ghost" onClick={github.connect}>
            <T k={I18nKey.APPS$STUDIO_GITHUB_CONNECT} />
          </Button>
        ) : null}
        <button className="arco-btn arco-btn--icon" onClick={() => void refresh()} aria-label={i18n.t(I18nKey.APPS$STUDIO_REFRESH_GIT_STATUS)}>
          <RotateCw size={12} />
        </button>
      </div>

      {/* ── Change list ────────────────────────────────────────────────── */}
      <div className="arco-studio__diffs arco-scroll" style={{ flex: 1 }}>
        {info.changes.length === 0 && (
          <div className="arco-empty">
            <Check size={16} style={{ color: "var(--arco-success)" }} />
            <span><T k={I18nKey.APPS$STUDIO_WORKING_TREE_CLEAN} /></span>
          </div>
        )}
        {info.changes.map((change) => (
          <ChangeRow
            key={change.path}
            change={change}
            theme={theme}
            defaultOpen={change.path === firstPreviewable}
          />
        ))}
      </div>

      {/* ── Commit box ─────────────────────────────────────────────────── */}
      <div className="arco-studio__commitbox">
        {feedback && (
          <div className={feedback.ok ? "arco-studio__gitok" : "arco-chat__error"}>
            {feedback.text.slice(0, 300)}
          </div>
        )}
        <div className="arco-studio__commitrow">
          <input
            className="arco-studio__commitmsg"
            placeholder={i18n.t(I18nKey.APPS$STUDIO_COMMIT_MESSAGE)}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && message.trim() && info.changes.length > 0) {
                void runAction("commit", () => api.gitCommit(message.trim()));
              }
            }}
          />
          <button
            className="arco-btn arco-btn--primary"
            disabled={busy !== null || !message.trim() || info.changes.length === 0}
            onClick={() => void runAction("commit", () => api.gitCommit(message.trim()))}
          >
            {busy === "commit" ? "Committing…" : "Commit all"}
          </button>
        </div>
      </div>
    </div>
  );
}
