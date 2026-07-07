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
  const trashSelection = location === "trash" ? selectedFile : null;

  function openEntry(file: DriveFileItem) {
    if (file.kind === "folder") onOpenFile(file);
    else onOpenFileEditor(file);
  }

  return (
    <div className="arco-drive">
      <SidebarPane width={sidebarWidth} onWidthChange={onSidebarWidthChange} handleLabel="Resize Drive sidebar">
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
        />

        {error ? <div className="arco-drive__error">{error}</div> : null}

        {location === "home" && suggestedFolders.length > 0 ? (
          <section className="arco-drive__home-section">
            <h3 className="arco-drive__section-heading">Suggested folders</h3>
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
              <span>Name</span>
              <span className="arco-drive__column-header-owner">Owner</span>
              <span className="arco-drive__column-header-modified">Last modified</span>
              <span className="arco-drive__column-header-size">File size</span>
              <span aria-hidden="true" />
            </div>
            <div className="arco-drive__scroll arco-scroll">
              {loading ? (
                <EmptyState title="Loading…" />
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
              <EmptyState title="Loading…" />
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
          <div className="arco-drive__path-bar" aria-label="Selected item path">
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

      <PreviewPane width={previewWidth} onWidthChange={onPreviewWidthChange} handleLabel="Resize file preview">
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
          />
        ) : trashSelection ? (
          <div className="arco-drive-preview">
            <div className="arco-drive-preview__header">
              <div className="arco-drive-preview__header-title">
                <span className="arco-drive-preview__file-name">{trashSelection.name}</span>
              </div>
            </div>
            <div className="arco-drive-preview__footer">
              <Button variant="primary" onClick={() => onRestoreFile(trashSelection.id)}>
                Restore
              </Button>
              <Button variant="danger" onClick={() => onDeleteForever(trashSelection.id)}>
                Delete forever
              </Button>
            </div>
          </div>
        ) : (
          <FilePreviewEmpty />
        )}
      </PreviewPane>
    </div>
  );
}
