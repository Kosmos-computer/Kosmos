import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * ProjectPicker — the Studio's "Open Folder" control (Cursor's folder-open,
 * server-side). A dropdown lists opened projects plus the built-in sandbox;
 * "Open folder…" expands into a directory browser fed by /api/fs/browse,
 * since a browser page can't read local paths from a native dialog.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CornerLeftUp,
  Folder,
  FolderGit2,
  FolderOpen,
  FolderSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import type { DirListing } from "@shared/types";
import { api } from "../../lib/api";
import { useStudioStore } from "./studioStore";

const SANDBOX_LABEL = "Sandbox";

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
  const [browsing, setBrowsing] = useState<DirListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  // Close on outside click — standard dropdown hygiene.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setBrowsing(null);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const active = projectsInfo.projects.find((p) => p.id === projectsInfo.activeId) ?? null;

  const browse = useCallback(async (path?: string) => {
    try {
      setBrowsing(await api.browseDirs(path));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot read directory");
    }
  }, []);

  const choose = useCallback(
    async (path: string) => {
      try {
        await openFolder(path);
        setOpen(false);
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

  const blocked = error !== null && error.includes("macOS is blocking");

  const iconSize = compact ? 11 : 13;
  const chevronSize = compact ? 10 : 12;

  return (
    <div className={`arco-projectpicker${compact ? " arco-projectpicker--compact" : ""}`} ref={rootRef}>
      <button
        className="arco-btn"
        onClick={() => {
          setOpen((v) => !v);
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
          {!browsing ? (
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
              <button className="arco-projectpicker__item" onClick={() => void nativePick()}>
                <FolderSearch size={13} /><T k={I18nKey.APPS$STUDIO_CHOOSE_IN_FINDER} /></button>
              <button className="arco-projectpicker__item" onClick={() => void browse()}>
                <FolderOpen size={13} /><T k={I18nKey.APPS$STUDIO_BROWSE} /></button>
            </>
          ) : (
            <div className="arco-projectpicker__browser">
              <div className="arco-projectpicker__browserbar">
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
                ><T k={I18nKey.APPS$STUDIO_OPEN_THIS} /></button>
              </div>
              <div className="arco-projectpicker__dirs arco-scroll">
                {browsing.dirs.length === 0 && <div className="arco-empty"><T k={I18nKey.APPS$STUDIO_NO_SUBFOLDERS} /></div>}
                {browsing.dirs.map((d) => (
                  <button
                    key={d.path}
                    className="arco-projectpicker__item"
                    onClick={() => void browse(d.path)}
                    onDoubleClick={() => void choose(d.path)}
                  >
                    {d.isRepo ? <FolderGit2 size={13} style={{ color: "var(--arco-accent)" }} /> : <Folder size={13} />}
                    <span style={{ flex: 1 }}>{d.name}</span>
                    {d.isRepo && <span className="arco-projectpicker__repotag"><T k={I18nKey.APPS$STUDIO_GIT} /></span>}
                  </button>
                ))}
              </div>
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
                  <ShieldCheck size={13} /><T k={I18nKey.APPS$STUDIO_GRANT_ACCESS_IN_SYSTEM_SETTINGS} /></button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
