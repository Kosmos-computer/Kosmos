import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { Plus, Search } from "lucide-react";
import { Input } from "../../components/ui";
import { NavSidebar } from "../../components/patterns";
import { NotesBackendFooter } from "./NotesBackendFooter";
import { YOUR_NOTES_SECTION_ID } from "./notesMock";
import type { NavDropPosition } from "./notesNavUtils";
import { NotesNavTree } from "./NotesNavTree";
import type { NoteNavSection } from "./types";

export function NotesSidebar({
  sections,
  activeBackendId,
  searchQuery,
  searchOpen,
  onSearchQueryChange,
  onToggleSearch,
  onSelectPage,
  onCreatePage,
  onCreateFolder,
  onMoveNavItem,
  onToggleFolder,
  onDuplicatePage,
  onExportPage,
  onDeletePage,
  onSwitchBackend,
}: {
  sections: NoteNavSection[];
  activeBackendId: string;
  searchQuery: string;
  searchOpen: boolean;
  onSearchQueryChange: (query: string) => void;
  onToggleSearch: () => void;
  onSelectPage: (id: string) => void;
  onCreatePage: (sectionId: string, parentFolderId: string | null) => void;
  onCreateFolder: (sectionId: string, parentFolderId: string | null) => void;
  onMoveNavItem: (draggedId: string, targetId: string, position: NavDropPosition) => void;
  onToggleFolder: (folderId: string) => void;
  onDuplicatePage: (id: string) => void;
  onExportPage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onSwitchBackend: (backendId: string, backendName?: string) => void;
}) {
  return (
    <NavSidebar
      header={
        searchOpen ? (
          <Input
            autoFocus
            value={searchQuery}
            placeholder={i18n.t(I18nKey.APPS$NOTES_SEARCH_NOTES_2)}
            aria-label={i18n.t(I18nKey.APPS$NOTES_SEARCH_NOTES)}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        ) : null
      }
      primaryAction={{
        label: "New page",
        icon: Plus,
        onClick: () => onCreatePage(YOUR_NOTES_SECTION_ID, null),
      }}
      quickLinks={[
        {
          id: "search",
          label: "Search",
          icon: Search,
          active: searchOpen,
          onClick: onToggleSearch,
        },
      ]}
      sections={[]}
      scrollContent={
        <div className="arco-nav-sidebar__sections arco-notes-nav">
          <NotesNavTree
            sections={sections}
            onSelectPage={onSelectPage}
            onCreatePage={onCreatePage}
            onCreateFolder={onCreateFolder}
            onMoveItem={onMoveNavItem}
            onToggleFolder={onToggleFolder}
            onDuplicatePage={onDuplicatePage}
            onExportPage={onExportPage}
            onDeletePage={onDeletePage}
          />
        </div>
      }
      footer={
        <NotesBackendFooter activeBackendId={activeBackendId} onSwitchBackend={onSwitchBackend} />
      }
      className="arco-notes-sidebar"
    />
  );
}
