import { Star } from "lucide-react";
import { DriveItemMenus, type DriveItemMenuActions } from "./driveItemMenu";
import { FILE_KIND_ICON, FILE_KIND_TONE, type DriveFileItem } from "./types";

export interface FileCardProps {
  file: DriveFileItem;
  selected?: boolean;
  compact?: boolean;
  cut?: boolean;
  menuActions: DriveItemMenuActions;
  onOpen?: () => void;
  onSelect?: () => void;
  onToggleStar?: () => void;
}

export function FileCard({
  file,
  selected = false,
  compact = false,
  cut = false,
  menuActions,
  onOpen,
  onSelect,
  onToggleStar,
}: FileCardProps) {
  const Icon = FILE_KIND_ICON[file.kind];
  const tone = FILE_KIND_TONE[file.kind];

  function handleActivate() {
    onSelect?.();
    if (file.kind === "folder") onOpen?.();
  }

  return (
    <DriveItemMenus
      file={file}
      actions={menuActions}
      cut={cut}
      className={[
        "arco-drive-card",
        selected ? "arco-drive-card--selected" : "",
        compact ? "arco-drive-card--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onActivate={handleActivate}
      onOpen={onOpen}
      onSelect={onSelect}
    >
      {(moreButton) => (
        <>
          <div className={["arco-drive-card__preview", `arco-drive-card__preview--${tone}`].join(" ")}>
            <Icon size={compact ? 22 : 28} strokeWidth={1.75} />
          </div>
          <div className="arco-drive-card__body">
            <span className="arco-drive-card__name">{file.name}</span>
            {!compact ? (
              <span className="arco-drive-card__meta">
                {file.modifiedLabel}
                {file.sizeLabel
                  ? ` · ${file.sizeLabel}`
                  : file.itemCount !== undefined
                    ? ` · ${file.itemCount} items`
                    : ""}
              </span>
            ) : null}
          </div>
          {onToggleStar ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={file.starred ? "Unstar" : "Star"}
              className={["arco-drive-card__star", file.starred ? "arco-drive-card__star--active" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={(event) => {
                event.stopPropagation();
                onToggleStar();
              }}
            >
              <Star size={14} fill={file.starred ? "currentColor" : "none"} />
            </span>
          ) : null}
          {moreButton}
        </>
      )}
    </DriveItemMenus>
  );
}
