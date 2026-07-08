import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * ProjectPicker — the Studio's "Open Folder" control (Cursor's folder-open,
 * server-side). A dropdown lists opened projects plus the built-in sandbox;
 * hosted backends get in-app browse + GitHub clone; macOS desktop also gets
 * a native Finder picker.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CornerLeftUp,
  Folder,
  FolderGit2,
  FolderOpen,
  FolderSearch,
  Github,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import type { DirListing, WorkspaceFeatures } from "@shared/types";
import { api } from "../../lib/api";
import { useStudioStore } from "./studioStore";

const SANDBOX_LABEL = "Sandbox";

type PickerPanel = "menu" | "browse" | "github";

export interface ProjectPickerProps {
  /** Smaller trigger for the composer status row. */
  compact?: boolean;
}

export function ProjectPicker({ compact }: ProjectPickerProps) {
  const projectsInfo = useStudioStore((s) => s.projectsInfo);
  const refreshProjects = useStudioStore((s) => s.refreshProjects);
  const switchProject = useStudioStore((s) => s.switchProject);
  const openFolder = useStudioStore((s) => s.openFolder);

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<PickerPanel>("menu");
  const [browsing, setBrowsing] = useState<DirListing | null>(null);
  const [features, setFeatures] = useState<WorkspaceFeatures | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repoRef, setRepoRef] = useState("");
  const [repoBranch, setRepoBranch] = useState("");
  const [cloning, setCloning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void refreshProjects();
    void api.workspaceFeatures().then(setFeatures).catch(() => setFeatures(null));
  }, [refreshProjects]);

  // Close on outside click — standard dropdown hygiene.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPanel("menu");
        setBrowsing(null);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const active = projectsInfo.projects.find((p) => p.id === projectsInfo.activeId) ?? null;

  const browse = useCallback(async (path?: string) => {
    try {
      const start = path ?? features?.defaultBrowsePath;
      setBrowsing(await api.browseDirs(start));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot read directory");
    }
  }, [features?.defaultBrowsePath]);

  const choose = useCallback(
    async (path: string) => {
      try {
        await openFolder(path);
        setOpen(false);
        setPanel("menu");
        setBrowsing(null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot open folder");
      }
    },
    [openFolder],
  );

  // Native Finder dialog — macOS attributes the choice to real user intent,
  // which is what triggers its folder-access consent prompt when needed.
  const nativePick = useCallback(async () => {
    try {
      const { path } = await api.nativePickFolder();
      await choose(path);
    } catch {
      // Dialog cancelled — nothing to report.
    }
  }, [choose]);

  const cloneGitHub = useCallback(async () => {
    const ref = repoRef.trim();
    if (!ref) return;
    setCloning(true);
    setError(null);
    try {
      const project = await api.cloneGitRepo(ref, repoBranch.trim() || undefined);
      await refreshProjects();
      await switchProject(project.id);
      setOpen(false);
      setPanel("menu");
      setRepoRef("");
      setRepoBranch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clone failed");
    } finally {
      setCloning(false);
    }
  }, [repoRef, repoBranch, refreshProjects, switchProject]);

  const blocked = error !== null && error.includes("macOS is blocking");
  const showNativePicker = features?.nativeFolderPicker ?? false;
  const showGitHubClone = features?.githubClone ?? true;

  const iconSize = compact ? 11 : 13;
  const chevronSize = compact ? 10 : 12;

  return (
    <div className={`arco-projectpicker${compact ? " arco-projectpicker--compact" : ""}`} ref={rootRef}>
      <button
        className="arco-btn"
        onClick={() => {
          setOpen((v) => !v);
          setPanel("menu");
          setBrowsing(null);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {active ? <FolderGit2 size={iconSize} /> : <Folder size={iconSize} />}
        <span className="arco-projectpicker__name">{active ? active.name : SANDBOX_LABEL}</span>
        {open ? <ChevronUp size={chevronSize} /> : <ChevronDown size={chevronSize} />}
      </button>

      {open && (
        <div className="arco-projectpicker__menu" role="listbox">
          {panel === "menu" && (
            <>
              <button
                className="arco-projectpicker__item"
                onClick={() => void switchProject(null).then(() => setOpen(false))}
              >
                <Folder size={13} />
                <span style={{ flex: 1 }}>{SANDBOX_LABEL}</span>
                {!active && <Check size={13} />}
              </button>
              {projectsInfo.projects.map((p) => (
                <div key={p.id} className="arco-projectpicker__row">
                  <button
                    className="arco-projectpicker__item"
                    title={p.path}
                    onClick={() => void switchProject(p.id).then(() => setOpen(false))}
                  >
                    <FolderGit2 size={13} />
                    <span style={{ flex: 1 }}>{p.name}</span>
                    {p.id === projectsInfo.activeId && <Check size={13} />}
                  </button>
                  <button
                    className="arco-projectpicker__remove"
                    aria-label={`Remove project ${p.name}`}
                    onClick={async () => {
                      await api.removeProject(p.id);
                      void refreshProjects();
                    }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <div className="arco-projectpicker__divider" />
              {features?.hosted && (
                <p className="arco-projectpicker__hint">
                  <T k={I18nKey.APPS$STUDIO_HOSTED_BROWSE_HINT} />
                </p>
              )}
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
              {showGitHubClone && (
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
                  onClick={() => void choose(browsing.path)}
                >
                  <T k={I18nKey.APPS$STUDIO_OPEN_THIS} />
                </button>
              </div>
              <div className="arco-projectpicker__dirs arco-scroll">
                {browsing.dirs.length === 0 && (
                  <div className="arco-empty">
                    <T k={I18nKey.APPS$STUDIO_NO_SUBFOLDERS} />
                  </div>
                )}
                {browsing.dirs.map((d) => (
                  <button
                    key={d.path}
                    className="arco-projectpicker__item"
                    onClick={() => void browse(d.path)}
                    onDoubleClick={() => void choose(d.path)}
                  >
                    {d.isRepo ? (
                      <FolderGit2 size={13} style={{ color: "var(--arco-accent)" }} />
                    ) : (
                      <Folder size={13} />
                    )}
                    <span style={{ flex: 1 }}>{d.name}</span>
                    {d.isRepo && (
                      <span className="arco-projectpicker__repotag">
                        <T k={I18nKey.APPS$STUDIO_GIT} />
                      </span>
                    )}
                  </button>
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
              <p className="arco-projectpicker__hint">
                <T k={I18nKey.APPS$STUDIO_GITHUB_CLONE_HINT} />
              </p>
              <label className="arco-projectpicker__field">
                <span>
                  <T k={I18nKey.APPS$STUDIO_GITHUB_REPO_LABEL} />
                </span>
                <input
                  className="arco-input"
                  value={repoRef}
                  onChange={(e) => setRepoRef(e.target.value)}
                  placeholder="owner/repo or https://github.com/owner/repo"
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
                  placeholder="main"
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

          {error && (
            <div className="arco-projectpicker__error">
              <div className="arco-chat__error">{error}</div>
              {blocked && (
                <button
                  className="arco-btn arco-btn--primary"
                  onClick={() => void api.openPrivacySettings()}
                >
                  <ShieldCheck size={13} />
                  <T k={I18nKey.APPS$STUDIO_GRANT_ACCESS_IN_SYSTEM_SETTINGS} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
