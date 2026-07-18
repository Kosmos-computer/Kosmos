import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useCallback, useMemo } from "react";
import { Folder, FileText } from "lucide-react";
import { PreviewPane, SidebarPane } from "../../components/patterns";
import { EmptyState, Button } from "../../components/ui";
import { DriveColumnHeader, useDriveColumnWidths } from "./DriveColumnHeader";
import { DriveMotionSlot } from "./DriveMotionSlot";
import { DrivePathBar } from "./DrivePathBar";
import { canPasteClipboard, type DriveItemMenuActions } from "./driveItemMenu";
import { FileCard } from "./FileCard";
import { FilePreviewEmpty, FilePreviewPane } from "./FilePreviewPane";
import { FileRow } from "./FileRow";
import { FilesSidebar } from "./FilesSidebar";
import { FilesToolbar } from "./FilesToolbar";
import { useStagedList } from "./useStagedList";
import type {
  DriveClipboard,
  DriveFileItem,
  DriveNewItemType,
  FilesKindFilter,
  FilesLocation,
  FilesSortBy,
  FilesSortDir,
  FilesViewMode,
} from "./types";

const LOCATION_LABELS: Record<FilesLocation, string> = {
  home: "Home",
  drive: "My Drive",
  music: "Music",
  recent: "Recent",
  starred: "Starred",
  trash: "Trash",
};

