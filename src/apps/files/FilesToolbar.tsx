import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useMemo } from "react";
import {
  ClipboardPaste,
  Download,
  FolderPlus,
  Grid3X3,
  Image,
  LayoutList,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Star,
  Trash2,
  Upload,
  FolderInput,
  RotateCcw,
} from "lucide-react";
import { Menu, type MenuItem } from "../../components/Menu";
import { Input } from "../../components/ui";
import { Button } from "../../components/ui";
import type { DriveFileItem, FilesKindFilter, FilesSortBy, FilesViewMode } from "./types";

const VIEW_MODES: { id: FilesViewMode; label: string; icon: typeof LayoutList }[] = [
  { id: "list", label: "List view", icon: LayoutList },
  { id: "grid", label: "Grid view", icon: Grid3X3 },
  { id: "gallery", label: "Gallery view", icon: Image },
];

const SORT_OPTIONS: { id: FilesSortBy; label: string }[] = [
  { id: "name", label: "Name" },
  { id: "owner", label: "Owner" },
  { id: "modified", label: "Last modified" },
  { id: "size", label: "File size" },
  { id: "type", label: "Type" },
];

const FILTER_OPTIONS: { id: FilesKindFilter; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "folder", label: "Folders" },
  { id: "doc", label: "Documents" },
  { id: "sheet", label: "Spreadsheets" },
  { id: "slides", label: "Presentations" },
  { id: "pdf", label: "PDFs" },
  { id: "image", label: "Images" },
  { id: "audio", label: "Audio" },
  { id: "video", label: "Video" },
  { id: "task", label: "Tasks" },
  { id: "schedule", label: "Schedules" },
];

export interface FilesToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: FilesViewMode;
  onViewModeChange: (mode: FilesViewMode) => void;
  sortBy: FilesSortBy;
  onSortByChange: (sortBy: FilesSortBy) => void;
  kindFilter: FilesKindFilter;
  onKindFilterChange: (filter: FilesKindFilter) => void;
  selectedFile?: DriveFileItem | null;
  inTrash?: boolean;
  title?: string;
  onUpload?: () => void;
  onRefresh?: () => void;
  onCreateFolder?: () => void;
  onOpenSelected?: () => void;
  onShareSelected?: () => void;
  onDownloadSelected?: () => void;
  onRenameSelected?: () => void;
  onMoveSelected?: () => void;
  onToggleStarSelected?: () => void;
  onTrashSelected?: () => void;
  onRestoreSelected?: () => void;
  onDeleteForeverSelected?: () => void;
  onPaste?: () => void;
  canPaste?: boolean;
}

