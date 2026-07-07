import {
  Download,
  ExternalLink,
  Image as ImageIcon,
  MoreVertical,
  Play,
  Users,
  X,
} from "lucide-react";
import { Avatar, Button, EmptyState } from "../../components/ui";
import { api } from "../../lib/api";
import { PdfViewer } from "./PdfViewer";
import { FILE_KIND_ICON, FILE_KIND_TONE, type DriveFileItem } from "./types";

const PREVIEW_COPY: Partial<Record<DriveFileItem["kind"], string>> = {
  doc: "Document preview — open to edit in the full workspace.",
  sheet: "Spreadsheet with metrics, forecasts, and scenario tabs.",
  slides: "Presentation deck with title slide, agenda, and appendix charts.",
  task: "Task list — open to edit in Tasks.",
  schedule: "Schedule — open to edit in Calendar.",
  pdf: "PDF preview — read-only in this view.",
  code: "Source file — open to edit.",
  image: "Image preview would render here when connected to real file storage.",
  video: "Video preview and playback controls would appear here.",
  audio: "Audio track — use the player above or open in Music.",
  archive: "Compressed archive containing exported assets and build artifacts.",
};

export interface FilePreviewPaneProps {
  file: DriveFileItem;
  previewText?: string;
  inTrash?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  onRestore?: () => void;
  onDeleteForever?: () => void;
  onMoveToTrash?: () => void;
}

export function FilePreviewPane({
  file,
  previewText,
  inTrash = false,
  onClose,
  onOpen,
  onRestore,
  onDeleteForever,
  onMoveToTrash,
}: FilePreviewPaneProps) {
  const Icon = FILE_KIND_ICON[file.kind];
  const tone = FILE_KIND_TONE[file.kind];
  const body = previewText ?? PREVIEW_COPY[file.kind] ?? "No preview available for this file type.";

  return (
    <div className="arco-drive-preview">
      <div className="arco-drive-preview__header">
        <div className="arco-drive-preview__header-title">
          <span className={["arco-drive-preview__icon", `arco-drive-preview__icon--${tone}`].join(" ")}>
            <Icon size={16} strokeWidth={1.75} />
          </span>
          <span className="arco-drive-preview__file-name">{file.name}</span>
        </div>
        <div className="arco-drive-preview__header-actions">
          <Button variant="ghost" size="icon" aria-label="Download">
            <Download size={15} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="More options">
            <MoreVertical size={15} />
          </Button>
          {onClose ? (
            <Button variant="ghost" size="icon" aria-label="Close preview" onClick={onClose}>
              <X size={15} />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="arco-drive-preview__scroll arco-scroll">
        <div className="arco-drive-preview__preview-area">
          {file.kind === "image" ? (
            <div className={["arco-drive-preview__placeholder", `arco-drive-preview__placeholder--${tone}`].join(" ")}>
              <ImageIcon size={42} strokeWidth={1.5} />
              <span>Image preview</span>
            </div>
          ) : file.kind === "video" ? (
            <div className={["arco-drive-preview__placeholder", `arco-drive-preview__placeholder--${tone}`].join(" ")}>
              <Play size={42} strokeWidth={1.5} />
              <span>Video preview</span>
            </div>
          ) : file.kind === "audio" ? (
            <audio controls className="arco-drive-preview__audio" src={api.driveBlobUrl(file.id)}>
              <track kind="captions" />
            </audio>
          ) : file.kind === "code" ? (
            <pre className="arco-drive-preview__code">{body}</pre>
          ) : file.kind === "pdf" ? (
            <PdfViewer fileId={file.id} variant="preview" />
          ) : (
            <div className={["arco-drive-preview__placeholder", `arco-drive-preview__placeholder--${tone}`].join(" ")}>
              <Icon size={42} strokeWidth={1.5} />
              <span>{file.kind.toUpperCase()} preview</span>
            </div>
          )}
        </div>

        <div className="arco-drive-preview__meta-section">
          <h3 className="arco-drive-preview__section-title">Details</h3>
          <dl className="arco-drive-preview__meta-list">
            <div className="arco-drive-preview__meta-row">
              <dt>Type</dt>
              <dd>{file.kind}</dd>
            </div>
            <div className="arco-drive-preview__meta-row">
              <dt>Size</dt>
              <dd>{file.sizeLabel ?? "—"}</dd>
            </div>
            <div className="arco-drive-preview__meta-row">
              <dt>Modified</dt>
              <dd>{file.modifiedLabel ?? "—"}</dd>
            </div>
            {file.owner ? (
              <div className="arco-drive-preview__meta-row">
                <dt>Owner</dt>
                <dd className="arco-drive-preview__owner">
                  <Avatar name={file.owner.name} size="sm" />
                  {file.owner.name}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {file.kind !== "folder" && file.kind !== "pdf" ? (
          <div className="arco-drive-preview__text-section">
            <h3 className="arco-drive-preview__section-title">Preview</h3>
            <p className="arco-drive-preview__text">{body}</p>
          </div>
        ) : null}
      </div>

      <div className="arco-drive-preview__footer">
        {inTrash ? (
          <>
            <Button variant="primary" onClick={onRestore}>
              Restore
            </Button>
            <Button variant="danger" onClick={onDeleteForever}>
              Delete forever
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={onOpen}>
              <ExternalLink size={14} />
              Open
            </Button>
            <Button variant="default">
              <Users size={14} />
              Share
            </Button>
            {onMoveToTrash ? (
              <Button variant="ghost" onClick={onMoveToTrash}>
                Move to trash
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function FilePreviewEmpty() {
  return (
    <div className="arco-drive-preview arco-drive-preview--empty">
      <EmptyState title="Select a file">
        Choose a file from the list to preview it here — like Finder Quick Look or Drive&apos;s details pane.
      </EmptyState>
    </div>
  );
}
