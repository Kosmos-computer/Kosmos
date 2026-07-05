/**
 * Files — the agent's workspace browser: directory listing, file viewer with
 * inline editing (the same files generated apps read via Query("read")).
 */
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, Folder, Save } from "lucide-react";
import type { WorkspaceEntry } from "@shared/types";
import { api } from "../../lib/api";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FilesApp() {
  const [dir, setDir] = useState(".");
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [file, setFile] = useState<{ path: string; content: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (path: string) => {
    try {
      setEntries(await api.listFiles(path));
      setDir(path);
    } catch {
      // Directory may have been deleted — stay put.
    }
  }, []);

  useEffect(() => {
    void refresh(".");
  }, [refresh]);

  const openEntry = useCallback(
    async (entry: WorkspaceEntry) => {
      if (entry.type === "dir") {
        void refresh(entry.path);
      } else {
        const data = await api.readFile(entry.path);
        setFile(data);
        setDirty(false);
      }
    },
    [refresh],
  );

  const save = useCallback(async () => {
    if (!file) return;
    setSaving(true);
    try {
      await api.writeFile(file.path, file.content);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [file]);

  if (file) {
    return (
      <div className="arco-panel" style={{ gap: 8 }}>
        <div className="arco-panel__header">
          <button className="arco-btn" onClick={() => setFile(null)}>
            <ArrowLeft size={13} /> Back
          </button>
          <span style={{ flex: 1, fontFamily: "var(--arco-font-mono)", fontSize: "var(--arco-text-sm)" }}>
            {file.path}
          </span>
          <button className="arco-btn arco-btn--primary" disabled={!dirty || saving} onClick={() => void save()}>
            <Save size={13} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <textarea
          className="arco-code-editor arco-scroll"
          value={file.content}
          onChange={(e) => {
            setFile((f) => (f ? { ...f, content: e.target.value } : f));
            setDirty(true);
          }}
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="arco-panel arco-scroll">
      <div className="arco-panel__header">
        <strong style={{ fontFamily: "var(--arco-font-mono)", fontSize: "var(--arco-text-sm)" }}>
          workspace/{dir === "." ? "" : dir}
        </strong>
        {dir !== "." && (
          <button
            className="arco-btn"
            onClick={() => void refresh(dir.split("/").slice(0, -1).join("/") || ".")}
          >
            <ArrowLeft size={13} /> Up
          </button>
        )}
      </div>
      {entries.length === 0 && (
        <div className="arco-empty">Empty — the agent writes scripts and data here.</div>
      )}
      {entries.map((entry) => (
        <button key={entry.path} className="arco-listrow arco-listrow--button" onClick={() => void openEntry(entry)}>
          {entry.type === "dir" ? (
            <Folder size={15} style={{ color: "var(--arco-accent)" }} />
          ) : (
            <FileText size={15} style={{ color: "var(--arco-text-tertiary)" }} />
          )}
          <span style={{ flex: 1, textAlign: "left", fontSize: "var(--arco-text-sm)" }}>{entry.name}</span>
          <span className="arco-listrow__sub">
            {entry.type === "file" ? formatSize(entry.size) : ""}
          </span>
        </button>
      ))}
    </div>
  );
}