export function FilesToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  kindFilter,
  onKindFilterChange,
  selectedFile = null,
  inTrash = false,
  title,
  onUpload,
  onRefresh,
  onCreateFolder,
  onOpenSelected,
  onShareSelected,
  onDownloadSelected,
  onRenameSelected,
  onMoveSelected,
  onToggleStarSelected,
  onTrashSelected,
  onRestoreSelected,
  onDeleteForeverSelected,
  onPaste,
  canPaste = false,
}: FilesToolbarProps) {
  const sortFilterItems = useMemo<MenuItem[]>(
    () => [
      {
        id: "sort-heading",
        label: "Sort by",
        disabled: true,
      },
      ...SORT_OPTIONS.map((option) => ({
        id: `sort-${option.id}`,
        label: option.label,
        checked: sortBy === option.id,
        onSelect: () => onSortByChange(option.id),
      })),
      {
        id: "filter-heading",
        label: "Show",
        disabled: true,
        separatorAbove: true,
      },
      ...FILTER_OPTIONS.map((option) => ({
        id: `filter-${option.id}`,
        label: option.label,
        checked: kindFilter === option.id,
        onSelect: () => onKindFilterChange(option.id),
      })),
    ],
    [kindFilter, onKindFilterChange, onSortByChange, sortBy],
  );

  const moreActionItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [];

    if (onRefresh) {
      items.push({
        id: "refresh",
        label: i18n.t(I18nKey.COMMON$REFRESH),
        icon: RefreshCw,
        onSelect: onRefresh,
      });
    }

    if (!inTrash && onCreateFolder) {
      items.push({
        id: "new-folder",
        label: "New folder",
        icon: FolderPlus,
        onSelect: onCreateFolder,
      });
    }

    if (!inTrash && onUpload) {
      items.push({
        id: "upload",
        label: "Upload",
        icon: Upload,
        onSelect: onUpload,
      });
    }

    if (!inTrash && onPaste) {
      items.push({
        id: "paste",
        label: "Paste",
        icon: ClipboardPaste,
        disabled: !canPaste,
        onSelect: onPaste,
      });
    }

    if (!selectedFile) {
      if (items.length === 0) {
        items.push({
          id: "no-selection",
          label: i18n.t(I18nKey.APPS$FILES_SELECT_A_FILE),
          disabled: true,
        });
      }
      return items;
    }

    if (inTrash) {
      if (onRestoreSelected) {
        items.push({
          id: "restore",
          label: i18n.t(I18nKey.APPS$FILES_RESTORE),
          icon: RotateCcw,
          separatorAbove: items.length > 0,
          onSelect: onRestoreSelected,
        });
      }
      if (onDeleteForeverSelected) {
        items.push({
          id: "delete-forever",
          label: i18n.t(I18nKey.APPS$FILES_DELETE_FOREVER),
          icon: Trash2,
          danger: true,
          onSelect: onDeleteForeverSelected,
        });
      }
      return items;
    }

    const selectionStart = items.length > 0;
    if (onOpenSelected) {
      items.push({
        id: "open",
        label: i18n.t(I18nKey.COMMON$OPEN),
        separatorAbove: selectionStart,
        onSelect: onOpenSelected,
      });
    }
    if (onShareSelected) {
      items.push({
        id: "share",
        label: i18n.t(I18nKey.APPS$FILES_SHARE),
        icon: Share2,
        separatorAbove: !onOpenSelected && selectionStart,
        onSelect: onShareSelected,
      });
    }
    if (selectedFile.kind !== "folder" && onDownloadSelected) {
      items.push({
        id: "download",
        label: i18n.t(I18nKey.APPS$MODELS_DOWNLOAD),
        icon: Download,
        onSelect: onDownloadSelected,
      });
    }
    if (onRenameSelected) {
      items.push({
        id: "rename",
        label: "Rename",
        icon: Pencil,
        separatorAbove: true,
        onSelect: onRenameSelected,
      });
    }
    if (onMoveSelected) {
      items.push({
        id: "move",
        label: "Move",
        icon: FolderInput,
        onSelect: onMoveSelected,
      });
    }
    if (onToggleStarSelected) {
      items.push({
        id: "star",
        label: selectedFile.starred ? "Unstar" : "Star",
        icon: Star,
        onSelect: onToggleStarSelected,
      });
    }
    if (onTrashSelected) {
      items.push({
        id: "trash",
        label: i18n.t(I18nKey.APPS$FILES_MOVE_TO_TRASH),
        icon: Trash2,
        danger: true,
        separatorAbove: true,
        onSelect: onTrashSelected,
      });
    }

    return items;
  }, [
    inTrash,
    onCreateFolder,
    onDeleteForeverSelected,
    onDownloadSelected,
    onMoveSelected,
    onOpenSelected,
    onRefresh,
    onRenameSelected,
    onPaste,
    onRestoreSelected,
    onShareSelected,
    onToggleStarSelected,
    onTrashSelected,
    onUpload,
    selectedFile,
  ]);

  return (
    <div className="arco-drive-toolbar">
      {title ? <h2 className="arco-drive-toolbar__title">{title}</h2> : null}
      <div className="arco-drive-toolbar__search">
        <Search size={15} className="arco-drive-toolbar__search-icon" aria-hidden="true" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={i18n.t(I18nKey.APPS$FILES_SEARCH_IN_DRIVE)}
          aria-label={i18n.t(I18nKey.APPS$FILES_SEARCH_FILES)}
          className="arco-drive-toolbar__search-input"
        />
      </div>
      <div className="arco-drive-toolbar__actions">
        {onUpload ? (
          <Button variant="default" onClick={onUpload} aria-label="Upload files">
            <Upload size={15} />
            Upload
          </Button>
        ) : null}
        <div className="arco-drive-toolbar__view-toggle" role="group" aria-label={i18n.t(I18nKey.APPS$FILES_VIEW_OPTIONS)}>
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Button
                key={mode.id}
                variant={viewMode === mode.id ? "default" : "ghost"}
                size="icon"
                aria-pressed={viewMode === mode.id}
                aria-label={mode.label}
                onClick={() => onViewModeChange(mode.id)}
              >
                <Icon size={15} />
              </Button>
            );
          })}
        </div>
        <Menu
          className="arco-drive-toolbar__menu"
          aria-label={i18n.t(I18nKey.APPS$FILES_MORE_ACTIONS)}
          align="end"
          searchable={false}
          items={moreActionItems}
          trigger={
            <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$FILES_MORE_ACTIONS)}>
              <MoreHorizontal size={15} />
            </Button>
          }
        />
        <Menu
          className="arco-drive-toolbar__menu"
          aria-label={i18n.t(I18nKey.APPS$FILES_SORT_AND_FILTER)}
          align="end"
          searchable={false}
          items={sortFilterItems}
          trigger={
            <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$FILES_SORT_AND_FILTER)}>
              <SlidersHorizontal size={15} />
            </Button>
          }
        />
      </div>
    </div>
  );
}
