import { useCallback, useEffect, useMemo, useState } from "react";
import { FileAudio, FileVideo, Loader2, X } from "lucide-react";
import type { FileEntry } from "@shared/capabilities/files";
import { api } from "../../lib/api";
import { Button } from "../../components/ui";
import { ListSearch } from "../../components/patterns";

const MEDIA_EXT = /\.(mp3|m4a|wav|aac|ogg|flac|webm|mp4|mov|mkv)$/i;

function isMediaEntry(entry: FileEntry): boolean {
  if (entry.mimeType.startsWith("audio/") || entry.mimeType.startsWith("video/")) return true;
  return MEDIA_EXT.test(entry.name);
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

interface LongformerDrivePickerModalProps {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onPick: (file: File) => void;
}

/** Pick an audio/video file from Arco Files for transcription. */
export function LongformerDrivePickerModal({
  open,
  busy = false,
  onClose,
  onPick,
}: LongformerDrivePickerModalProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError(null);
    setPickingId(null);
    setLoading(true);
    void api
      .listDriveRecent(80)
      .then((items) => setEntries(items.filter(isMediaEntry)))
      .catch((err: unknown) => {
        setEntries([]);
        setError(err instanceof Error ? err.message : "Could not load Files");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [entries, query]);

  const pickEntry = useCallback(
    async (entry: FileEntry) => {
      setPickingId(entry.id);
      setError(null);
      try {
        const blob = await api.fetchDriveBlob(entry.id);
        const file = new File([blob], entry.name, {
          type: blob.type || entry.mimeType || "application/octet-stream",
        });
        onPick(file);
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not open file");
      } finally {
        setPickingId(null);
      }
    },
    [onClose, onPick],
  );

  if (!open) return null;

  return (
    <div className="arco-connect-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-connect-modal arco-longformer-drive-picker"
        role="dialog"
        aria-labelledby="longformer-drive-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="arco-connect-modal__header">
          <div className="arco-connect-modal__title-row">
            <h2 id="longformer-drive-picker-title">Choose from Files</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </Button>
        </header>
        <div className="arco-connect-modal__body">
          <div className="arco-connect-modal__search">
            <ListSearch
              value={query}
              onChange={setQuery}
              placeholder="Search audio and video"
              ariaLabel="Search Files"
              compact
            />
          </div>
          {error ? <p className="arco-connect-modal__error">{error}</p> : null}
          {loading ? (
            <div className="arco-longformer-drive-picker__status">
              <Loader2 size={16} className="arco-longformer-status__spin" />
              Loading Files…
            </div>
          ) : visible.length === 0 ? (
            <p className="arco-connect-modal__empty">
              No audio or video files found in Files. Upload from this computer instead.
            </p>
          ) : (
            <ul className="arco-longformer-drive-picker__list arco-scroll">
              {visible.map((entry) => {
                const Icon = entry.mimeType.startsWith("video/") ? FileVideo : FileAudio;
                const picking = pickingId === entry.id;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="arco-longformer-drive-picker__item"
                      disabled={busy || pickingId != null}
                      onClick={() => void pickEntry(entry)}
                    >
                      <span className="arco-longformer-drive-picker__icon" aria-hidden="true">
                        {picking ? <Loader2 size={16} className="arco-longformer-status__spin" /> : <Icon size={16} />}
                      </span>
                      <span className="arco-longformer-drive-picker__name">{entry.name}</span>
                      <span className="arco-longformer-drive-picker__meta">{formatBytes(entry.size)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="arco-connect-modal__footer">
          <Button type="button" variant="default" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
