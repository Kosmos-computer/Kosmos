import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@arco/editor-kit";
import { EMPTY_DOC, exportDocToMarkdown } from "@arco/editor-kit";
import { countBacklinks } from "./buildNotesGraph";
import { downloadNoteAsMarkdown } from "./noteActions";
import { getNoteDoc } from "./noteDocConvert";
import {
  createNoteFile,
  createNoteFolder,
  librarySectionWithExpanded,
  loadNotesVault,
  moveDriveEntry,
  noteFileNameFromTitle,
  readNoteDoc,
  renameDriveEntry,
  trashDriveEntry,
  writeNoteDoc,
} from "./notesDriveApi";
import {
  DEFAULT_NAV_SECTION_ID,
  EMPTY_LIBRARY_SECTION,
  LOCAL_NOTES_BACKEND_ID,
  RECENTS_SECTION_ID,
} from "./notesMock";
import {
  findNavNodeLocation,
  filterNavSections,
  folderPathLabels,
  getNavNode,
  type NavDropPosition,
} from "./notesNavUtils";
import {
  defaultNotesBackendId,
  notesBackendLabel,
  resolveNotesVaultEndpoint,
} from "./notesVaultTarget";
import type { NoteNavSection, NotePage } from "./types";
import { useOsStore } from "../../os/osStore";

const SAVE_DEBOUNCE_MS = 450;
const EXPANDED_KEY = "arco.notes.expandedFolders.v1";
const ACTIVE_NOTE_KEY = "arco.notes.activeNote.v1";
const BACKEND_KEY = "arco.notes.activeBackend.v1";

function readJsonRecord(key: string): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeJsonRecord(key: string, value: Record<string, string[]>): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function readStringMap(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStringMap(key: string, value: Record<string, string>): void {
  localStorage.setItem(key, JSON.stringify(value));
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
        return { ...node, active: node.id === activeNoteId } as typeof node & {
          active?: boolean;
        };
      }
      return { ...node, children: decorateItems(node.children) };
    });
  }
  return sections.map((section) => ({ ...section, items: decorateItems(section.items) }));
}

function buildRecentsSection(notes: NotePage[], recentIds: string[]): NoteNavSection {
  const byId = new Map(notes.map((note) => [note.id, note]));
  const items = recentIds.flatMap((id) => {
    const note = byId.get(id);
    if (!note) return [];
    return [{ type: "page" as const, id: note.id, label: note.title }];
  });
  return {
    id: RECENTS_SECTION_ID,
    title: "Recents",
    allowCreate: false,
    allowDrag: false,
    items,
  };
}

function emptyNote(): NotePage {
  return {
    id: "",
    title: "Untitled",
    doc: structuredClone(EMPTY_DOC) as JSONContent,
  };
}

