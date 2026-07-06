/**
 * Notes — list-detail workspace with a Longformer-style resizable sidebar
 * and document editor surface.
 */
import { useCallback, useState } from "react";
import type { JSONContent } from "@arco/editor-kit";
import { useAuthStore } from "../../os/auth/authStore";
import { SidebarPane } from "../../components/patterns";
import { NoteEditor } from "./NoteEditor";
import { NotesSidebar } from "./NotesSidebar";
import { useNotesStub } from "./useNotesStub";

export function NotesApp() {
  const notes = useNotesStub();
  const [searchOpen, setSearchOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const userName = user?.displayName ?? user?.username ?? "You";

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

  return (
    <div className="arco-notes">
      <SidebarPane width={notes.sidebarWidth} onWidthChange={notes.setSidebarWidth}>
        <NotesSidebar
          sections={notes.sections}
          userName={userName}
          searchQuery={notes.searchQuery}
          searchOpen={searchOpen}
          onSearchQueryChange={notes.setSearchQuery}
          onToggleSearch={toggleSearch}
          onSelectPage={notes.selectPage}
          onCreatePage={notes.createPage}
          onCreateFolder={notes.createFolder}
          onMoveNavItem={notes.moveNavItem}
          onToggleFolder={notes.toggleFolderExpanded}
        />
      </SidebarPane>
      <NoteEditor
        note={notes.activeNote}
        noteDoc={notes.activeNoteDoc}
        canvasOpen={notes.canvasOpen}
        backlinkCount={notes.activeNoteBacklinks}
        wordCount={notes.activeNoteWordCount}
        onToggleCanvas={notes.toggleCanvas}
        onDocChange={handleDocChange}
        onTitleChange={handleTitleChange}
        onDuplicate={() => notes.duplicateNote(notes.activeNote.id)}
        onDelete={() => notes.deleteNote(notes.activeNote.id)}
      />
    </div>
  );
}