export interface FilesWorkspaceProps {
  location: FilesLocation;
  onLocationChange: (location: FilesLocation) => void;
  files: DriveFileItem[];
  breadcrumb: { label: string; onClick?: () => void }[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: FilesViewMode;
  onViewModeChange: (mode: FilesViewMode) => void;
  sortBy: FilesSortBy;
  sortDir: FilesSortDir;
  onSortByChange: (sortBy: FilesSortBy) => void;
  kindFilter: FilesKindFilter;
  onKindFilterChange: (filter: FilesKindFilter) => void;
  selectedId: string | null;
  onSelectFile: (file: DriveFileItem | null) => void;
  previewText?: string;
  loading?: boolean;
  error?: string | null;
  sidebarWidth: number;
  onSidebarWidthChange: (width: number) => void;
  previewWidth: number;
  onPreviewWidthChange: (width: number) => void;
  onOpenFile: (file: DriveFileItem) => void;
  onOpenFileEditor: (file: DriveFileItem) => void;
  onToggleStar: (id: string) => void;
  onCreateNew: (type: DriveNewItemType) => void;
  onTrashFile: (id: string) => void;
  onRestoreFile: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onRenameFile?: (file: DriveFileItem) => void;
  onMoveFile?: (file: DriveFileItem) => void;
  onShareFile?: (file: DriveFileItem) => void;
  onDownloadFile?: (file: DriveFileItem) => void;
  onCutFile?: (file: DriveFileItem) => void;
  onCopyFile?: (file: DriveFileItem) => void;
  onDuplicateFile?: (file: DriveFileItem) => void;
  onPaste?: (intoFolderId?: string | null) => void;
  clipboard?: DriveClipboard | null;
  flashIds?: string[];
  onUpload?: () => void;
  onRefresh?: () => void;
}

export function FilesWorkspace({
  location,
  onLocationChange,
  files,
  breadcrumb,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  sortDir,
  onSortByChange,
  kindFilter,
  onKindFilterChange,
  selectedId,
  onSelectFile,
  previewText,
  loading,
  error,
  sidebarWidth,
  onSidebarWidthChange,
  previewWidth,
  onPreviewWidthChange,
  onOpenFile,
  onOpenFileEditor,
  onToggleStar,
  onCreateNew,
  onTrashFile,
  onRestoreFile,
  onDeleteForever,
  onRenameFile,
  onMoveFile,
  onShareFile,
  onDownloadFile,
  onCutFile,
  onCopyFile,
  onDuplicateFile,
  onPaste,
  clipboard = null,
  flashIds = [],
  onUpload,
  onRefresh,
}: FilesWorkspaceProps) {
  const pageTitle =
    location === "drive" && !searchQuery.trim()
      ? undefined
      : searchQuery.trim()
        ? "Search results"
        : LOCATION_LABELS[location];
  const suggestedFolders = location === "home" ? files.filter((file) => file.kind === "folder") : [];

  const emptyCopy =
    location === "trash"
      ? { title: "Trash is empty", description: "Items you delete will appear here." }
      : location === "starred"
        ? { title: "No starred files", description: "Star files to find them quickly here." }
        : location === "music"
          ? { title: "No music files", description: "Seed MP3s from your tirufm library on server start." }
          : searchQuery.trim()
            ? { title: "No matches", description: "Try a different search term." }
            : kindFilter !== "all"
              ? { title: "No matching files", description: "Try a different type filter." }
              : { title: "This folder is empty", description: "Create a file or folder to get started." };

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedId) ?? null,
    [files, selectedId],
  );
  const { widths: columnWidths, setColumnWidth, style: columnStyle } = useDriveColumnWidths();
  const stagedFiles = useStagedList(files);
  const flashIdSet = useMemo(() => new Set(flashIds), [flashIds]);
  const inTrash = location === "trash";
  const canPaste = canPasteClipboard(clipboard, inTrash);

  const menuActionsFor = useCallback(
    (file: DriveFileItem): DriveItemMenuActions => {
      const open = () => (file.kind === "folder" ? onOpenFile(file) : onOpenFileEditor(file));
      if (inTrash) {
        return {
          inTrash: true,
          onOpen: open,
          onRestore: () => onRestoreFile(file.id),
          onDeleteForever: () => onDeleteForever(file.id),
        };
      }
      return {
        canPaste,
        onOpen: open,
        onShare: onShareFile ? () => onShareFile(file) : undefined,
        onDownload:
          file.kind !== "folder" && onDownloadFile ? () => onDownloadFile(file) : undefined,
        onCut: onCutFile ? () => onCutFile(file) : undefined,
        onCopy: onCopyFile ? () => onCopyFile(file) : undefined,
        onPaste: onPaste
          ? () => onPaste(file.kind === "folder" ? file.id : undefined)
          : undefined,
        onRename: onRenameFile ? () => onRenameFile(file) : undefined,
        onMove: onMoveFile ? () => onMoveFile(file) : undefined,
        onDuplicate: onDuplicateFile ? () => onDuplicateFile(file) : undefined,
        onToggleStar: () => onToggleStar(file.id),
        onTrash: () => onTrashFile(file.id),
      };
    },
    [
      canPaste,
      inTrash,
      onCopyFile,
      onCutFile,
      onDeleteForever,
      onDownloadFile,
      onDuplicateFile,
      onMoveFile,
      onOpenFile,
      onOpenFileEditor,
      onPaste,
      onRenameFile,
      onRestoreFile,
      onShareFile,
      onToggleStar,
      onTrashFile,
    ],
  );

  const previewFile = selectedFile && selectedFile.kind !== "folder" ? selectedFile : null;
  const previewFolder = selectedFile && selectedFile.kind === "folder" && location !== "trash" ? selectedFile : null;
  const trashSelection = location === "trash" ? selectedFile : null;

  const pathCrumbs = useMemo(() => {
    if (location === "drive" || location === "music") return breadcrumb;
    return [{ label: LOCATION_LABELS[location] }];
  }, [breadcrumb, location]);

  const handlePathBack = useCallback(() => {
    if (location !== "drive" && location !== "music") return;
    if (breadcrumb.length <= 1) return;
    breadcrumb[breadcrumb.length - 2]?.onClick?.();
  }, [breadcrumb, location]);

  const canPathBack =
    (location === "drive" || location === "music") &&
    breadcrumb.length > 1 &&
    Boolean(breadcrumb[breadcrumb.length - 2]?.onClick);

  function openEntry(file: DriveFileItem) {
    if (file.kind === "folder") onOpenFile(file);
    else onOpenFileEditor(file);
  }

  return (
    <div className="arco-drive">
      <SidebarPane width={sidebarWidth} onWidthChange={onSidebarWidthChange} handleLabel={i18n.t(I18nKey.APPS$FILES_RESIZE_DRIVE_SIDEBAR)}>
        <FilesSidebar
          location={location}
          onLocationChange={onLocationChange}
          onCreateNew={onCreateNew}
        />
      </SidebarPane>

      <div className="arco-drive__browser">
        <FilesToolbar
          title={pageTitle}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          sortBy={sortBy}
          onSortByChange={onSortByChange}
          kindFilter={kindFilter}
          onKindFilterChange={onKindFilterChange}
          selectedFile={selectedFile}
          inTrash={location === "trash"}
          onUpload={location === "drive" || location === "music" ? onUpload : undefined}
          onRefresh={onRefresh}
          onCreateFolder={location !== "trash" ? () => onCreateNew("folder") : undefined}
          onOpenSelected={
            selectedFile
              ? () => (selectedFile.kind === "folder" ? onOpenFile(selectedFile) : onOpenFileEditor(selectedFile))
              : undefined
          }
          onShareSelected={selectedFile && onShareFile ? () => onShareFile(selectedFile) : undefined}
          onDownloadSelected={
            selectedFile && selectedFile.kind !== "folder" && onDownloadFile
              ? () => onDownloadFile(selectedFile)
              : undefined
          }
          onRenameSelected={selectedFile && onRenameFile ? () => onRenameFile(selectedFile) : undefined}
          onMoveSelected={selectedFile && onMoveFile ? () => onMoveFile(selectedFile) : undefined}
          onToggleStarSelected={selectedFile ? () => onToggleStar(selectedFile.id) : undefined}
          onTrashSelected={selectedFile ? () => onTrashFile(selectedFile.id) : undefined}
          onRestoreSelected={selectedFile ? () => onRestoreFile(selectedFile.id) : undefined}
          onDeleteForeverSelected={selectedFile ? () => onDeleteForever(selectedFile.id) : undefined}
          onPaste={onPaste && !inTrash ? () => onPaste() : undefined}
          canPaste={canPaste}
        />

        {error ? <div className="arco-drive__error">{error}</div> : null}

        <DrivePathBar crumbs={pathCrumbs} onBack={canPathBack ? handlePathBack : undefined} />

        {location === "home" && suggestedFolders.length > 0 ? (
          <section className="arco-drive__home-section">
            <h3 className="arco-drive__section-heading"><T k={I18nKey.APPS$FILES_SUGGESTED_FOLDERS} /></h3>
            <div className="arco-drive__home-folders">
              {suggestedFolders.map((folder) => (
                <FileCard
                  key={folder.id}
                  file={folder}
                  compact
                  cut={clipboard?.mode === "cut" && clipboard.id === folder.id}
                  menuActions={menuActionsFor(folder)}
                  onOpen={() => {
                    onLocationChange("drive");
                    onOpenFile(folder);
                  }}
                  onSelect={() => onSelectFile(folder)}
                  onToggleStar={() => onToggleStar(folder.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {viewMode === "list" ? (
          <div className="arco-drive__list" style={columnStyle}>
            <div className="arco-drive__scroll arco-scroll">
              <DriveColumnHeader
              widths={columnWidths}
              onColumnWidthChange={setColumnWidth}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSortByChange}
            />
              {loading ? (
                <EmptyState title={i18n.t(I18nKey.APPS$FILES_LOADING)} />
              ) : stagedFiles.length === 0 ? (
                <EmptyState title={emptyCopy.title}>{emptyCopy.description}</EmptyState>
              ) : (
                stagedFiles.map(({ item: file, phase, key }) => (
                  <DriveMotionSlot
                    key={key}
                    phase={phase}
                    variant="row"
                    flash={flashIdSet.has(file.id)}
                  >
                    <FileRow
                      file={file}
                      selected={file.id === selectedId}
                      cut={clipboard?.mode === "cut" && clipboard.id === file.id}
                      menuActions={menuActionsFor(file)}
                      onOpen={() => openEntry(file)}
                      onSelect={() => onSelectFile(file)}
                      onToggleStar={() => onToggleStar(file.id)}
                    />
                  </DriveMotionSlot>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className={["arco-drive__scroll arco-scroll", "arco-drive__scroll--grid"].filter(Boolean).join(" ")}>
            {loading ? (
              <EmptyState title={i18n.t(I18nKey.APPS$FILES_LOADING)} />
            ) : stagedFiles.length === 0 ? (
              <EmptyState title={emptyCopy.title}>{emptyCopy.description}</EmptyState>
            ) : (
              <div
                className={[
                  "arco-drive__grid",
                  viewMode === "gallery" ? "arco-drive__grid--gallery" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {stagedFiles.map(({ item: file, phase, key }) => (
                  <DriveMotionSlot
                    key={key}
                    phase={phase}
                    variant="card"
                    flash={flashIdSet.has(file.id)}
                  >
                    <FileCard
                      file={file}
                      selected={file.id === selectedId}
                      compact={viewMode === "grid"}
                      cut={clipboard?.mode === "cut" && clipboard.id === file.id}
                      menuActions={menuActionsFor(file)}
                      onOpen={() => openEntry(file)}
                      onSelect={() => onSelectFile(file)}
                      onToggleStar={() => onToggleStar(file.id)}
                    />
                  </DriveMotionSlot>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedFile ? (
          <div className="arco-drive__path-bar" aria-label={i18n.t(I18nKey.APPS$FILES_SELECTED_ITEM_PATH)}>
            {selectedFile.kind === "folder" ? (
              <Folder size={13} strokeWidth={1.75} />
            ) : (
              <FileText size={13} strokeWidth={1.75} />
            )}
            {selectedFile.name}
          </div>
        ) : null}
      </div>

      <PreviewPane width={previewWidth} onWidthChange={onPreviewWidthChange} handleLabel={i18n.t(I18nKey.APPS$FILES_RESIZE_FILE_PREVIEW)}>
        {previewFile ? (
          <FilePreviewPane
            file={previewFile}
            previewText={previewText}
            inTrash={location === "trash"}
            onClose={() => onSelectFile(null)}
            onOpen={() => onOpenFileEditor(previewFile)}
            onRestore={() => onRestoreFile(previewFile.id)}
            onDeleteForever={() => onDeleteForever(previewFile.id)}
            onMoveToTrash={() => onTrashFile(previewFile.id)}
            onShare={() => onShareFile?.(previewFile)}
            onDownload={() => onDownloadFile?.(previewFile)}
            onRename={() => onRenameFile?.(previewFile)}
            onMove={() => onMoveFile?.(previewFile)}
          />
        ) : previewFolder ? (
          <FilePreviewPane
            file={previewFolder}
            onClose={() => onSelectFile(null)}
            onOpen={() => onOpenFile(previewFolder)}
            onShare={() => onShareFile?.(previewFolder)}
            onRename={() => onRenameFile?.(previewFolder)}
            onMove={() => onMoveFile?.(previewFolder)}
            onMoveToTrash={() => onTrashFile(previewFolder.id)}
          />
        ) : trashSelection ? (
          <div className="arco-drive-preview">
            <div className="arco-drive-preview__header">
              <div className="arco-drive-preview__header-title">
                <span className="arco-drive-preview__file-name">{trashSelection.name}</span>
              </div>
            </div>
            <div className="arco-drive-preview__footer">
              <Button variant="primary" onClick={() => onRestoreFile(trashSelection.id)}><T k={I18nKey.APPS$FILES_RESTORE} /></Button>
              <Button variant="danger" onClick={() => onDeleteForever(trashSelection.id)}><T k={I18nKey.APPS$FILES_DELETE_FOREVER} /></Button>
            </div>
          </div>
        ) : (
          <FilePreviewEmpty />
        )}
      </PreviewPane>
    </div>
  );
}
