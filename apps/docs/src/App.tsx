/**
 * Docs — TipTap editor over os.files@1 / os.docs@1.
 */
import { useCallback, useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { createAppClient } from "/app-sdk.js";
import { DocEditor } from "@arco/editor-kit";
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

export function App() {
  const [os] = useState(() => createAppClient());
  const [docs, setDocs] = useState<FileEntry[]>([]);
  const [open, setOpen] = useState<OpenDoc | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      void os.shell.notify("Saved");
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [os, open, refreshList]);

  if (!os) {
    return <div className="docs-empty">Platform SDK unavailable.</div>;
  }

  if (!open) {
    return (
      <div className="docs-shell">
        <header className="docs-toolbar">
          <strong>Docs</strong>
          <button type="button" className="docs-btn docs-btn--primary" onClick={() => void createDoc()}>
            New document
          </button>
        </header>
        {error ? <div className="docs-error">{error}</div> : null}
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
        <button type="button" className="docs-btn" onClick={() => { setOpen(null); location.hash = ""; }}>
          ← Back
        </button>
        <span className="docs-title">{open.name}</span>
        <button
          type="button"
          className="docs-btn docs-btn--primary"
          disabled={!dirty || saving}
          onClick={() => void saveDoc()}
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </header>
      {error ? <div className="docs-error">{error}</div> : null}
      <DocEditor
        content={open.doc}
        onChange={(doc) => {
          setOpen((prev) => (prev ? { ...prev, doc } : prev));
          setDirty(true);
        }}
      />
    </div>
  );
}
