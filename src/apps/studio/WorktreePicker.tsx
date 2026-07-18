/**
 * Worktree lifecycle list — pin / sleep / archive / activate / remove.
 * Shown in the WorkspaceChrome worktree popover under the composer.
 */
import { useCallback, useEffect, useState } from "react";
import { Archive, GitBranch, Moon, Pin, Plus, Trash2 } from "lucide-react";
import type { GitWorktreeInfo } from "@shared/types";
import { api } from "../../lib/api";
import { useStudioStore } from "./studioStore";
import { useWorktreeMetaStore } from "./worktreeMetaStore";

function defaultWorktreePath(primaryPath: string, branch: string): string {
  const safe = branch.replace(/[^a-zA-Z0-9._-]+/g, "-") || "worktree";
  const trimmed = primaryPath.replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  const parent = slash >= 0 ? trimmed.slice(0, slash) : ".";
  const base = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  return `${parent}/${base}-wt-${safe}`;
}

export interface WorktreePickerProps {
  /** Called after activate/create so the chrome popover can close. */
  onDone?: () => void;
}

export function WorktreePicker({ onDone }: WorktreePickerProps) {
  const workspace = useStudioStore((s) => s.workspace);
  const setWorkspaceState = useStudioStore((s) => s.setWorkspaceState);
  const refreshWorkspace = useStudioStore((s) => s.refreshWorkspace);
  const [trees, setTrees] = useState<GitWorktreeInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const meta = useWorktreeMetaStore();

  const primary = workspace.roots.find((r) => r.role === "primary");
  const canManage = workspace.backend === "local" && Boolean(primary?.location);

  const refresh = useCallback(async () => {
    if (!canManage) {
      setTrees([]);
      return;
    }
    try {
      setTrees(await api.gitWorktrees());
    } catch {
      setTrees([]);
    }
  }, [canManage]);

  useEffect(() => {
    void refresh();
  }, [refresh, workspace.worktreePath]);

  if (!canManage) return null;

  const visible = trees.filter((t) => !meta.isArchived(t.path));

  const activate = async (path: string | null) => {
    setBusy(true);
    try {
      const next = await api.setWorkspaceWorktree(path);
      setWorkspaceState(next);
      meta.clearSleeping(path ?? primary!.location);
      onDone?.();
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  const createWorktree = async () => {
    if (!primary) return;
    const branch = window.prompt("Branch name for new worktree", `feature/${Date.now().toString(36)}`);
    if (!branch?.trim()) return;
    const path = defaultWorktreePath(primary.location, branch.trim());
    setBusy(true);
    try {
      await api.gitWorktreeAdd(path, branch.trim());
      const next = await api.setWorkspaceWorktree(path);
      setWorkspaceState(next);
      await refreshWorkspace();
      onDone?.();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not create worktree");
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  const remove = async (path: string) => {
    if (!window.confirm(`Remove worktree at ${path}?`)) return;
    setBusy(true);
    try {
      if (workspace.worktreePath === path) {
        await api.setWorkspaceWorktree(null);
      }
      await api.gitWorktreeRemove(path);
      meta.removeMeta(path);
      await refreshWorkspace();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not remove worktree");
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  return (
    <div className="arco-workspacechrome__worktrees">
      <div className="arco-workspacechrome__worktrees-head">
        <span>Worktrees</span>
        <button
          type="button"
          className="arco-btn arco-btn--icon"
          disabled={busy}
          title="Create worktree"
          aria-label="Create worktree"
          onClick={() => void createWorktree()}
        >
          <Plus size={14} />
        </button>
      </div>

      <button
        type="button"
        className={`arco-workspacechrome__worktree-row${!workspace.worktreePath ? " arco-workspacechrome__worktree-row--active" : ""}`}
        disabled={busy}
        onClick={() => void activate(null)}
      >
        <GitBranch size={12} />
        <span className="arco-workspacechrome__worktree-meta">Primary checkout</span>
      </button>

      {visible.map((tree) => {
        const active = workspace.worktreePath === tree.path;
        const sleeping = meta.isSleeping(tree.path);
        const pinned = meta.isPinned(tree.path);
        return (
          <div key={tree.path} className="arco-workspacechrome__worktree-row-wrap">
            <button
              type="button"
              className={`arco-workspacechrome__worktree-row${active ? " arco-workspacechrome__worktree-row--active" : ""}${sleeping ? " arco-workspacechrome__worktree-row--sleeping" : ""}`}
              disabled={busy}
              onClick={() => void activate(tree.path)}
              title={tree.path}
            >
              <GitBranch size={12} />
              <span className="arco-workspacechrome__worktree-meta">
                {pinned ? "📌 " : ""}
                {tree.branch || tree.path.split("/").pop()}
                {sleeping ? " (sleeping)" : ""}
              </span>
            </button>
            <button
              type="button"
              className="arco-btn arco-btn--icon"
              title={pinned ? "Unpin" : "Pin"}
              aria-label={pinned ? "Unpin" : "Pin"}
              onClick={() => meta.togglePinned(tree.path)}
            >
              <Pin size={12} />
            </button>
            <button
              type="button"
              className="arco-btn arco-btn--icon"
              title={sleeping ? "Wake" : "Sleep"}
              aria-label={sleeping ? "Wake" : "Sleep"}
              onClick={() => meta.toggleSleeping(tree.path)}
            >
              <Moon size={12} />
            </button>
            <button
              type="button"
              className="arco-btn arco-btn--icon"
              title="Archive"
              aria-label="Archive worktree"
              onClick={() => meta.archive(tree.path)}
            >
              <Archive size={12} />
            </button>
            <button
              type="button"
              className="arco-btn arco-btn--icon"
              title="Remove worktree"
              aria-label="Remove worktree"
              disabled={busy}
              onClick={() => void remove(tree.path)}
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
