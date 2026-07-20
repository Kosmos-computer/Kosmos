import { useCallback, useMemo, useState } from "react";
import type { JSONContent } from "@arco/editor-kit";
import { exportDocToMarkdown } from "@arco/editor-kit";
import { countBacklinks } from "./buildNotesGraph";
import { downloadNoteAsMarkdown } from "./noteActions";
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
  createLocalVaultSnapshot,
  createRemoteVaultSnapshot,
  DEFAULT_NAV_SECTION_ID,
  DEFAULT_NOTE_ID,
  LOCAL_NOTES_BACKEND_ID,
  RECENTS_SECTION_ID,
  YOUR_NOTES_SECTION_ID,
  type NotesVaultSnapshot,
} from "./notesMock";
import type { NoteNavSection, NotePage } from "./types";

const MAX_RECENTS = 12;

interface RecentEntry {
  id: string;
  openedAt: number;
}

interface VaultSession extends NotesVaultSnapshot {
  recents: RecentEntry[];
}

function cloneNoteContent<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : structuredClone(value);
}

function countDocWords(doc: JSONContent): number {
  const text = exportDocToMarkdown(doc as Parameters<typeof exportDocToMarkdown>[0]);
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatRecentMeta(openedAt: number): string {
  const minutes = Math.floor((Date.now() - openedAt) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function bumpRecent(entries: RecentEntry[], id: string): RecentEntry[] {
  return [{ id, openedAt: Date.now() }, ...entries.filter((entry) => entry.id !== id)].slice(
    0,
    MAX_RECENTS,
  );
}

function resolveLibrarySectionId(sectionId: string): string {
  return sectionId === RECENTS_SECTION_ID ? YOUR_NOTES_SECTION_ID : sectionId;
}

function decorateNavSections(
  sections: NoteNavSection[],
  activeNoteId: string,
): NoteNavSection[] {
  function decorateItems(items: NoteNavSection["items"]): NoteNavSection["items"] {
    return items.map((node) => {
      if (node.type === "page") {
        return { ...node, active: node.id === activeNoteId } as typeof node & {
          active?: boolean;
        };
      }
      return { ...node, children: decorateItems(node.children) };
    });
  }
  return sections.map((section) => ({ ...section, items: decorateItems(section.items) }));
}

function buildRecentsSection(vault: NotePage[], recents: RecentEntry[]): NoteNavSection {
  const items = recents.flatMap((entry) => {
    const note = vault.find((page) => page.id === entry.id);
    if (!note) return [];
    return [
      {
        type: "page" as const,
        id: note.id,
        label: note.title,
        meta: formatRecentMeta(entry.openedAt),
      },
    ];
  });

  return {
    id: RECENTS_SECTION_ID,
    title: "Recents",
    allowCreate: false,
    allowDrag: false,
    items,
  };
}

function createSession(snapshot: NotesVaultSnapshot): VaultSession {
  return {
    ...snapshot,
    recents: [{ id: snapshot.activePageId, openedAt: Date.now() }],
  };
}

function emptyNoteFallback(): NotePage {
  return {
    id: DEFAULT_NOTE_ID,
    title: "Untitled",
    folder: YOUR_NOTES_SECTION_ID,
    doc: { type: "doc", content: [{ type: "paragraph" }] },
  };
}

/** Local vault state — swap for useNotesStore when the vault API exists. */
export function useNotesStub() {
  const [activeBackendId, setActiveBackendId] = useState(LOCAL_NOTES_BACKEND_ID);
  const [sessions, setSessions] = useState<Record<string, VaultSession>>(() => ({
    [LOCAL_NOTES_BACKEND_ID]: createSession(createLocalVaultSnapshot()),
  }));
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [searchQuery, setSearchQuery] = useState("");

  const session = sessions[activeBackendId] ?? sessions[LOCAL_NOTES_BACKEND_ID];
  const vault = session.vault;
  const navSections = session.navSections;
  const recents = session.recents;
  const activePageId = session.activePageId;

  const updateSession = useCallback(
    (updater: (current: VaultSession) => VaultSession) => {
      setSessions((prev) => {
        const current = prev[activeBackendId] ?? prev[LOCAL_NOTES_BACKEND_ID];
        if (!current) return prev;
        return { ...prev, [activeBackendId]: updater(current) };
      });
    },
    [activeBackendId],
  );

  const activeNote = useMemo(
    () => vault.find((note) => note.id === activePageId) ?? vault[0] ?? emptyNoteFallback(),
    [vault, activePageId],
  );

  const activeNoteDoc = useMemo(() => getNoteDoc(activeNote), [activeNote]);

  const activeNoteBacklinks = useMemo(
    () => countBacklinks(vault, activeNote.id),
    [vault, activeNote.id],
  );

  const activeNoteWordCount = useMemo(() => countDocWords(activeNoteDoc), [activeNoteDoc]);

  const switchBackend = useCallback((backendId: string, backendName?: string) => {
    setSessions((prev) => {
      if (prev[backendId]) return prev;
      const snapshot =
        backendId === LOCAL_NOTES_BACKEND_ID
          ? createLocalVaultSnapshot()
          : createRemoteVaultSnapshot({ id: backendId, name: backendName ?? backendId });
      return { ...prev, [backendId]: createSession(snapshot) };
    });
    setActiveBackendId(backendId);
    setSearchQuery("");
  }, []);

  const updateNoteDoc = useCallback(
    (noteId: string, doc: JSONContent) => {
      updateSession((current) => ({
        ...current,
        vault: current.vault.map((note) => (note.id === noteId ? { ...note, doc } : note)),
      }));
    },
    [updateSession],
  );

  const updateNoteTitle = useCallback(
    (noteId: string, title: string) => {
      // Keep the raw string while typing — coercing "" → "Untitled" here resets the caret.
      updateSession((current) => ({
        ...current,
        vault: current.vault.map((note) => (note.id === noteId ? { ...note, title } : note)),
        navSections: updateNavPageLabel(current.navSections, noteId, title.trim() || "Untitled"),
      }));
    },
    [updateSession],
  );

  const commitNoteTitle = useCallback(
    (noteId: string, title: string) => {
      const trimmed = title.trim() || "Untitled";
      updateSession((current) => ({
        ...current,
        vault: current.vault.map((note) => (note.id === noteId ? { ...note, title: trimmed } : note)),
        navSections: updateNavPageLabel(current.navSections, noteId, trimmed),
      }));
    },
    [updateSession],
  );

  const selectPage = useCallback(
    (pageId: string) => {
      updateSession((current) => ({
        ...current,
        activePageId: pageId,
        recents: bumpRecent(current.recents, pageId),
      }));
    },
    [updateSession],
  );

  const goHome = useCallback(() => {
    updateSession((current) => {
      const homeId = current.vault[0]?.id ?? DEFAULT_NOTE_ID;
      return {
        ...current,
        activePageId: homeId,
        recents: bumpRecent(current.recents, homeId),
      };
    });
    setSearchQuery("");
  }, [updateSession]);

  const createPage = useCallback(
    (sectionId = DEFAULT_NAV_SECTION_ID, parentFolderId: string | null = null) => {
      const librarySectionId = resolveLibrarySectionId(sectionId);
      const id = `note-${Date.now()}`;
      const title = "Untitled";
      const page: NotePage = {
        id,
        title,
        folder: parentFolderId ?? librarySectionId,
        doc: {
          type: "doc",
          content: [{ type: "paragraph" }],
        },
      };
      updateSession((current) => ({
        ...current,
        vault: [...current.vault, page],
        navSections: createNavPage(current.navSections, librarySectionId, parentFolderId, {
          type: "page",
          id,
          label: title,
        }),
        activePageId: id,
        recents: bumpRecent(current.recents, id),
      }));
    },
    [updateSession],
  );

  const createFolder = useCallback(
    (sectionId: string, parentFolderId: string | null = null) => {
      const librarySectionId = resolveLibrarySectionId(sectionId);
      updateSession((current) => ({
        ...current,
        navSections: createNavFolder(current.navSections, librarySectionId, parentFolderId).sections,
      }));
    },
    [updateSession],
  );

  const moveNavItem = useCallback(
    (draggedId: string, targetId: string, position: NavDropPosition) => {
      updateSession((current) => ({
        ...current,
        navSections: moveNavNode(current.navSections, draggedId, targetId, position),
      }));
    },
    [updateSession],
  );

  const toggleFolderExpanded = useCallback(
    (folderId: string) => {
      updateSession((current) => ({
        ...current,
        navSections: toggleNavFolderExpanded(current.navSections, folderId),
      }));
    },
    [updateSession],
  );

  const duplicateNote = useCallback(
    (noteId: string) => {
      updateSession((current) => {
        const source = current.vault.find((note) => note.id === noteId);
        if (!source) return current;

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

        return {
          ...current,
          vault: [...current.vault, copy],
          navSections: duplicateNavPage(current.navSections, noteId, {
            type: "page",
            id,
            label: title,
          }),
          activePageId: id,
          recents: bumpRecent(current.recents, id),
        };
      });
    },
    [updateSession],
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      updateSession((current) => {
        const nextVault = current.vault.filter((note) => note.id !== noteId);
        const nextActive =
          current.activePageId === noteId
            ? (nextVault[0]?.id ?? DEFAULT_NOTE_ID)
            : current.activePageId;
        return {
          ...current,
          vault: nextVault,
          navSections: removeNavNode(current.navSections, noteId),
          recents: current.recents.filter((entry) => entry.id !== noteId),
          activePageId: nextActive,
        };
      });
    },
    [updateSession],
  );

  const exportNote = useCallback(
    (noteId: string) => {
      const note = vault.find((entry) => entry.id === noteId);
      if (!note) return;
      downloadNoteAsMarkdown(note.id, note.title, getNoteDoc(note));
    },
    [vault],
  );

  const sections = useMemo(() => {
    const composed: NoteNavSection[] = [buildRecentsSection(vault, recents), ...navSections];
    return decorateNavSections(filterNavSections(composed, searchQuery), activeNote.id);
  }, [vault, recents, navSections, searchQuery, activeNote.id]);

  return {
    activeBackendId,
    switchBackend,
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
    commitNoteTitle,
    duplicateNote,
    deleteNote,
    exportNote,
    activeNoteBacklinks,
    activeNoteWordCount,
    sections,
  };
}

export type NotesViewModel = ReturnType<typeof useNotesStub>;
