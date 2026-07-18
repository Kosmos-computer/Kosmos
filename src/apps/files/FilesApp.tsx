/**
 * Drive — Finder-style browser over the OS file store (os.files@1).
 * Workspace project files remain in Studio → Files tab (/api/files).
 */
import { useCallback } from "react";
import { DriveMoveModal } from "./DriveMoveModal";
import { FileEditorView } from "./FileEditorView";
import { FilesWorkspace } from "./FilesWorkspace";
import { PdfReaderView } from "./PdfReaderView";
import { ShareLinkModal } from "./ShareLinkModal";
import { useDrive } from "./useDrive";
import type { DriveFileItem } from "./types";

export function FilesApp() {
  const drive = useDrive();

  const handleSelectFile = useCallback(
    (file: DriveFileItem | null) => {
      drive.setSelectedId(file?.id ?? null);
    },
    [drive],
  );

  const handleToggleStar = useCallback(
    (id: string) => {
      void drive.toggleStar(id);
    },
    [drive],
  );

  if (drive.pdfFile) {
    return <PdfReaderView file={drive.pdfFile} onBack={() => drive.setPdfFile(null)} />;
  }

  if (drive.editorFile) {
    return (
      <FileEditorView
        file={drive.editorFile}
        onBack={() => drive.setEditorFile(null)}
        onSave={drive.saveEditor}
      />
    );
  }

  return (
    <>
      <input
        ref={drive.uploadInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) void drive.uploadFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <FilesWorkspace
        location={drive.location}
        onLocationChange={drive.setLocation}
        files={drive.files}
        breadcrumb={drive.breadcrumb}
        searchQuery={drive.searchQuery}
        onSearchChange={drive.setSearchQuery}
        viewMode={drive.viewMode}
        onViewModeChange={drive.setViewMode}
        sortBy={drive.sortBy}
        sortDir={drive.sortDir}
        onSortByChange={drive.setSortBy}
        kindFilter={drive.kindFilter}
        onKindFilterChange={drive.setKindFilter}
        selectedId={drive.selectedId}
        onSelectFile={handleSelectFile}
        previewText={drive.previewText}
        loading={drive.loading}
        error={drive.error}
        sidebarWidth={drive.sidebarWidth}
        onSidebarWidthChange={drive.setSidebarWidth}
        previewWidth={drive.previewWidth}
        onPreviewWidthChange={drive.setPreviewWidth}
        onOpenFile={(file) => void drive.openFile(file)}
        onOpenFileEditor={(file) => void drive.openFileEditor(file)}
        onToggleStar={handleToggleStar}
        onCreateNew={(type) => void drive.createNew(type)}
        onTrashFile={(id) => void drive.trashFile(id)}
        onRestoreFile={(id) => void drive.restoreFile(id)}
        onDeleteForever={(id) => void drive.deleteForever(id)}
        onRenameFile={(file) => void drive.renameFile(file.id, file.name)}
        onMoveFile={(file) => drive.setMoveFile(file)}
        onShareFile={(file) => drive.setShareFile(file)}
        onDownloadFile={(file) => void drive.downloadFile(file)}
        onCutFile={drive.cutFile}
        onCopyFile={drive.copyFile}
        onDuplicateFile={(file) => void drive.duplicateFile(file)}
        onPaste={(intoFolderId) => void drive.pasteClipboard(intoFolderId)}
        clipboard={drive.clipboard}
        flashIds={drive.flashIds}
        onUpload={drive.triggerUpload}
        onRefresh={() => void drive.refresh()}
      />
      {drive.shareFile ? (
        <ShareLinkModal
          open
          file={drive.shareFile}
          onClose={() => drive.setShareFile(null)}
        />
      ) : null}
      {drive.moveFile ? (
        <DriveMoveModal
          open
          itemId={drive.moveFile.id}
          itemName={drive.moveFile.name}
          onClose={() => drive.setMoveFile(null)}
          onMove={(parentId) => drive.moveFileTo(drive.moveFile!.id, parentId)}
        />
      ) : null}
    </>
  );
}