/** Drive-backed notes vault — Local and Kosmos Cloud each use that host's Notes folder. */
export function useNotesStore() {
  const notify = useOsStore((s) => s.notify);
  const [activeBackendId, setActiveBackendId] = useState(() => {
    const saved = readStringMap(BACKEND_KEY).current;
    return saved || defaultNotesBackendId();
  });
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [vault, setVault] = useState<NotePage[]>([]);
  const [librarySection, setLibrarySection] = useState<NoteNavSection>(EMPTY_LIBRARY_SECTION);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [activePageId, setActivePageId] = useState("");
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>(() => {
    return readJsonRecord(EXPANDED_KEY)[activeBackendId] ?? [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [searchQuery, setSearchQuery] = useState("");
  const saveTimerRef = useRef<number | null>(null);
  const loadGenRef = useRef(0);

  const endpoint = useMemo(
    () => resolveNotesVaultEndpoint(activeBackendId),
    [activeBackendId],
  );

  const persistExpanded = useCallback(
    (backendId: string, ids: string[]) => {
      const map = readJsonRecord(EXPANDED_KEY);
      map[backendId] = ids;
      writeJsonRecord(EXPANDED_KEY, map);
    },
    [],
  );

  const reloadVault = useCallback(
    async (backendId: string, preferredNoteId?: string | null) => {
      const gen = ++loadGenRef.current;
      setLoading(true);
      setError(null);
      try {
        const expanded = readJsonRecord(EXPANDED_KEY)[backendId] ?? [];
        const loaded = await loadNotesVault(resolveNotesVaultEndpoint(backendId), expanded);
        if (gen !== loadGenRef.current) return;

        setRootFolderId(loaded.rootFolderId);
        setVault(loaded.notes);
        setLibrarySection(loaded.librarySection);
        setExpandedFolderIds(loaded.expandedFolderIds);
        persistExpanded(backendId, loaded.expandedFolderIds);

        const recentFromDrive = loaded.recentEntries.map((entry) => entry.id);
        setRecentIds(recentFromDrive);

        const savedActive = readStringMap(ACTIVE_NOTE_KEY)[backendId];
        const nextActive =
          (preferredNoteId && loaded.notes.some((note) => note.id === preferredNoteId)
            ? preferredNoteId
            : null) ||
          (savedActive && loaded.notes.some((note) => note.id === savedActive)
            ? savedActive
            : null) ||
          loaded.notes[0]?.id ||
          "";
        setActivePageId(nextActive);
        if (nextActive) {
          const map = readStringMap(ACTIVE_NOTE_KEY);
          map[backendId] = nextActive;
          writeStringMap(ACTIVE_NOTE_KEY, map);
        }
      } catch (err) {
        if (gen !== loadGenRef.current) return;
        const message =
          err instanceof Error ? err.message : "Could not load notes vault";
        setError(message);
        setVault([]);
        setLibrarySection(EMPTY_LIBRARY_SECTION);
        setRootFolderId(null);
        setActivePageId("");
        notify(
          `Notes (${notesBackendLabel(backendId)}): ${message}. ${
            backendId === LOCAL_NOTES_BACKEND_ID
              ? "Is the local backend running?"
              : "Try reconnecting Kosmos Cloud in Settings."
          }`,
        );
      } finally {
        if (gen === loadGenRef.current) setLoading(false);
      }
    },
    [notify, persistExpanded],
  );

  useEffect(() => {
    void reloadVault(activeBackendId);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [activeBackendId, reloadVault]);

  const activeNote = useMemo(
    () => vault.find((note) => note.id === activePageId) ?? vault[0] ?? emptyNote(),
    [vault, activePageId],
  );

  const activeNoteDoc = useMemo(() => getNoteDoc(activeNote), [activeNote]);

  const activeNoteBacklinks = useMemo(
    () => countBacklinks(vault, activeNote.id),
    [vault, activeNote.id],
  );

  const activeNoteWordCount = useMemo(() => countDocWords(activeNoteDoc), [activeNoteDoc]);

  const switchBackend = useCallback((backendId: string, _backendName?: string) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const map = readStringMap(BACKEND_KEY);
    map.current = backendId;
    writeStringMap(BACKEND_KEY, map);
    setSearchQuery("");
    setActiveBackendId(backendId);
  }, []);

  const selectPage = useCallback(
    (pageId: string) => {
      setActivePageId(pageId);
      setRecentIds((prev) => [pageId, ...prev.filter((id) => id !== pageId)].slice(0, 12));
      const map = readStringMap(ACTIVE_NOTE_KEY);
      map[activeBackendId] = pageId;
      writeStringMap(ACTIVE_NOTE_KEY, map);
    },
    [activeBackendId],
  );

  const goHome = useCallback(() => {
    const homeId = vault[0]?.id;
    if (homeId) selectPage(homeId);
    setSearchQuery("");
  }, [selectPage, vault]);

  const updateNoteDoc = useCallback(
    (noteId: string, doc: JSONContent) => {
      setVault((prev) =>
        prev.map((note) => (note.id === noteId ? { ...note, doc } : note)),
      );
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void writeNoteDoc(endpoint, noteId, doc).catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to save note");
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [endpoint, notify],
  );

  const updateNoteTitle = useCallback((noteId: string, title: string) => {
    setVault((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, title } : note)),
    );
    setLibrarySection((section) => ({
      ...section,
      items: mapPageLabel(section.items, noteId, title.trim() || "Untitled"),
    }));
  }, []);

  const commitNoteTitle = useCallback(
    (noteId: string, title: string) => {
      const trimmed = title.trim() || "Untitled";
      setVault((prev) =>
        prev.map((note) => (note.id === noteId ? { ...note, title: trimmed } : note)),
      );
      setLibrarySection((section) => ({
        ...section,
        items: mapPageLabel(section.items, noteId, trimmed),
      }));
      void renameDriveEntry(endpoint, noteId, noteFileNameFromTitle(trimmed)).catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to rename note");
      });
    },
    [endpoint, notify],
  );

  const createPage = useCallback(
    async (sectionId = DEFAULT_NAV_SECTION_ID, parentFolderId: string | null = null) => {
      if (!rootFolderId) return;
      const parentId =
        sectionId === RECENTS_SECTION_ID
          ? rootFolderId
          : (parentFolderId ?? rootFolderId);
      try {
        const entry = await createNoteFile(endpoint, parentId, "Untitled");
        await reloadVault(activeBackendId, entry.id);
        selectPage(entry.id);
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to create note");
      }
    },
    [activeBackendId, endpoint, notify, reloadVault, rootFolderId, selectPage],
  );

  const createFolder = useCallback(
    async (sectionId: string, parentFolderId: string | null = null) => {
      if (!rootFolderId) return;
      const parentId =
        sectionId === RECENTS_SECTION_ID
          ? rootFolderId
          : (parentFolderId ?? rootFolderId);
      try {
        const folder = await createNoteFolder(endpoint, parentId, "Untitled folder");
        const nextExpanded = [...new Set([...expandedFolderIds, folder.id, parentId].filter(Boolean))] as string[];
        setExpandedFolderIds(nextExpanded);
        persistExpanded(activeBackendId, nextExpanded);
        await reloadVault(activeBackendId, activePageId);
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to create folder");
      }
    },
    [
      activeBackendId,
      activePageId,
      endpoint,
      expandedFolderIds,
      notify,
      persistExpanded,
      reloadVault,
      rootFolderId,
    ],
  );

  const moveNavItem = useCallback(
    async (draggedId: string, targetId: string, position: NavDropPosition) => {
      if (!rootFolderId) return;
      const sections = [librarySection];
      const target = getNavNode(sections, targetId);
      const targetLoc = findNavNodeLocation(sections, targetId);
      if (!target || !targetLoc) return;

      let parentId: string | null = rootFolderId;
      if (position === "inside" && target.type === "folder") {
        parentId = target.id;
      } else if (targetLoc.parentId) {
        parentId = targetLoc.parentId;
      } else {
        parentId = rootFolderId;
      }

      try {
        await moveDriveEntry(endpoint, draggedId, parentId);
        if (position === "inside" && target.type === "folder") {
          const nextExpanded = [...new Set([...expandedFolderIds, target.id])];
          setExpandedFolderIds(nextExpanded);
          persistExpanded(activeBackendId, nextExpanded);
        }
        await reloadVault(activeBackendId, activePageId);
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to move item");
      }
    },
    [
      activeBackendId,
      activePageId,
      endpoint,
      expandedFolderIds,
      librarySection,
      notify,
      persistExpanded,
      reloadVault,
      rootFolderId,
    ],
  );

  const toggleFolderExpanded = useCallback(
    async (folderId: string) => {
      const expanded = expandedFolderIds.includes(folderId);
      const next = expanded
        ? expandedFolderIds.filter((id) => id !== folderId)
        : [...expandedFolderIds, folderId];
      setExpandedFolderIds(next);
      persistExpanded(activeBackendId, next);
      setLibrarySection((section) => librarySectionWithExpanded(section, folderId, !expanded));
      if (!expanded) {
        // Load children when expanding.
        await reloadVault(activeBackendId, activePageId);
      }
    },
    [
      activeBackendId,
      activePageId,
      expandedFolderIds,
      persistExpanded,
      reloadVault,
    ],
  );

  const duplicateNote = useCallback(
    async (noteId: string) => {
      if (!rootFolderId) return;
      const source = vault.find((note) => note.id === noteId);
      if (!source) return;
      try {
        const doc = source.doc ?? (await readNoteDoc(endpoint, noteId));
        const parentId = source.folder ?? rootFolderId;
        const entry = await createNoteFile(
          endpoint,
          parentId,
          `${source.title} copy`,
          doc,
        );
        await reloadVault(activeBackendId, entry.id);
        selectPage(entry.id);
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to duplicate note");
      }
    },
    [activeBackendId, endpoint, notify, reloadVault, rootFolderId, selectPage, vault],
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        await trashDriveEntry(endpoint, noteId);
        const remaining = vault.filter((note) => note.id !== noteId);
        const nextId = remaining[0]?.id ?? null;
        await reloadVault(activeBackendId, nextId);
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to delete note");
      }
    },
    [activeBackendId, endpoint, notify, reloadVault, vault],
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
    const composed: NoteNavSection[] = [
      buildRecentsSection(vault, recentIds),
      librarySection,
    ];
    return decorateNavSections(filterNavSections(composed, searchQuery), activeNote.id);
  }, [vault, recentIds, librarySection, searchQuery, activeNote.id]);

  const sourceLabel = useMemo(
    () => notesBackendLabel(activeBackendId),
    [activeBackendId],
  );

  const activeNoteFolderPath = useMemo(
    () => folderPathLabels([librarySection], activeNote.folder),
    [activeNote.folder, librarySection],
  );

  return {
    activeBackendId,
    sourceLabel,
    switchBackend,
    loading,
    error,
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
    createPage: (sectionId?: string, parentFolderId?: string | null) => {
      void createPage(sectionId, parentFolderId ?? null);
    },
    createFolder: (sectionId: string, parentFolderId: string | null = null) => {
      void createFolder(sectionId, parentFolderId);
    },
    moveNavItem: (draggedId: string, targetId: string, position: NavDropPosition) => {
      void moveNavItem(draggedId, targetId, position);
    },
    toggleFolderExpanded: (folderId: string) => {
      void toggleFolderExpanded(folderId);
    },
    updateNoteDoc,
    updateNoteTitle,
    commitNoteTitle,
    duplicateNote: (noteId: string) => {
      void duplicateNote(noteId);
    },
    exportNote,
    deleteNote: (noteId: string) => {
      void deleteNote(noteId);
    },
    activeNoteBacklinks,
    activeNoteWordCount,
    activeNoteFolderPath,
    sections,
  };
}

function mapPageLabel(
  nodes: NoteNavSection["items"],
  pageId: string,
  label: string,
): NoteNavSection["items"] {
  return nodes.map((node) => {
    if (node.type === "page") {
      return node.id === pageId ? { ...node, label } : node;
    }
    return { ...node, children: mapPageLabel(node.children, pageId, label) };
  });
}

export type NotesViewModel = ReturnType<typeof useNotesStore>;
