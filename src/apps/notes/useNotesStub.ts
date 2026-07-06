import { useCallback, useMemo, useState } from "react";
import type { JSONContent } from "@arco/editor-kit";
import { exportDocToMarkdown } from "@arco/editor-kit";
import { countBacklinks } from "./buildNotesGraph";
import { getNoteDoc } from "./noteDocConvert";
import {
  createNavFolder,
  createNavPage,
  duplicateNavPage,
  filterNavSections,
  moveNavNode,
  removeNavNode,
  toggleNavFolderExpanded,
  updateNavPageLabel,
  type NavDropPosition,
} from "./notesNavUtils";
import {
  DEFAULT_NAV_SECTION_ID,
  DEFAULT_NOTE_ID,
  NOTES_NAV_SECTIONS,
  NOTES_VAULT_SEED,
} from "./notesMock";
import type { NoteNavSection, NotePage } from "./types";
import { resolveNoteId, SIDEBAR_TO_NOTE_ID } from "./types";

function findNavPageIdForNote(noteId: string): string {
  return Object.entries(SIDEBAR_TO_NOTE_ID).find(([, id]) => id === noteId)?.[0] ?? noteId;
}

function cloneNoteContent<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : structuredClone(value);
}

function countDocWords(doc: JSONContent): number {
  const text = exportDocToMarkdown(doc as Parameters<typeof exportDocToMarkdown>[0]);
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function decorateNavSections(
  sections: NoteNavSection[],
  activeNoteId: string,
): NoteNavSection[] {
  function decorateItems(items: NoteNavSection["items"]): NoteNavSection["items"] {
    return items.map((node) => {
      if (node.type === "page") {
        return { ...node, active: resolveNoteId(node.id) === activeNoteId } as typeof node & {
          active?: boolean;
        };
      }
      return { ...node, children: decorateItems(node.children) };
    });
  }
  return sections.map((section) => ({ ...section, items: decorateItems(section.items) }));
}

/** Local vault state — swap for useNotesStore when the vault API exists. */
export function useNotesStub() {
  const [vault, setVault] = useState<NotePage[]>(() => NOTES_VAULT_SEED);
  const [navSections, setNavSections] = useState<NoteNavSection[]>(() => NOTES_NAV_SECTIONS);
  const [activePageId, setActivePageId] = useState(DEFAULT_NOTE_ID);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [searchQuery, setSearchQuery] = useState("");

  const activeNoteId = resolveNoteId(activePageId);

  const activeNote = useMemo(
    () => vault.find((note) => note.id === activeNoteId) ?? vault[0],
    [vault, activeNoteId],
  );

  const activeNoteDoc = useMemo(() => getNoteDoc(activeNote), [activeNote]);

  const activeNoteBacklinks = useMemo(
    () => countBacklinks(vault, activeNote.id),
    [vault, activeNote.id],
  );

  const activeNoteWordCount = useMemo(() => countDocWords(activeNoteDoc), [activeNoteDoc]);

  const updateNoteDoc = useCallback((noteId: string, doc: JSONContent) => {
    setVault((prev) => prev.map((note) => (note.id === noteId ? { ...note, doc } : note)));
  }, []);

  const updateNoteTitle = useCallback((noteId: string, title: string) => {
    const trimmed = title.trim() || "Untitled";
    setVault((prev) => prev.map((note) => (note.id === noteId ? { ...note, title: trimmed } : note)));
    setNavSections((prev) => updateNavPageLabel(prev, noteId, trimmed));
  }, []);

  const selectPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
  }, []);

  const goHome = useCallback(() => {
    setActivePageId(DEFAULT_NOTE_ID);
    setSearchQuery("");
  }, []);

  const createPage = useCallback((sectionId = DEFAULT_NAV_SECTION_ID, parentFolderId: string | null = null) => {
    const id = `note-${Date.now()}`;
    const title = "Untitled";
    const page: NotePage = {
      id,
      title,
      folder: parentFolderId ?? sectionId,
      doc: {
        type: "doc",
        content: [{ type: "paragraph" }],
      },
    };
    setVault((prev) => [...prev, page]);
    setNavSections((prev) =>
      createNavPage(prev, sectionId, parentFolderId, { type: "page", id, label: title }),
    );
    setActivePageId(id);
  }, []);

  const createFolder = useCallback((sectionId: string, parentFolderId: string | null = null) => {
    setNavSections((prev) => createNavFolder(prev, sectionId, parentFolderId).sections);
  }, []);

  const moveNavItem = useCallback((draggedId: string, targetId: string, position: NavDropPosition) => {
    setNavSections((prev) => moveNavNode(prev, draggedId, targetId, position));
  }, []);

  const toggleFolderExpanded = useCallback((folderId: string) => {
    setNavSections((prev) => toggleNavFolderExpanded(prev, folderId));
  }, []);

  const duplicateNote = useCallback((noteId: string) => {
    setVault((prev) => {
      const source = prev.find((note) => note.id === noteId);
      if (!source) return prev;

      const id = `note-${Date.now()}`;
      const title = `${source.title} copy`;
      const copy: NotePage = {
        ...source,
        id,
        title,
        doc: cloneNoteContent(source.doc),
        blocks: cloneNoteContent(source.blocks),
        links: source.links ? [...source.links] : undefined,
        tags: source.tags ? [...source.tags] : undefined,
      };

      setNavSections((nav) =>
        duplicateNavPage(nav, findNavPageIdForNote(noteId), { type: "page", id, label: title }),
      );
      setActivePageId(id);
      return [...prev, copy];
    });
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    let nextVault: NotePage[] = [];
    setVault((prev) => {
      nextVault = prev.filter((note) => note.id !== noteId);
      return nextVault;
    });
    setNavSections((prev) => removeNavNode(prev, findNavPageIdForNote(noteId)));
    setActivePageId((prev) => {
      if (resolveNoteId(prev) !== noteId) return prev;
      const next = nextVault[0];
      return next ? findNavPageIdForNote(next.id) : DEFAULT_NOTE_ID;
    });
  }, []);

  const sections = useMemo(
    () => decorateNavSections(filterNavSections(navSections, searchQuery), activeNote.id),
    [navSections, searchQuery, activeNote.id],
  );

  return {
    canvasOpen,
    setCanvasOpen,
    toggleCanvas: () => setCanvasOpen((open) => !open),
    sidebarWidth,
    setSidebarWidth,
    searchQuery,
    setSearchQuery,
    activeNote,
    activeNoteDoc,
    activePageId,
    selectPage,
    goHome,
    createPage,
    createFolder,
    moveNavItem,
    toggleFolderExpanded,
    updateNoteDoc,
    updateNoteTitle,
    duplicateNote,
    deleteNote,
    activeNoteBacklinks,
    activeNoteWordCount,
    sections,
  };
}

export type NotesViewModel = ReturnType<typeof useNotesStub>;
