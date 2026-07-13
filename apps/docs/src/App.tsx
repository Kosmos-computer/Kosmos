/**
 * Docs — TipTap editor over os.files@1 / os.docs@1 with import/export and autosave.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { createAppClient } from "/app-sdk.js";
import {
  DocEditor,
  applyBlockFormat,
  setTextAlign,
  toggleTextMark,
  useEditorToolbar,
} from "@arco/editor-kit";
import { EMPTY_DOC_JSON } from "@shared/capabilities/docs";
import { DOC_MIME } from "@shared/capabilities/files";

interface AppClient {
  intents: { invoke: (intent: string, params?: Record<string, unknown>) => Promise<unknown> };
  shell: { notify: (message: string) => Promise<unknown> };
  events: { on: (topic: string, fn: () => void) => () => void };
}

interface FileEntry {
  id: string;
  name: string;
  mimeType: string;
  updatedAt: string;
  trashed?: boolean;
}

interface OpenDoc {
  id: string;
  name: string;
  doc: JSONContent;
}

function readFileIdFromUrl(): string | null {
  const hash = location.hash.match(/file=([^&]+)/)?.[1];
  if (hash) return decodeURIComponent(hash);
  return new URLSearchParams(location.search).get("fileId");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function App() {
  const [os] = useState(() => createAppClient());
  const [docs, setDocs] = useState<FileEntry[]>([]);
  const [open, setOpen] = useState<OpenDoc | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  const toolbar = useEditorToolbar(editor, Boolean(open));

  const refreshList = useCallback(async () => {
    if (!os) return;
    try {
      const all = (await os.intents.invoke("files.list", {})) as FileEntry[];
      setDocs(all.filter((f) => f.mimeType === DOC_MIME && !f.trashed));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list documents");
    }
  }, [os]);

  const openDoc = useCallback(
    async (id: string) => {
      if (!os) return;
      try {
        const result = (await os.intents.invoke("docs.open", { id })) as {
          id: string;
          name: string;
          doc: JSONContent;
        };
        setOpen({ id: result.id, name: result.name, doc: result.doc });
        setDirty(false);
        setWarnings([]);
        setError(null);
        location.hash = `file=${encodeURIComponent(id)}`;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to open document");
      }
    },
    [os],
  );

  useEffect(() => {
    if (!os) return;
    void refreshList();
    const initial = readFileIdFromUrl();
    if (initial) void openDoc(initial);
    return os.events.on("files.changed", () => void refreshList());
  }, [os, refreshList, openDoc]);

  const saveDoc = useCallback(async () => {
    if (!os || !open) return;
    setSaving(true);
    try {
      await os.intents.invoke("files.content.write", {
        id: open.id,
        content: JSON.stringify(open.doc),
      });
      setDirty(false);
      setError(null);
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [os, open, refreshList]);

  useEffect(() => {
    if (!dirty || !open) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      void saveDoc();
    }, 1200);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [dirty, open, saveDoc]);

  const createDoc = useCallback(async () => {
    if (!os) return;
    const name = prompt("Document name:", "Untitled.doc.json");
    if (!name?.trim()) return;
    try {
      const created = (await os.intents.invoke("docs.create", {
        name: name.trim(),
        content: EMPTY_DOC_JSON,
      })) as FileEntry;
      await refreshList();
      await openDoc(created.id);
      void os.shell.notify(`Created ${created.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document");
    }
  }, [os, refreshList, openDoc]);

  const exportDoc = useCallback(
    async (format: "markdown" | "html" | "odt" | "docx" | "json") => {
      if (!os || !open) return;
      try {
        const result = (await os.intents.invoke("docs.export", { id: open.id, format })) as {
          content?: string;
          contentBase64?: string;
          filenameExt?: string;
          warnings?: string[];
        };
        if (result.warnings?.length) setWarnings(result.warnings);
        if (result.content && (format === "markdown" || format === "html" || format === "json")) {
          const blob = new Blob([result.content], {
            type: format === "html" ? "text/html" : format === "json" ? "application/json" : "text/markdown",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${open.name.replace(/\.doc\.json$/i, "")}.${result.filenameExt ?? format}`;
          a.click();
          URL.revokeObjectURL(url);
        } else if (result.contentBase64) {
          const bin = Uint8Array.from(atob(result.contentBase64), (c) => c.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bin]));
          const a = document.createElement("a");
          a.href = url;
          a.download = `${open.name.replace(/\.doc\.json$/i, "")}.${result.filenameExt ?? format}`;
          a.click();
          URL.revokeObjectURL(url);
        }
        void os.shell.notify(`Exported as ${format}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      }
    },
    [os, open],
  );

  const importDoc = useCallback(
    async (file: File) => {
      if (!os) return;
      const lower = file.name.toLowerCase();
      const format = lower.endsWith(".docx")
        ? "docx"
        : lower.endsWith(".odt")
          ? "odt"
          : lower.endsWith(".html") || lower.endsWith(".htm")
            ? "html"
            : lower.endsWith(".md") || lower.endsWith(".markdown")
              ? "markdown"
              : null;
      if (!format) {
        setError("Unsupported import format");
        return;
      }
      try {
        const contentBase64 = await fileToBase64(file);
        const created = (await os.intents.invoke("docs.import", {
          name: file.name,
          format,
          contentBase64,
        })) as FileEntry & { warnings?: string[] };
        if (created.warnings?.length) setWarnings(created.warnings);
        await refreshList();
        await openDoc(created.id);
        void os.shell.notify(`Imported ${created.name}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    },
    [os, openDoc, refreshList],
  );

  if (!os) {
    return <div className="docs-empty">Platform SDK unavailable.</div>;
  }

  if (!open) {
    return (
      <div className="docs-shell">
        <header className="docs-toolbar">
          <strong>Docs</strong>
          <label className="docs-btn">
            Import
            <input
              type="file"
              accept=".md,.markdown,.html,.htm,.odt,.docx"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importDoc(file);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" className="docs-btn docs-btn--primary" onClick={() => void createDoc()}>
            New document
          </button>
        </header>
        {error ? <div className="docs-error">{error}</div> : null}
        {warnings.length ? (
          <div className="docs-warnings">
            {warnings.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
        ) : null}
        <div className="docs-list">
          {docs.length === 0 ? (
            <div className="docs-empty">No documents yet — create one or ask the agent.</div>
          ) : (
            docs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className="docs-row"
                onClick={() => void openDoc(doc.id)}
              >
                <span className="docs-row__name">{doc.name}</span>
                <span className="docs-row__meta">{new Date(doc.updatedAt).toLocaleString()}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="docs-shell docs-shell--editor">
      <header className="docs-toolbar">
        <button
          type="button"
          className="docs-btn"
          onClick={() => {
            setOpen(null);
            location.hash = "";
          }}
        >
          ← Back
        </button>
        <span className="docs-title">{open.name}</span>
        <select
          className="docs-btn"
          defaultValue=""
          onChange={(e) => {
            const format = e.target.value as "markdown" | "html" | "odt" | "docx" | "json";
            if (format) void exportDoc(format);
            e.target.value = "";
          }}
          aria-label="Export format"
        >
          <option value="" disabled>
            Export…
          </option>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="odt">ODT</option>
          <option value="docx">DOCX</option>
          <option value="json">JSON</option>
        </select>
        <button
          type="button"
          className="docs-btn docs-btn--primary"
          disabled={!dirty || saving}
          onClick={() => void saveDoc()}
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </header>
      {editor ? (
        <div className="docs-format-bar" role="toolbar" aria-label="Formatting">
          <button type="button" className="docs-btn" onClick={() => applyBlockFormat(editor, "heading1")}>
            H1
          </button>
          <button type="button" className="docs-btn" onClick={() => applyBlockFormat(editor, "heading2")}>
            H2
          </button>
          <button type="button" className="docs-btn" onClick={() => toggleTextMark(editor, "bold")}>
            B
          </button>
          <button type="button" className="docs-btn" onClick={() => toggleTextMark(editor, "italic")}>
            I
          </button>
          <button type="button" className="docs-btn" onClick={() => setTextAlign(editor, "left")}>
            Left
          </button>
          <button type="button" className="docs-btn" onClick={() => setTextAlign(editor, "center")}>
            Center
          </button>
          <button
            type="button"
            className="docs-btn"
            onClick={() => {
              const href = window.prompt("Link URL", editor.getAttributes("link").href ?? "https://");
              if (href === null) return;
              if (!href) editor.chain().focus().unsetLink().run();
              else editor.chain().focus().setLink({ href }).run();
            }}
          >
            Link
          </button>
          <button
            type="button"
            className="docs-btn"
            onClick={() => {
              const src = window.prompt("Image URL");
              if (src?.trim()) editor.chain().focus().setImage({ src: src.trim() }).run();
            }}
          >
            Image
          </button>
          <button
            type="button"
            className="docs-btn"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            Table
          </button>
          <span className="docs-format-meta">{toolbar.blockFormat}</span>
        </div>
      ) : null}
      {error ? <div className="docs-error">{error}</div> : null}
      {warnings.length ? (
        <div className="docs-warnings">
          {warnings.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      ) : null}
      <DocEditor
        content={open.doc}
        onEditorReady={setEditor}
        onChange={(doc) => {
          setOpen((prev) => (prev ? { ...prev, doc } : prev));
          setDirty(true);
        }}
      />
    </div>
  );
}
