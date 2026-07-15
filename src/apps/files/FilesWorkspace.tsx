import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useMemo } from "react";
import { Folder, FileText } from "lucide-react";
import { PreviewPane, SidebarPane } from "../../components/patterns";
import { EmptyState, Button } from "../../components/ui";
import { FileCard } from "./FileCard";
import { FilePreviewEmpty, FilePreviewPane } from "./FilePreviewPane";
import { FileRow } from "./FileRow";
import { FilesSidebar } from "./FilesSidebar";
import { FilesToolbar } from "./FilesToolbar";
import type { DriveFileItem, DriveNewItemType, FilesLocation, FilesViewMode } from "./types";

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
  onUpload?: () => void;
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
  onUpload,
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
            : { title: "This folder is empty", description: "Create a file or folder to get started." };

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedId) ?? null,
    [files, selectedId],
  );

  const previewFile = selectedFile && selectedFile.kind !== "folder" ? selectedFile : null;
  const previewFolder = selectedFile && selectedFile.kind === "folder" && location !== "trash" ? selectedFile : null;
  const trashSelection = location === "trash" ? selectedFile : null;

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
          onUpload={location === "drive" || location === "music" ? onUpload : undefined}
        />

        {error ? <div className="arco-drive__error">{error}</div> : null}

        {location === "home" && suggestedFolders.length > 0 ? (
          <section className="arco-drive__home-section">
            <h3 className="arco-drive__section-heading"><T k={I18nKey.APPS$FILES_SUGGESTED_FOLDERS} /></h3>
            <div className="arco-drive__home-folders">
              {suggestedFolders.map((folder) => (
                <FileCard
                  key={folder.id}
                  file={folder}
                  compact
                  onOpen={() => {
                    onLocationChange("drive");
                    onOpenFile(folder);
                  }}
                  onSelect={() => onSelectFile(folder)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {viewMode === "list" ? (
          <>
            <div className="arco-drive__column-header">
              <span><T k={I18nKey.APPS$FILES_NAME} /></span>
              <span className="arco-drive__column-header-owner"><T k={I18nKey.APPS$FILES_OWNER} /></span>
              <span className="arco-drive__column-header-modified"><T k={I18nKey.APPS$FILES_LAST_MODIFIED} /></span>
              <span className="arco-drive__column-header-size"><T k={I18nKey.APPS$FILES_FILE_SIZE} /></span>
              <span aria-hidden="true" />
            </div>
            <div className="arco-drive__scroll arco-scroll">
              {loading ? (
                <EmptyState title={i18n.t(I18nKey.APPS$FILES_LOADING)} />
              ) : files.length === 0 ? (
                <EmptyState title={emptyCopy.title}>{emptyCopy.description}</EmptyState>
              ) : (
                files.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    selected={file.id === selectedId}
                    onOpen={() => openEntry(file)}
                    onSelect={() => onSelectFile(file)}
                    onToggleStar={() => onToggleStar(file.id)}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div className={["arco-drive__scroll arco-scroll", "arco-drive__scroll--grid"].filter(Boolean).join(" ")}>
            {loading ? (
              <EmptyState title={i18n.t(I18nKey.APPS$FILES_LOADING)} />
            ) : files.length === 0 ? (
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
                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    selected={file.id === selectedId}
                    compact={viewMode === "grid"}
                    onOpen={() => openEntry(file)}
                    onSelect={() => onSelectFile(file)}
                    onToggleStar={() => onToggleStar(file.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {selectedFile ? (
          <div className="arco-drive__path-bar" aria-label={i18n.t(I18nKey.APPS$FILES_SELECTED_ITEM_PATH)}>
            <Folder size={13} strokeWidth={1.75} />
            {breadcrumb.map((item) => item.label).join(" › ")}
            {breadcrumb.length > 0 ? " › " : ""}
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
