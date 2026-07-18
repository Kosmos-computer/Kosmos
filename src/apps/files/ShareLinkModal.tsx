import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, Trash2, X } from "lucide-react";
import type { ShareCreateInput, ShareRecord } from "@shared/capabilities/shares";
import { Button, Input } from "../../components/ui";
import { api } from "../../lib/api";
import type { DriveFileItem } from "./types";

type ShareWithUrl = ShareRecord & { url: string };

export interface ShareLinkModalProps {
  file: DriveFileItem;
  open: boolean;
  onClose: () => void;
}

export function ShareLinkModal({ file, open, onClose }: ShareLinkModalProps) {
  const [shares, setShares] = useState<ShareWithUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [mode, setMode] = useState<"download" | "view">("download");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api.listShares(file.id);
      setShares(next);
      setError(null);
    } catch (err) {
      setShares([]);
      setError(err instanceof Error ? err.message : "Could not load shares");
    } finally {
      setLoading(false);
    }
  }, [file.id]);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setExpiresAt("");
    setMode("download");
    setCopiedId(null);
    void refresh();
  }, [open, refresh]);

  if (!open) return null;

  async function handleCreate() {
    setCreating(true);
    try {
      const input: ShareCreateInput = {
        fileId: file.id,
        mode,
        allowDownload: mode !== "view",
        ...(password.trim() ? { password: password.trim() } : {}),
        ...(expiresAt.trim() ? { expiresAt: expiresAt.trim() } : {}),
      };
      await api.createShare(input);
      setPassword("");
      setExpiresAt("");
      await refresh();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create share link");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await api.revokeShare(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke share");
    }
  }

  async function handleCopy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy link to clipboard");
    }
  }

  return (
    <div className="arco-task-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-task-modal"
        role="dialog"
        aria-labelledby="share-link-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-task-modal__header">
          <h2 id="share-link-title">Share “{file.name}”</h2>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </Button>
        </header>

        <div className="arco-task-modal__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: "var(--arco-text-sm)", color: "var(--arco-text-muted)" }}>
            Create a public link. Recipients only see this item — not your session or the rest of Drive.
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <label className="arco-label" htmlFor="share-link-access">
                Access
              </label>
              <select
                id="share-link-access"
                className="arco-input"
                value={mode}
                onChange={(event) => setMode(event.target.value as "download" | "view")}
              >
                <option value="download">Download</option>
                <option value="view">View only</option>
              </select>
            </div>
            <div>
              <label className="arco-label" htmlFor="share-link-password">
                Password (optional)
              </label>
              <Input
                id="share-link-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
              />
            </div>
            <div>
              <label className="arco-label" htmlFor="share-link-expires">
                Expires (optional, YYYY-MM-DD)
              </label>
              <Input
                id="share-link-expires"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                placeholder="2026-12-31"
              />
            </div>
          </div>

          {error ? (
            <p style={{ margin: 0, color: "var(--arco-danger)", fontSize: "var(--arco-text-sm)" }}>{error}</p>
          ) : null}

          <div>
            <h3 style={{ margin: "0 0 8px", fontSize: "var(--arco-text-sm)" }}>Active links</h3>
            {loading ? (
              <p style={{ margin: 0, fontSize: "var(--arco-text-sm)", color: "var(--arco-text-muted)" }}>Loading…</p>
            ) : shares.length === 0 ? (
              <p style={{ margin: 0, fontSize: "var(--arco-text-sm)", color: "var(--arco-text-muted)" }}>
                No links yet.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {shares.map((share) => (
                  <li
                    key={share.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: 8,
                      border: "1px solid var(--arco-border)",
                      borderRadius: "var(--arco-radius-sm)",
                    }}
                  >
                    <Link2 size={14} />
                    <span style={{ flex: 1, fontSize: "var(--arco-text-xs)", wordBreak: "break-all" }}>
                      {share.url}
                    </span>
                    <Button variant="ghost" size="icon" aria-label="Copy link" onClick={() => void handleCopy(share.url, share.id)}>
                      <Copy size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Revoke link" onClick={() => void handleRevoke(share.id)}>
                      <Trash2 size={14} />
                    </Button>
                    {copiedId === share.id ? (
                      <span style={{ fontSize: "var(--arco-text-xs)", color: "var(--arco-text-muted)" }}>Copied</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="arco-task-modal__footer">
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" disabled={creating} onClick={() => void handleCreate()}>
            {creating ? "Creating…" : "Create link"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
