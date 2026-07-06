import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_NOTE_ID,
  IDEAS_PAGES,
  NOTES_VAULT,
  PRIVATE_PAGES,
  RECENT_PAGES,
  TEAMSPACE_PAGES,
} from "./notesMock";
import type { NoteNavPage, NotesView } from "./types";
import { resolveNoteId } from "./types";

/** STUB: replace with useNotesStore when vault API exists. */
export function useNotesStub() {
  const [activePageId, setActivePageId] = useState(DEFAULT_NOTE_ID);
  const [view, setView] = useState<NotesView>("editor");
  const [sidebarWidth, setSidebarWidth] = useState(260);

  const activeNoteId = resolveNoteId(activePageId);

  const activeNote = useMemo(
    () => NOTES_VAULT.find((note) => note.id === activeNoteId) ?? NOTES_VAULT[0],
    [activeNoteId],
  );

  const selectPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
    setView("editor");
  }, []);

  const createPage = useCallback(() => {
    setActivePageId(`draft-${Date.now()}`);
    setView("editor");
  }, []);

  const pageItem = useCallback(
    (page: NoteNavPage) => ({
      ...page,
      active: resolveNoteId(page.id) === activeNote.id,
    }),
    [activeNote.id],
  );

  return {
    view,
    setView,
    sidebarWidth,
    setSidebarWidth,
    activeNote,
    activePageId,
    selectPage,
    createPage,
    sections: {
      ideas: IDEAS_PAGES.map(pageItem),
      recents: RECENT_PAGES.map(pageItem),
      private: PRIVATE_PAGES.map(pageItem),
      teamspaces: TEAMSPACE_PAGES.map(pageItem),
    },
  };
}

export type NotesViewModel = ReturnType<typeof useNotesStub>;
