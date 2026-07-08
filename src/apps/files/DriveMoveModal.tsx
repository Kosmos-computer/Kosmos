import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Folder, X } from "lucide-react";
import type { FileEntry } from "@shared/capabilities/files";
import { FOLDER_MIME } from "@shared/capabilities/files";
import { Button } from "../../components/ui";
import { api } from "../../lib/api";

interface FolderCrumb {
  id: string | null;
  label: string;
}

export interface DriveMoveModalProps {
  open: boolean;
  itemName: string;
  itemId: string;
  onClose: () => void;
  onMove: (parentId: string | null) => Promise<void>;
}

export function DriveMoveModal({ open, itemName, itemId, onClose, onMove }: DriveMoveModalProps) {
  const [path, setPath] = useState<FolderCrumb[]>([{ id: null, label: "My Drive" }]);
  const [folders, setFolders] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFolderId = path[path.length - 1]?.id ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await api.listDriveEntries({ parentId: currentFolderId });
      setFolders(entries.filter((entry) => entry.mimeType === FOLDER_MIME && entry.id !== itemId));
      setError(null);
    } catch (err) {
      setFolders([]);
      setError(err instanceof Error ? err.message : "Could not load folders");
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, itemId]);

  useEffect(() => {
    if (!open) return;
    setPath([{ id: null, label: "My Drive" }]);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  if (!open) return null;

  async function handleMoveHere() {
    setMoving(true);
    try {
      await onMove(currentFolderId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move item");
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="arco-task-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-task-modal"
        role="dialog"
        aria-labelledby="drive-move-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-task-modal__header">
          <h2 id="drive-move-title">Move “{itemName}”</h2>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </Button>
        </header>

        <div className="arco-task-modal__body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <nav aria-label="Folder path" style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: "var(--arco-text-sm)" }}>
            {path.map((crumb, index) => (
              <span key={`${crumb.id ?? "root"}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {index > 0 ? <ChevronRight size={12} /> : null}
                <button
                  type="button"
                  disabled={index === path.length - 1}
                  onClick={() => setPath(path.slice(0, index + 1))}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: index === path.length - 1 ? "default" : "pointer",
                    color: index === path.length - 1 ? "var(--arco-text)" : "var(--arco-accent)",
                  }}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </nav>

          {error ? (
            <p style={{ margin: 0, color: "var(--arco-danger)", fontSize: "var(--arco-text-sm)" }}>{error}</p>
          ) : null}

          <div
            className="arco-scroll"
            style={{
              maxHeight: 240,
              overflow: "auto",
              border: "1px solid var(--arco-border)",
              borderRadius: "var(--arco-radius-sm)",
            }}
          >
            {loading ? (
              <p style={{ margin: 12, fontSize: "var(--arco-text-sm)", color: "var(--arco-text-muted)" }}>Loading…</p>
            ) : folders.length === 0 ? (
              <p style={{ margin: 12, fontSize: "var(--arco-text-sm)", color: "var(--arco-text-muted)" }}>
                No subfolders here.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {folders.map((folder) => (
                  <li key={folder.id}>
                    <button
                      type="button"
                      onClick={() => setPath((prev) => [...prev, { id: folder.id, label: folder.name }])}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <Folder size={15} />
                      {folder.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="arco-task-modal__footer">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={moving} onClick={() => void handleMoveHere()}>
            {moving ? "Moving…" : "Move here"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
