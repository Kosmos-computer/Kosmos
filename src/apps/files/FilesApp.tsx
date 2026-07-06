/**
 * Drive — Finder-style browser over the OS file store (os.files@1).
 * Workspace project files remain in Studio → Files tab (/api/files).
 */
import { useCallback } from "react";
import { FileEditorView } from "./FileEditorView";
import { FilesWorkspace } from "./FilesWorkspace";
import { PdfReaderView } from "./PdfReaderView";
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
    <FilesWorkspace
      location={drive.location}
      onLocationChange={drive.setLocation}
      files={drive.files}
      breadcrumb={drive.breadcrumb}
      searchQuery={drive.searchQuery}
      onSearchChange={drive.setSearchQuery}
      viewMode={drive.viewMode}
      onViewModeChange={drive.setViewMode}
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
    />
  );
}
