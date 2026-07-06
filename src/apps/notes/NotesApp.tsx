/**
 * Notes — list-detail workspace with a Longformer-style resizable sidebar
 * and document editor surface. Data is stubbed until the vault API exists.
 */
import { useAuthStore } from "../../os/auth/authStore";
import { SidebarPane } from "../../components/patterns";
import { NoteEditor } from "./NoteEditor";
import { NotesSidebar } from "./NotesSidebar";
import { useNotesStub } from "./useNotesStub";

export function NotesApp() {
  const notes = useNotesStub();
  const user = useAuthStore((s) => s.user);
  const userName = user?.displayName ?? user?.username ?? "You";

  return (
    <div className="arco-notes">
      <SidebarPane width={notes.sidebarWidth} onWidthChange={notes.setSidebarWidth}>
        <NotesSidebar
          sections={notes.sections}
          view={notes.view}
          userName={userName}
          onSelectPage={notes.selectPage}
          onCreatePage={notes.createPage}
          onViewChange={notes.setView}
        />
      </SidebarPane>
      <NoteEditor note={notes.activeNote} view={notes.view} onViewChange={notes.setView} />
    </div>
  );
}
