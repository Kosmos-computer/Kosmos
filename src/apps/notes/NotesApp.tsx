/**
 * Notes — list-detail workspace with a Longformer-style resizable sidebar
 * and document editor surface.
 */
import { useCallback, useState } from "react";
import type { JSONContent } from "@arco/editor-kit";
import { SidebarPane } from "../../components/patterns";
import { NoteEditor } from "./NoteEditor";
import { NotesSidebar } from "./NotesSidebar";
import { useNotesStore } from "./useNotesStore";

export function NotesApp() {
  const notes = useNotesStore();
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleSearch = () => {
    setSearchOpen((open) => {
      if (open) notes.setSearchQuery("");
      return !open;
    });
  };

  const handleDocChange = useCallback(
    (doc: JSONContent) => {
      notes.updateNoteDoc(notes.activeNote.id, doc);
    },
    [notes.activeNote.id, notes.updateNoteDoc],
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      notes.updateNoteTitle(notes.activeNote.id, title);
    },
    [notes.activeNote.id, notes.updateNoteTitle],
  );

  const handleTitleCommit = useCallback(
    (title: string) => {
      notes.commitNoteTitle(notes.activeNote.id, title);
    },
    [notes.activeNote.id, notes.commitNoteTitle],
  );

  return (
    <div className="arco-notes">
      <SidebarPane width={notes.sidebarWidth} onWidthChange={notes.setSidebarWidth}>
        <NotesSidebar
          sections={notes.sections}
          activeBackendId={notes.activeBackendId}
          searchQuery={notes.searchQuery}
          searchOpen={searchOpen}
          onSearchQueryChange={notes.setSearchQuery}
          onToggleSearch={toggleSearch}
          onSelectPage={notes.selectPage}
          onCreatePage={notes.createPage}
          onCreateFolder={notes.createFolder}
          onMoveNavItem={notes.moveNavItem}
          onToggleFolder={notes.toggleFolderExpanded}
          onDuplicatePage={notes.duplicateNote}
          onExportPage={notes.exportNote}
          onDeletePage={notes.deleteNote}
          onSwitchBackend={notes.switchBackend}
        />
      </SidebarPane>
      <NoteEditor
        note={notes.activeNote}
        noteDoc={notes.activeNoteDoc}
        sourceLabel={notes.sourceLabel}
        folderPath={notes.activeNoteFolderPath}
        canvasOpen={notes.canvasOpen}
        backlinkCount={notes.activeNoteBacklinks}
        wordCount={notes.activeNoteWordCount}
        onToggleCanvas={notes.toggleCanvas}
        onDocChange={handleDocChange}
        onTitleChange={handleTitleChange}
        onTitleCommit={handleTitleCommit}
        onDuplicate={() => notes.duplicateNote(notes.activeNote.id)}
        onDelete={() => notes.deleteNote(notes.activeNote.id)}
      />
    </div>
  );
}
