import {
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  Files,
  FolderInput,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Scissors,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Menu, type MenuItem } from "../../components/Menu";
import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import type { DriveClipboard, DriveFileItem } from "./types";

export interface DriveItemMenuActions {
  inTrash?: boolean;
  canPaste?: boolean;
  onOpen: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDuplicate?: () => void;
  onToggleStar?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onDeleteForever?: () => void;
}

export function buildDriveItemMenuItems(file: DriveFileItem, actions: DriveItemMenuActions): MenuItem[] {
  if (actions.inTrash) {
    return [
      {
        id: "restore",
        label: i18n.t(I18nKey.APPS$FILES_RESTORE),
        icon: RotateCcw,
        onSelect: actions.onRestore,
      },
      {
        id: "delete-forever",
        label: i18n.t(I18nKey.APPS$FILES_DELETE_FOREVER),
        icon: Trash2,
        danger: true,
        onSelect: actions.onDeleteForever,
      },
    ];
  }

  const items: MenuItem[] = [
    {
      id: "open",
      label: i18n.t(I18nKey.COMMON$OPEN),
      icon: ExternalLink,
      onSelect: actions.onOpen,
    },
  ];

  if (actions.onShare) {
    items.push({
      id: "share",
      label: i18n.t(I18nKey.APPS$FILES_SHARE),
      icon: Share2,
      onSelect: actions.onShare,
    });
  }

  if (file.kind !== "folder" && actions.onDownload) {
    items.push({
      id: "download",
      label: i18n.t(I18nKey.APPS$MODELS_DOWNLOAD),
      icon: Download,
      onSelect: actions.onDownload,
    });
  }

  if (actions.onCut || actions.onCopy || actions.onPaste) {
    if (actions.onCut) {
      items.push({
        id: "cut",
        label: "Cut",
        icon: Scissors,
        separatorAbove: true,
        onSelect: actions.onCut,
      });
    }
    if (actions.onCopy) {
      items.push({
        id: "copy",
        label: "Copy",
        icon: Copy,
        separatorAbove: !actions.onCut,
        onSelect: actions.onCopy,
      });
    }
    if (actions.onPaste) {
      items.push({
        id: "paste",
        label: "Paste",
        icon: ClipboardPaste,
        disabled: !actions.canPaste,
        onSelect: actions.onPaste,
      });
    }
  }

  if (actions.onRename) {
    items.push({
      id: "rename",
      label: "Rename",
      icon: Pencil,
      separatorAbove: true,
      onSelect: actions.onRename,
    });
  }
  if (actions.onMove) {
    items.push({
      id: "move",
      label: "Move",
      icon: FolderInput,
      onSelect: actions.onMove,
    });
  }
  if (actions.onDuplicate) {
    items.push({
      id: "duplicate",
      label: "Duplicate",
      icon: Files,
      onSelect: actions.onDuplicate,
    });
  }
  if (actions.onToggleStar) {
    items.push({
      id: "star",
      label: file.starred ? "Unstar" : "Star",
      icon: Star,
      onSelect: actions.onToggleStar,
    });
  }

  if (actions.onTrash) {
    items.push({
      id: "trash",
      label: i18n.t(I18nKey.APPS$FILES_MOVE_TO_TRASH),
      icon: Trash2,
      danger: true,
      separatorAbove: true,
      onSelect: actions.onTrash,
    });
  }

  return items;
}

export function canPasteClipboard(clipboard: DriveClipboard | null, inTrash: boolean): boolean {
  return Boolean(clipboard) && !inTrash;
}

/** Hover ⋮ trigger plus click context menu for a Drive item (portaled at pointer). */
export function DriveItemMenus({
  file,
  actions,
  children,
  className,
  cut,
  onActivate,
  onOpen,
  onSelect,
}: {
  file: DriveFileItem;
  actions: DriveItemMenuActions;
  children: (moreButton: ReactNode) => ReactNode;
  className?: string;
  cut?: boolean;
  onActivate?: () => void;
  onOpen?: () => void;
  onSelect?: () => void;
}) {
  const [ctxOpen, setCtxOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const items = useMemo(() => buildDriveItemMenuItems(file, actions), [actions, file]);

  const moreButton = (
    <div
      className="arco-drive-item__more"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Menu
        className="arco-drive-item__more-menu"
        aria-label={`${file.name} actions`}
        align="end"
        searchable={false}
        items={items}
        open={moreOpen}
        onOpenChange={(open) => {
          setMoreOpen(open);
          if (!open) setAnchorPoint(null);
        }}
        anchorPoint={moreOpen ? anchorPoint : null}
        trigger={
          <button
            type="button"
            className="arco-btn arco-btn--ghost arco-btn--icon"
            aria-label="More actions"
            onClick={(event) => {
              event.stopPropagation();
              setCtxOpen(false);
              setAnchorPoint({ x: event.clientX, y: event.clientY });
            }}
          >
            <MoreHorizontal size={15} />
          </button>
        }
      />
    </div>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className={[className, cut ? "arco-drive-item--cut" : ""].filter(Boolean).join(" ")}
      onClick={onActivate}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate?.();
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect?.();
        setMoreOpen(false);
        setAnchorPoint({ x: event.clientX, y: event.clientY });
        setCtxOpen(true);
      }}
    >
      {children(moreButton)}
      <Menu
        open={ctxOpen}
        onOpenChange={(open) => {
          setCtxOpen(open);
          if (!open) setAnchorPoint(null);
        }}
        trigger={<span aria-hidden="true" />}
        className="arco-drive-item__ctx"
        aria-label={`${file.name} actions`}
        searchable={false}
        items={items}
        anchorPoint={ctxOpen ? anchorPoint : null}
      />
    </div>
  );
}
