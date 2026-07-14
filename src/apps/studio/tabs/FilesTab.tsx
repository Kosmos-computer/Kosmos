import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { T } from "../../../i18n/T";
/**
 * FilesTab — workspace tree beside a Monaco editor (the Studio's "full
 * editing" surface). The tree lazily lists directories on expand, refetches
 * open directories whenever the agent writes files, and honors selection
 * requests from the Diffs tab and the agent's open_workspace_tab action.
 */
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, FileText, Folder, RotateCw, Save } from "lucide-react";
import type { WorkspaceEntry } from "@shared/types";
import { api } from "../../../lib/api";
import { useOsStore } from "../../../os/osStore";
import { useStudioStore, useSessionActivity } from "../studioStore";

const CodeEditor = lazy(() => import("../editor/CodeEditor"));

interface OpenFile {
  path: string;
  content: string;
  dirty: boolean;
}

export function FilesTab() {
  const theme = useOsStore((s) => s.theme);
  const { filesVersion, changes } = useSessionActivity();
  const requestedPath = useStudioStore((s) => s.requestedPath);
  const requestFile = useStudioStore((s) => s.requestFile);
  const workspace = useStudioStore((s) => s.workspace);

  const [dirs, setDirs] = useState<Record<string, WorkspaceEntry[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["."]));
  const [file, setFile] = useState<OpenFile | null>(null);
  const [saving, setSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // Directory loading
  //
  // One listing per expanded directory. `loadDir` is stable so effects can
  // depend on it without refetch storms.
  // ---------------------------------------------------------------------------

  const loadDir = useCallback(async (path: string) => {
    try {
      const entries = await api.listFiles(path);
      setDirs((d) => ({ ...d, [path]: entries }));
    } catch {
      // Directory vanished (agent deleted it) — drop the stale listing.
      setDirs((d) => {
        const next = { ...d };
        delete next[path];
        return next;
      });
    }
  }, []);

  useEffect(() => {
    setDirs({});
    setExpanded(new Set(["."]));
    setFile(null);
    void loadDir(".");
  }, [loadDir, workspace.backend, workspace.roots.map((r) => r.id).join(","), workspace.worktreePath]);

  // Agent wrote files → refresh every directory currently on screen.
  useEffect(() => {
    for (const path of expanded) void loadDir(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesVersion]);

  const toggleDir = useCallback(
    (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          if (!dirs[path]) void loadDir(path);
        }
        return next;
      });
    },
    [dirs, loadDir],
  );

  // ---------------------------------------------------------------------------
  // File open / save
  // ---------------------------------------------------------------------------

  const openFile = useCallback(async (path: string) => {
    try {
      const data = await api.readFile(path);
      setFile({ path: data.path, content: data.content, dirty: false });
    } catch {
      // File may not exist yet — ignore.
    }
  }, []);

  const save = useCallback(async () => {
    if (!file || !file.dirty || saving) return;
    setSaving(true);
    try {
      await api.writeFile(file.path, file.content);
      setFile((f) => (f ? { ...f, dirty: false } : f));
    } finally {
      setSaving(false);
    }
  }, [file, saving]);

  // Honor selection requests (Diffs tab "open", agent open_workspace_tab):
  // expand ancestor directories so the tree shows where the file lives.
  useEffect(() => {
    if (!requestedPath) return;
    requestFile(null);
    const parts = requestedPath.split("/").slice(0, -1);
    setExpanded((prev) => {
      const next = new Set(prev);
      let acc = "";
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        next.add(acc);
        if (!dirs[acc]) void loadDir(acc);
      }
      return next;
    });
    void openFile(requestedPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedPath]);

  // If the agent rewrites the currently open file (and there are no local
  // edits), reload it so the editor tracks the workspace.
  const openPathRef = useRef<string | null>(null);
  openPathRef.current = file?.path ?? null;
  useEffect(() => {
    const openPath = openPathRef.current;
    if (openPath && changes[openPath] && file && !file.dirty) {
      void openFile(openPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changes]);

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  const renderDir = (path: string, depth: number) => {
    const entries = dirs[path];
    if (!entries) return null;
    return entries.map((entry) => {
      const isChanged = Boolean(changes[entry.path]);
      if (entry.type === "dir") {
        const open = expanded.has(entry.path);
        return (
          <div key={entry.path}>
            <button
              className="arco-studio__treerow"
              style={{ paddingLeft: 8 + depth * 14 }}
              onClick={() => toggleDir(entry.path)}
              aria-expanded={open}
            >
              <ChevronRight
                size={11}
                className="arco-studio__treechevron"
                style={{ transform: open ? "rotate(90deg)" : undefined }}
              />
              <Folder size={13} style={{ color: "var(--arco-accent)" }} />
              <span className="arco-studio__treename">{entry.name}</span>
            </button>
            {open && renderDir(entry.path, depth + 1)}
          </div>
        );
      }
      return (
        <button
          key={entry.path}
          className={`arco-studio__treerow ${file?.path === entry.path ? "arco-studio__treerow--active" : ""}`}
          style={{ paddingLeft: 8 + depth * 14 + 13 }}
          onClick={() => void openFile(entry.path)}
        >
          <FileText size={13} style={{ color: "var(--arco-text-tertiary)" }} />
          <span className="arco-studio__treename">{entry.name}</span>
          {isChanged && <span className="arco-studio__changedot" title={i18n.t(I18nKey.APPS$STUDIO_CHANGED_BY_AGENT)} />}
        </button>
      );
    });
  };

  return (
    <div className="arco-studio__files">
      <div className="arco-studio__tree arco-scroll">
        <div className="arco-studio__treeheader">
          <span className="arco-label"><T k={I18nKey.APPS$STUDIO_WORKSPACE} /></span>
          <button className="arco-btn arco-btn--icon" onClick={() => void loadDir(".")} aria-label={i18n.t(I18nKey.APPS$STUDIO_REFRESH_TREE)}>
            <RotateCw size={12} />
          </button>
        </div>
        {(dirs["."] ?? []).length === 0 && (
          <div className="arco-empty" style={{ padding: "var(--arco-space-m)" }}><T k={I18nKey.APPS$STUDIO_EMPTY_WORKSPACE} /></div>
        )}
        {renderDir(".", 0)}
      </div>

      <div className="arco-studio__editorpane">
        {file ? (
          <>
            <div className="arco-studio__editorbar">
              <span className="arco-studio__editorpath">
                {file.path}
                {file.dirty && (
                  /* eslint-disable-next-line i18next/no-literal-string -- dirty file indicator */
                  <span className="arco-studio__dirty">●</span>
                )}
              </span>
              <button
                className="arco-btn arco-btn--primary"
                disabled={!file.dirty || saving}
                onClick={() => void save()}
              >
                <Save size={13} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <div className="arco-studio__editorhost">
              <Suspense fallback={<div className="arco-empty"><T k={I18nKey.APPS$STUDIO_LOADING_EDITOR} /></div>}>
                <CodeEditor
                  path={file.path}
                  value={file.content}
                  theme={theme}
                  onChange={(content) =>
                    setFile((f) => (f && content !== f.content ? { ...f, content, dirty: true } : f))
                  }
                  onSave={() => void save()}
                />
              </Suspense>
            </div>
          </>
        ) : (
          <div className="arco-empty"><T k={I18nKey.APPS$STUDIO_SELECT_A_FILE_TO_EDIT} /></div>
        )}
      </div>
    </div>
  );
}
