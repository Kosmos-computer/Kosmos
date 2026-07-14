/**
 * WorkspaceChrome — chip row in the Studio composer status bar:
 * [Local▾] [folder▾] [branch▾ | □ worktree] [extra✕]… [📁+]
 *
 * Branch opens a search + branch-list popover. Worktree is a checkbox that
 * activates/clears a linked worktree without a separate menu.
 */
import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Cloud,
  CornerLeftUp,
  Folder,
  FolderGit2,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  GitBranch,
  Github,
  HardDrive,
  Laptop,
  Loader2,
  Search,
  Square,
  SquareCheck,
  X,
} from "lucide-react";
import type {
  DirListing,
  GitBranchInfo,
  WorkspaceBackendKind,
  WorkspaceFeatures,
  WorkspaceRoot,
} from "@shared/types";
import type { FileEntry } from "@shared/capabilities/files";
import { GitHubConnectCard } from "../../components/patterns";
import { Input } from "../../components/ui/Input";
import { api } from "../../lib/api";
import { useGitHubConnection } from "../../connections/useGitHubConnection";
import {
  activateServerProfile,
  clearActiveServerProfile,
  getActiveServerProfile,
  listServerProfiles,
  reloadForServerSwitch,
} from "../../os/server/serverProfileStore";
import { useStudioStore } from "./studioStore";

const SANDBOX_LABEL = "Sandbox";
const FOLDER_MIME = "inode/directory";

type MenuKind = "backend" | "primary" | "branch" | "add" | null;
type FolderPanel = "menu" | "browse" | "github" | "drive";

/** Sibling path for a new worktree: `../repo-wt-branch`. */
function defaultWorktreePath(primaryPath: string, branch: string): string {
  const safe = branch.replace(/[^a-zA-Z0-9._-]+/g, "-") || "worktree";
  const trimmed = primaryPath.replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  const parent = slash >= 0 ? trimmed.slice(0, slash) : ".";
  const base = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  return `${parent}/${base}-wt-${safe}`;
}

function backendIcon(kind: WorkspaceBackendKind, size: number) {
  if (kind === "drive") return <HardDrive size={size} />;
  if (kind === "remote") return <Cloud size={size} />;
  return <Laptop size={size} />;
}

function backendLabel(kind: WorkspaceBackendKind, remoteName?: string | null): string {
  if (kind === "drive") return "Drive";
  if (kind === "remote") return remoteName || "Remote";
  return "Local";
}

