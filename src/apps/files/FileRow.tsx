import { Star } from "lucide-react";
import { Avatar } from "../../components/ui";
import { DriveItemMenus, type DriveItemMenuActions } from "./driveItemMenu";
import { FILE_KIND_ICON, FILE_KIND_TONE, type DriveFileItem } from "./types";

export interface FileRowProps {
  file: DriveFileItem;
  selected?: boolean;
  cut?: boolean;
  menuActions: DriveItemMenuActions;
  onOpen?: () => void;
  onSelect?: () => void;
  onToggleStar?: () => void;
}

export function FileRow({
  file,
  selected = false,
  cut = false,
  menuActions,
  onOpen,
  onSelect,
  onToggleStar,
}: FileRowProps) {
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
      className={["arco-drive-row", selected ? "arco-drive-row--selected" : ""].filter(Boolean).join(" ")}
      onActivate={handleActivate}
      onOpen={onOpen}
      onSelect={onSelect}
    >
      {(moreButton) => (
        <>
          <span className="arco-drive-row__name-cell">
            <span className={["arco-drive-row__icon", `arco-drive-row__icon--${tone}`].join(" ")}>
              <Icon size={15} strokeWidth={1.75} />
            </span>
            <span className="arco-drive-row__name">{file.name}</span>
          </span>
          <span className="arco-drive-row__owner-cell">
            {file.owner ? <Avatar name={file.owner.name} size="sm" /> : null}
            {file.owner?.name}
          </span>
          <span className="arco-drive-row__modified-cell">{file.modifiedLabel}</span>
          <span className="arco-drive-row__size-cell">
            {file.kind === "folder"
              ? file.itemCount !== undefined
                ? `${file.itemCount} item${file.itemCount === 1 ? "" : "s"}`
                : "—"
              : file.sizeLabel}
          </span>
          <span className="arco-drive-row__actions">
            <span
              role="button"
              tabIndex={-1}
              aria-label={file.starred ? "Unstar" : "Star"}
              className={["arco-drive-row__star", file.starred ? "arco-drive-row__star--active" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={(event) => {
                event.stopPropagation();
                onToggleStar?.();
              }}
            >
              <Star size={14} fill={file.starred ? "currentColor" : "none"} />
            </span>
            {moreButton}
          </span>
        </>
      )}
    </DriveItemMenus>
  );
}