export function WorkspaceChrome() {
  const workspace = useStudioStore((s) => s.workspace);
  const projectsInfo = useStudioStore((s) => s.projectsInfo);
  const refreshWorkspace = useStudioStore((s) => s.refreshWorkspace);
  const setWorkspaceState = useStudioStore((s) => s.setWorkspaceState);
  const openFolder = useStudioStore((s) => s.openFolder);
  const switchProject = useStudioStore((s) => s.switchProject);

  const [menu, setMenu] = useState<MenuKind>(null);
  const [panel, setPanel] = useState<FolderPanel>("menu");
  const [addMode, setAddMode] = useState(false);
  const [browsing, setBrowsing] = useState<DirListing | null>(null);
  const [driveStack, setDriveStack] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Drive" },
  ]);
  const [driveEntries, setDriveEntries] = useState<FileEntry[]>([]);
  const [features, setFeatures] = useState<WorkspaceFeatures | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [branchName, setBranchName] = useState("");
  const [branchQuery, setBranchQuery] = useState("");
  const [gitBusy, setGitBusy] = useState(false);
  const [repoRef, setRepoRef] = useState("");
  const [repoBranch, setRepoBranch] = useState("");
  const [cloning, setCloning] = useState(false);
  const github = useGitHubConnection();
  const [githubRepos, setGithubRepos] = useState<Awaited<ReturnType<typeof api.listGitHubRepos>>>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const branchSearchRef = useRef<HTMLInputElement>(null);

  const primary = workspace.roots.find((r) => r.role === "primary") ?? null;
  const additional = workspace.roots.filter((r) => r.role === "additional");
  const profiles = listServerProfiles();
  const activeProfile = getActiveServerProfile();
  // After a remote switch + reload, the active profile is the source of truth
  // for the "Remote" chip; Drive/Local come from workspace.backend.
  const displayBackend: WorkspaceBackendKind =
    workspace.backend === "drive"
      ? "drive"
      : activeProfile
        ? "remote"
        : workspace.backend === "remote"
          ? "remote"
          : "local";
  const showGit = displayBackend === "local" && workspace.backend !== "drive" && !!primary;

  useEffect(() => {
    void refreshWorkspace();
    void api.workspaceFeatures().then(setFeatures).catch(() => setFeatures(null));
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenu(null);
        setPanel("menu");
        setBrowsing(null);
        setError(null);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu]);

  useEffect(() => {
    if (!showGit) {
      setBranchName("");
      return;
    }
    void api
      .gitInfo()
      .then((info) => setBranchName(info.branch || ""))
      .catch(() => setBranchName(""));
  }, [showGit, workspace.worktreePath, primary?.location]);

  useEffect(() => {
    if (menu !== "branch" || !showGit) return;
    setBranchQuery("");
    void (async () => {
      try {
        const [b, info] = await Promise.all([api.gitBranches(), api.gitInfo()]);
        setBranches(b);
        setBranchName(info.branch || "");
      } catch {
        setBranches([]);
      }
    })();
  }, [menu, showGit, workspace.worktreePath, primary?.location]);

  useEffect(() => {
    if (menu !== "branch") return;
    const id = window.requestAnimationFrame(() => branchSearchRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [menu]);

  const filteredBranches = useMemo(() => {
    const q = branchQuery.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, branchQuery]);

  const applyWorkspace = useCallback(
    (next: typeof workspace) => {
      setWorkspaceState(next);
      void refreshWorkspace();
    },
    [setWorkspaceState, refreshWorkspace],
  );

  const openMenu = (kind: MenuKind, asAdd = false) => {
    setAddMode(asAdd);
    setMenu((m) => (m === kind && !asAdd ? null : kind));
    setPanel(workspace.backend === "drive" ? "drive" : "menu");
    setBrowsing(null);
    setError(null);
    if (workspace.backend === "drive") {
      setDriveStack([{ id: null, name: "Drive" }]);
      void loadDrive(null);
    }
  };

  const browse = useCallback(
    async (path?: string) => {
      try {
        const start = path ?? features?.defaultBrowsePath;
        setBrowsing(await api.browseDirs(start));
        setPanel("browse");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot read directory");
      }
    },
    [features?.defaultBrowsePath],
  );

  const loadDrive = useCallback(async (parentId: string | null) => {
    try {
      const entries = await api.listDriveEntries({ parentId });
      setDriveEntries(entries.filter((e) => e.mimeType === FOLDER_MIME && !e.trashed));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot list Drive");
    }
  }, []);

  const attachLocal = useCallback(
    async (path: string) => {
      try {
        if (addMode && workspace.roots.length > 0) {
          applyWorkspace(await api.addWorkspaceRoot(path));
        } else {
          await openFolder(path);
        }
        setMenu(null);
        setPanel("menu");
        setBrowsing(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot open folder");
      }
    },
    [addMode, workspace.roots.length, applyWorkspace, openFolder],
  );

  const attachDrive = useCallback(
    async (entry: FileEntry) => {
      try {
        applyWorkspace(
          await api.addWorkspaceRoot(entry.id, {
            name: entry.name,
            asPrimary: !addMode || workspace.roots.length === 0,
          }),
        );
        setMenu(null);
        setPanel("menu");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot open Drive folder");
      }
    },
    [addMode, workspace.roots.length, applyWorkspace],
  );

  const nativePick = useCallback(async () => {
    try {
      const { path } = await api.nativePickFolder();
      await attachLocal(path);
    } catch {
      // cancelled
    }
  }, [attachLocal]);

  const setBackend = async (backend: WorkspaceBackendKind, remoteProfileId?: string | null) => {
    if (backend === "remote" && remoteProfileId) {
      activateServerProfile(remoteProfileId);
      applyWorkspace(await api.setWorkspaceBackend("remote", remoteProfileId));
      reloadForServerSwitch();
      return;
    }
    if (backend === "local" && getActiveServerProfile()) {
      clearActiveServerProfile();
      applyWorkspace(await api.setWorkspaceBackend("local"));
      reloadForServerSwitch();
      return;
    }
    applyWorkspace(await api.setWorkspaceBackend(backend, remoteProfileId ?? null));
    setMenu(null);
  };

  const checkout = async (branch: string, create = false) => {
    setGitBusy(true);
    try {
      await api.gitCheckout(branch, create);
      const info = await api.gitInfo();
      setBranchName(info.branch);
      setBranches(await api.gitBranches());
      setMenu(null);
      setBranchQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setGitBusy(false);
    }
  };

  const toggleWorktree = async () => {
    if (gitBusy) return;
    setGitBusy(true);
    setError(null);
    try {
      if (workspace.worktreePath) {
        applyWorkspace(await api.setWorkspaceWorktree(null));
        return;
      }
      const primaryPath = primary?.location;
      if (!primaryPath) return;

      const trees = await api.gitWorktrees();
      // First porcelain entry is the main worktree; linked ones follow.
      const linked = trees.filter((w, i) => i > 0 && !w.bare);
      const info = await api.gitInfo();
      const current = info.branch || branchName;
      const match =
        linked.find((w) => w.branch === current) ?? linked[0] ?? null;

      if (match) {
        applyWorkspace(await api.setWorkspaceWorktree(match.path));
        return;
      }

      if (!current) {
        setError("No branch to create a worktree for");
        return;
      }
      await api.gitWorktreeAdd(defaultWorktreePath(primaryPath, current), current);
      applyWorkspace(await api.getWorkspace());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Worktree toggle failed");
    } finally {
      setGitBusy(false);
    }
  };

  const cloneGitHub = async () => {
    const ref = repoRef.trim();
    if (!ref) return;
    setCloning(true);
    try {
      const project = await api.cloneGitRepo(ref, repoBranch.trim() || undefined);
      await openFolder(project.path);
      setMenu(null);
      setPanel("menu");
      setRepoRef("");
      setRepoBranch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clone failed");
    } finally {
      setCloning(false);
    }
  };

  useEffect(() => {
    if (panel === "github" && github.isConnected) {
      setLoadingRepos(true);
      void api
        .listGitHubRepos(repoSearch.trim() || undefined)
        .then(setGithubRepos)
        .catch((err) => setError(err instanceof Error ? err.message : "Could not load repos"))
        .finally(() => setLoadingRepos(false));
    }
  }, [panel, github.isConnected, repoSearch]);

  const iconSize = 11;
  const showNativePicker = features?.nativeFolderPicker ?? false;
  const showGitHubClone = (features?.githubClone ?? true) && workspace.backend === "local";

  const renderFolderMenu = () => (
    <div className="arco-projectpicker__menu arco-workspacechrome__menu" role="listbox">
      {panel === "menu" && workspace.backend === "local" && (
        <>
          {!addMode && (
            <button
              className="arco-projectpicker__item"
              onClick={() => void switchProject(null).then(() => setMenu(null))}
            >
              <Folder size={13} />
              <span style={{ flex: 1 }}>{SANDBOX_LABEL}</span>
              {!primary && <Check size={13} />}
            </button>
          )}
          {projectsInfo.projects.map((p) => (
            <div key={p.id} className="arco-projectpicker__row">
              <button
                className="arco-projectpicker__item"
                title={p.path}
                onClick={() => {
                  if (addMode) void attachLocal(p.path);
                  else void switchProject(p.id).then(() => setMenu(null));
                }}
              >
                <FolderGit2 size={13} />
                <span style={{ flex: 1 }}>{p.name}</span>
                {!addMode && p.path === primary?.location && <Check size={13} />}
              </button>
            </div>
          ))}
          <div className="arco-projectpicker__divider" />
          {showNativePicker && (
            <button className="arco-projectpicker__item" onClick={() => void nativePick()}>
              <FolderSearch size={13} />
              <T k={I18nKey.APPS$STUDIO_CHOOSE_IN_FINDER} />
            </button>
          )}
          <button
            className="arco-projectpicker__item"
            onClick={() => {
              setPanel("browse");
              void browse();
            }}
          >
            <FolderOpen size={13} />
            <T k={I18nKey.APPS$STUDIO_BROWSE} />
          </button>
          {showGitHubClone && !addMode && (
            <button className="arco-projectpicker__item" onClick={() => setPanel("github")}>
              <Github size={13} />
              <T k={I18nKey.APPS$STUDIO_OPEN_FROM_GITHUB} />
            </button>
          )}
        </>
      )}

      {panel === "browse" && browsing && (
        <div className="arco-projectpicker__browser">
          <div className="arco-projectpicker__browserbar">
            <button
              className="arco-btn arco-btn--icon"
              onClick={() => {
                setPanel("menu");
                setBrowsing(null);
              }}
              aria-label={i18n.t(I18nKey.COMMON$BACK)}
            >
              <ChevronLeft size={12} />
            </button>
            <button
              className="arco-btn arco-btn--icon"
              disabled={!browsing.parent}
              onClick={() => browsing.parent && void browse(browsing.parent)}
              aria-label={i18n.t(I18nKey.APPS$STUDIO_PARENT_DIRECTORY)}
            >
              <CornerLeftUp size={12} />
            </button>
            <span className="arco-projectpicker__path" title={browsing.path}>
              {browsing.path}
            </span>
            <button
              className="arco-btn arco-btn--primary"
              onClick={() => void attachLocal(browsing.path)}
            >
              <T k={I18nKey.APPS$STUDIO_OPEN_THIS} />
            </button>
          </div>
          <div className="arco-projectpicker__dirs arco-scroll">
            {browsing.dirs.map((d) => (
              <button
                key={d.path}
                className="arco-projectpicker__item"
                onClick={() => void browse(d.path)}
                onDoubleClick={() => void attachLocal(d.path)}
              >
                {d.isRepo ? (
                  <FolderGit2 size={13} style={{ color: "var(--arco-accent)" }} />
                ) : (
                  <Folder size={13} />
                )}
                <span style={{ flex: 1 }}>{d.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(panel === "drive" || workspace.backend === "drive") && panel !== "browse" && panel !== "github" && (
        <div className="arco-projectpicker__browser">
          <div className="arco-projectpicker__browserbar">
            <button
              className="arco-btn arco-btn--icon"
              disabled={driveStack.length <= 1}
              onClick={() => {
                const next = driveStack.slice(0, -1);
                setDriveStack(next);
                const parent = next[next.length - 1]?.id ?? null;
                void loadDrive(parent);
              }}
              aria-label={i18n.t(I18nKey.APPS$STUDIO_PARENT_DIRECTORY)}
            >
              <CornerLeftUp size={12} />
            </button>
            <span className="arco-projectpicker__path">
              {driveStack.map((s) => s.name).join(" / ")}
            </span>
          </div>
          <div className="arco-projectpicker__dirs arco-scroll">
            {driveEntries.length === 0 && (
              <div className="arco-empty">No folders</div>
            )}
            {driveEntries.map((e) => (
              <div key={e.id} className="arco-projectpicker__row">
                <button
                  className="arco-projectpicker__item"
                  onClick={() => {
                    setDriveStack((s) => [...s, { id: e.id, name: e.name }]);
                    void loadDrive(e.id);
                  }}
                >
                  <Folder size={13} />
                  <span style={{ flex: 1 }}>{e.name}</span>
                </button>
                <button
                  className="arco-btn arco-btn--primary"
                  style={{ marginRight: 4, padding: "4px 8px", fontSize: 11 }}
                  onClick={() => void attachDrive(e)}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {panel === "github" && (
        <div className="arco-projectpicker__github">
          <div className="arco-projectpicker__browserbar">
            <button
              className="arco-btn arco-btn--icon"
              onClick={() => setPanel("menu")}
              aria-label={i18n.t(I18nKey.COMMON$BACK)}
            >
              <ChevronLeft size={12} />
            </button>
            <span className="arco-projectpicker__githubtitle">
              <T k={I18nKey.APPS$STUDIO_OPEN_FROM_GITHUB} />
            </span>
          </div>
          {!github.isConnected ? (
            <GitHubConnectCard connection={github} variant="inline" showRepoHint={false} />
          ) : (
            <>
              <label className="arco-projectpicker__field">
                <span>
                  <T k={I18nKey.COMMON$SEARCH} />
                </span>
                <input
                  className="arco-input"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  disabled={cloning}
                />
              </label>
              <div className="arco-projectpicker__dirs arco-scroll">
                {loadingRepos && (
                  <div className="arco-empty">
                    <Loader2 size={14} className="arco-spin" />
                  </div>
                )}
                {githubRepos.map((repo) => (
                  <button
                    key={repo.fullName}
                    className="arco-projectpicker__item"
                    disabled={cloning}
                    onClick={() => {
                      setCloning(true);
                      void api
                        .cloneGitRepo(repo.fullName, repo.defaultBranch)
                        .then((p) => openFolder(p.path))
                        .then(() => setMenu(null))
                        .catch((err) =>
                          setError(err instanceof Error ? err.message : "Clone failed"),
                        )
                        .finally(() => setCloning(false));
                    }}
                  >
                    <FolderGit2 size={13} />
                    <span style={{ flex: 1 }}>{repo.fullName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <label className="arco-projectpicker__field">
            <span>
              <T k={I18nKey.APPS$STUDIO_GITHUB_REPO_LABEL} />
            </span>
            <input
              className="arco-input"
              value={repoRef}
              onChange={(e) => setRepoRef(e.target.value)}
              disabled={cloning}
            />
          </label>
          <label className="arco-projectpicker__field">
            <span>
              <T k={I18nKey.APPS$STUDIO_GITHUB_BRANCH_LABEL} />
            </span>
            <input
              className="arco-input"
              value={repoBranch}
              onChange={(e) => setRepoBranch(e.target.value)}
              disabled={cloning}
            />
          </label>
          <button
            className="arco-btn arco-btn--primary arco-projectpicker__clonebtn"
            disabled={!repoRef.trim() || cloning}
            onClick={() => void cloneGitHub()}
          >
            {cloning ? <Loader2 size={13} className="arco-spin" /> : <Github size={13} />}
            <T k={I18nKey.APPS$STUDIO_GITHUB_CLONE_OPEN} />
          </button>
        </div>
      )}

      {error && <div className="arco-projectpicker__error">{error}</div>}
    </div>
  );

  return (
    <div className="arco-workspacechrome" ref={rootRef}>
      {/* Backend chip */}
      <div className="arco-workspacechrome__chipwrap">
        <button
          type="button"
          className="arco-workspacechrome__chip"
          onClick={() => openMenu(menu === "backend" ? null : "backend")}
          aria-expanded={menu === "backend"}
        >
          {backendIcon(displayBackend, iconSize)}
          <span>{backendLabel(displayBackend, activeProfile?.name)}</span>
          <ChevronDown size={10} />
        </button>
        {menu === "backend" && (
          <div className="arco-projectpicker__menu arco-workspacechrome__menu" role="listbox">
            <button
              className="arco-projectpicker__item"
              onClick={() => void setBackend("local")}
            >
              <Laptop size={13} />
              <span style={{ flex: 1 }}>Local</span>
              {displayBackend === "local" && <Check size={13} />}
            </button>
            <button
              className="arco-projectpicker__item"
              onClick={() => void setBackend("drive")}
            >
              <HardDrive size={13} />
              <span style={{ flex: 1 }}>Drive</span>
              {displayBackend === "drive" && <Check size={13} />}
            </button>
            {profiles.length === 0 ? (
              <div className="arco-projectpicker__hint">No remote servers saved</div>
            ) : (
              profiles.map((p) => (
                <button
                  key={p.id}
                  className="arco-projectpicker__item"
                  onClick={() => void setBackend("remote", p.id)}
                >
                  <Cloud size={13} />
                  <span style={{ flex: 1 }}>{p.name}</span>
                  {displayBackend === "remote" && activeProfile?.id === p.id && (
                    <Check size={13} />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Primary folder */}
      <div className="arco-workspacechrome__chipwrap">
        <button
          type="button"
          className="arco-workspacechrome__chip"
          onClick={() => openMenu("primary", false)}
          aria-expanded={menu === "primary" && !addMode}
        >
          {primary ? <FolderGit2 size={iconSize} /> : <Folder size={iconSize} />}
          <span className="arco-workspacechrome__name">
            {primary ? primary.name : SANDBOX_LABEL}
          </span>
          <ChevronDown size={10} />
        </button>
        {menu === "primary" && !addMode && renderFolderMenu()}
      </div>

      {/* Branch + worktree (Local only) */}
      {showGit && (
        <div className="arco-workspacechrome__chipwrap">
          <div className="arco-workspacechrome__chip arco-workspacechrome__chip--git">
            <button
              type="button"
              className="arco-workspacechrome__chipseg"
              onClick={() => openMenu(menu === "branch" ? null : "branch")}
              aria-expanded={menu === "branch"}
              aria-haspopup="listbox"
            >
              <GitBranch size={iconSize} />
              <span className="arco-workspacechrome__name">{branchName || "—"}</span>
              <ChevronDown size={10} />
            </button>
            <span className="arco-workspacechrome__sep" aria-hidden="true" />
            <button
              type="button"
              className="arco-workspacechrome__chipseg"
              onClick={() => void toggleWorktree()}
              disabled={gitBusy}
              aria-pressed={!!workspace.worktreePath}
              title={
                workspace.worktreePath
                  ? `Using worktree: ${workspace.worktreePath}`
                  : "Activate a worktree"
              }
            >
              {workspace.worktreePath ? (
                <SquareCheck size={11} />
              ) : (
                <Square size={11} />
              )}
              <span>worktree</span>
            </button>
          </div>
          {menu === "branch" && (
            <div className="arco-projectpicker__menu arco-workspacechrome__menu" role="listbox">
              <div className="arco-workspacechrome__branchsearch">
                <Input
                  ref={branchSearchRef}
                  value={branchQuery}
                  onChange={(e) => setBranchQuery(e.target.value)}
                  placeholder="Search branches"
                  aria-label="Search branches"
                  startSlot={<Search size={12} aria-hidden="true" />}
                />
              </div>
              <div className="arco-projectpicker__dirs arco-scroll" style={{ maxHeight: 200 }}>
                {filteredBranches.length === 0 && (
                  <div className="arco-empty">No branches</div>
                )}
                {filteredBranches.map((b) => (
                  <button
                    key={b.name}
                    className="arco-projectpicker__item"
                    disabled={gitBusy}
                    role="option"
                    aria-selected={b.current || b.name === branchName}
                    onClick={() => void checkout(b.name)}
                  >
                    <GitBranch size={13} />
                    <span style={{ flex: 1 }}>{b.name}</span>
                    {(b.current || b.name === branchName) && <Check size={13} />}
                  </button>
                ))}
              </div>
              {error && <div className="arco-projectpicker__error">{error}</div>}
            </div>
          )}
        </div>
      )}

      {/* Surface worktree toggle errors even when the branch menu is closed */}
      {showGit && error && menu !== "branch" && (
        <span className="arco-workspacechrome__inlineerror" title={error}>
          {error}
        </span>
      )}

      {/* Additional roots */}
      {additional.map((r: WorkspaceRoot) => (
        <div key={r.id} className="arco-workspacechrome__chipwrap">
          <span className="arco-workspacechrome__chip arco-workspacechrome__chip--extra">
            <Folder size={iconSize} />
            <span className="arco-workspacechrome__name">{r.name}</span>
            <button
              type="button"
              className="arco-workspacechrome__remove"
              aria-label={`Remove ${r.name}`}
              onClick={() => void api.removeWorkspaceRoot(r.id).then(applyWorkspace)}
            >
              <X size={10} />
            </button>
          </span>
        </div>
      ))}

      {/* Add folder */}
      <div className="arco-workspacechrome__chipwrap">
        <button
          type="button"
          className="arco-workspacechrome__chip arco-workspacechrome__chip--icon"
          title="Add another folder"
          aria-label="Add another folder"
          onClick={() => openMenu("add", true)}
        >
          <FolderPlus size={12} />
        </button>
        {menu === "add" && addMode && renderFolderMenu()}
      </div>
    </div>
  );
}
