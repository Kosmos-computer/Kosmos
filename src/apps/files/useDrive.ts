import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileEntry } from "@shared/capabilities/files";
import {
  DOC_MIME,
  FOLDER_MIME,
  SCHEDULE_MIME,
  SHEET_MIME,
  SLIDES_MIME,
  TASK_MIME,
} from "@shared/capabilities/files";
import { EMPTY_DOC_JSON } from "@shared/capabilities/docs";
import { EMPTY_SHEET_JSON } from "@shared/capabilities/sheets";
import { EMPTY_SLIDES_JSON } from "@shared/capabilities/slides";
import { api } from "../../lib/api";
import { onAppEvent } from "../../os/appEventBus";
import { useAuthStore } from "../../os/auth/authStore";
import { useDriveNavigateStore } from "../../os/driveNavigateStore";
import { openDriveFile } from "../../os/openDriveFile";
import {
  entryToDriveItem,
  type DriveCrumb,
  type DriveFileItem,
  type DriveNewItemType,
  defaultSortDir,
  driveCopyName,
  type DriveClipboard,
  type FilesKindFilter,
  type FilesLocation,
  type FilesSortBy,
  type FilesSortDir,
  type FilesViewMode,
  MUSIC_FOLDER_NAME,
} from "./types";

const NEW_FILE_DEFAULTS: Record<
  Exclude<DriveNewItemType, "folder">,
  { name: string; mimeType: string; content: string }
> = {
  doc: {
    name: "Untitled document.doc.json",
    mimeType: DOC_MIME,
    content: JSON.stringify(EMPTY_DOC_JSON),
  },
  sheet: {
    name: "Untitled spreadsheet.sheet.json",
    mimeType: SHEET_MIME,
    content: JSON.stringify(EMPTY_SHEET_JSON),
  },
  slides: {
    name: "Untitled presentation.slides.json",
    mimeType: SLIDES_MIME,
    content: JSON.stringify(EMPTY_SLIDES_JSON),
  },
  task: {
    name: "Untitled tasks.task.json",
    mimeType: TASK_MIME,
    content: JSON.stringify({ version: 1, title: "Untitled tasks", tasks: [] }),
  },
  schedule: {
    name: "Untitled schedule.schedule.json",
    mimeType: SCHEDULE_MIME,
    content: JSON.stringify({ version: 1, title: "Untitled schedule", events: [] }),
  },
};

export type DriveViewModel = ReturnType<typeof useDrive>;

/** Drive browser state — backed by os.files@1 via /api/drive. */
export function useDrive() {
  const user = useAuthStore((s) => s.user);
  const ownerName = user?.displayName ?? user?.username ?? "You";

  const [location, setLocation] = useState<FilesLocation>("drive");
  const [folderPath, setFolderPath] = useState<DriveCrumb[]>([{ id: null, label: "My Drive" }]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<FilesViewMode>("list");
  const [sortBy, setSortByState] = useState<FilesSortBy>("name");
  const [sortDir, setSortDir] = useState<FilesSortDir>("asc");
  const [kindFilter, setKindFilter] = useState<FilesKindFilter>("all");
  const sortByRef = useRef(sortBy);
  sortByRef.current = sortBy;

  const setSortBy = useCallback((next: FilesSortBy) => {
    if (sortByRef.current === next) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortByState(next);
    setSortDir(defaultSortDir(next));
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | undefined>();
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [previewWidth, setPreviewWidth] = useState(340);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorFile, setEditorFile] = useState<{ id: string; name: string; content: string; mimeType: string } | null>(
    null,
  );
  const [pdfFile, setPdfFile] = useState<{ id: string; name: string } | null>(null);
  const [shareFile, setShareFile] = useState<DriveFileItem | null>(null);
  const [moveFile, setMoveFile] = useState<DriveFileItem | null>(null);
  const [clipboard, setClipboard] = useState<DriveClipboard | null>(null);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const flashTimerRef = useRef<number | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const flashItems = useCallback((ids: string[]) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return;
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    setFlashIds(unique);
    flashTimerRef.current = window.setTimeout(() => {
      setFlashIds([]);
      flashTimerRef.current = null;
    }, 900);
  }, []);

  const currentFolderId = folderPath[folderPath.length - 1]?.id ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let next: FileEntry[];
      const query = searchQuery.trim();
      if (query) {
        next = await api.searchDrive(query);
      } else if (location === "starred") {
        next = await api.listDriveEntries({ starred: true });
      } else if (location === "trash") {
        next = await api.listDriveEntries({ trashed: true });
      } else if (location === "recent") {
        next = await api.listDriveRecent();
      } else if (location === "home") {
        next = await api.listDriveEntries({ parentId: null });
      } else {
        next = await api.listDriveEntries({ parentId: currentFolderId });
      }
      setEntries(next);
      setError(null);
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : "Could not load files");
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, location, searchQuery]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return onAppEvent((detail) => {
      if (detail.topic === "files.changed" || detail.topic === "shares.changed") {
        void refresh();
      }
    });
  }, [refresh]);

  useEffect(() => {
    const applyNavigate = async (pending: {
      folderId: string | null;
      selectId?: string;
    }) => {
      try {
        const crumbs: DriveCrumb[] = [{ id: null, label: "My Drive" }];
        if (pending.folderId) {
          const chain: DriveCrumb[] = [];
          let current: string | null = pending.folderId;
          while (current) {
            const entry = await api.getDriveEntry(current);
            chain.unshift({ id: entry.id, label: entry.name });
            current = entry.parentId;
          }
          crumbs.push(...chain);
        }
        setLocation("drive");
        setFolderPath(crumbs);
        setSelectedId(pending.selectId ?? null);
        setSearchQuery("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open Drive location");
      }
    };

    const existing = useDriveNavigateStore.getState().consume();
    if (existing) void applyNavigate(existing);

    return useDriveNavigateStore.subscribe((state, prev) => {
      if (!state.pending || state.pending === prev.pending) return;
      const pending = useDriveNavigateStore.getState().consume();
      if (pending) void applyNavigate(pending);
    });
  }, []);

  const files: DriveFileItem[] = useMemo(() => {
    const entryById = new Map(entries.map((entry) => [entry.id, entry]));
    let items = entries.map((entry) => entryToDriveItem(entry, ownerName));
    if (kindFilter !== "all") {
      items = items.filter((file) => file.kind === kindFilter);
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (b.kind === "folder" && a.kind !== "folder") return 1;
      const left = entryById.get(a.id);
      const right = entryById.get(b.id);
      let cmp = 0;
      switch (sortBy) {
        case "modified": {
          const leftTime = left ? new Date(left.updatedAt).getTime() : 0;
          const rightTime = right ? new Date(right.updatedAt).getTime() : 0;
          cmp = leftTime - rightTime;
          break;
        }
        case "size": {
          cmp = (left?.size ?? 0) - (right?.size ?? 0);
          break;
        }
        case "owner":
          cmp = (a.owner?.name ?? "").localeCompare(b.owner?.name ?? "", undefined, { sensitivity: "base" });
          break;
        case "type":
          cmp = a.kind.localeCompare(b.kind);
          break;
        case "name":
        default:
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          break;
      }
      if (cmp === 0) {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      return cmp * dir;
    });
  }, [entries, kindFilter, ownerName, sortBy, sortDir]);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedId) ?? null,
    [files, selectedId],
  );

  useEffect(() => {
    if (!selectedFile || selectedFile.kind === "folder" || selectedFile.kind === "pdf") {
      setPreviewText(undefined);
      return;
    }
    let cancelled = false;
    void api
      .readDriveContent(selectedFile.id)
      .then((file) => {
        if (!cancelled) setPreviewText(file.content.slice(0, 1200));
      })
      .catch(() => {
        if (!cancelled) setPreviewText(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  const breadcrumb = useMemo(
    () =>
      folderPath.map((crumb, index) => ({
        label: crumb.label,
        onClick:
          index < folderPath.length - 1
            ? () => {
                if (crumb.label === "My Drive") {
                  setLocation("drive");
                } else if (crumb.label === MUSIC_FOLDER_NAME) {
                  setLocation("music");
                }
                setFolderPath(folderPath.slice(0, index + 1));
                setSelectedId(null);
              }
            : undefined,
      })),
    [folderPath],
  );

  const openFile = useCallback(
    async (file: DriveFileItem) => {
      if (file.kind === "folder") {
        if (location !== "music") setLocation("drive");
        setFolderPath((prev) => [...prev, { id: file.id, label: file.name }]);
        setSelectedId(null);
        return;
      }
      setSelectedId(file.id);
    },
    [location],
  );

  const openFileEditor = useCallback(async (file: DriveFileItem) => {
    if (file.kind === "folder") {
      if (location !== "music") setLocation("drive");
      setFolderPath((prev) => [...prev, { id: file.id, label: file.name }]);
      return;
    }
    if (file.kind === "pdf") {
      setPdfFile({ id: file.id, name: file.name });
      setEditorFile(null);
      return;
    }
    const route = openDriveFile(file);
    if (route === "routed" || route === "unsupported") return;
    try {
      const data = await api.readDriveContent(file.id);
      setEditorFile(data);
      setPdfFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open file");
    }
  }, [location]);

  const saveEditor = useCallback(async (content: string) => {
    if (!editorFile) return;
    await api.writeDriveContent(editorFile.id, content);
    setEditorFile((prev) => (prev ? { ...prev, content } : prev));
    await refresh();
  }, [editorFile, refresh]);

  const toggleStar = useCallback(
    async (id: string) => {
      const entry = entries.find((each) => each.id === id);
      if (!entry) return;
      await api.patchDriveEntry(id, { starred: !entry.starred });
      await refresh();
    },
    [entries, refresh],
  );

  const navigateToFolder = useCallback((folderId: string, folderName: string) => {
    setLocation((prev) => (prev === "music" ? "music" : "drive"));
    setFolderPath((prev) => {
      const atDriveRoot = (location !== "drive" && location !== "music") || prev.length <= 1;
      const base = atDriveRoot ? [{ id: null, label: "My Drive" }] : prev;
      return [...base, { id: folderId, label: folderName }];
    });
    setSelectedId(null);
  }, [location]);

  const createFolder = useCallback(async () => {
    const name = window.prompt("Folder name:");
    if (!name?.trim()) return;
    try {
      const entry = await api.createDriveEntry({
        name: name.trim(),
        kind: "folder",
        parentId: location === "drive" || location === "music" ? currentFolderId : null,
      });
      await refresh();
      navigateToFolder(entry.id, entry.name);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create folder");
    }
  }, [currentFolderId, location, navigateToFolder, refresh]);

  const createNew = useCallback(
    async (type: DriveNewItemType) => {
      if (type === "folder") {
        await createFolder();
        return;
      }

      const defaults = NEW_FILE_DEFAULTS[type];
      try {
        const entry = await api.createDriveEntry({
          name: defaults.name,
          kind: "file",
          mimeType: defaults.mimeType,
          parentId: location === "drive" || location === "music" ? currentFolderId : null,
          content: defaults.content,
        });
        await refresh();
        flashItems([entry.id]);
        const item = entryToDriveItem(entry, ownerName);
        openDriveFile(item);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create file");
      }
    },
    [createFolder, currentFolderId, flashItems, location, ownerName, refresh],
  );

  const trashFile = useCallback(
    async (id: string) => {
      await api.trashDriveEntry(id);
      if (selectedId === id) setSelectedId(null);
      await refresh();
    },
    [refresh, selectedId],
  );

  const restoreFile = useCallback(
    async (id: string) => {
      await api.restoreDriveEntry(id);
      await refresh();
    },
    [refresh],
  );

  const deleteForever = useCallback(
    async (id: string) => {
      if (!window.confirm("Permanently delete this item? This cannot be undone.")) return;
      await api.deleteDriveEntry(id);
      if (selectedId === id) setSelectedId(null);
      await refresh();
    },
    [refresh, selectedId],
  );

  const renameFile = useCallback(
    async (id: string, currentName: string) => {
      const name = window.prompt("New name:", currentName);
      if (!name?.trim() || name.trim() === currentName) return;
      try {
        await api.patchDriveEntry(id, { name: name.trim() });
        await refresh();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not rename item");
      }
    },
    [refresh],
  );

  const moveFileTo = useCallback(
    async (id: string, parentId: string | null) => {
      await api.patchDriveEntry(id, { parentId });
      if (selectedId === id) setSelectedId(null);
      await refresh();
      setError(null);
    },
    [refresh, selectedId],
  );

  const downloadFile = useCallback(async (file: DriveFileItem) => {
    try {
      await api.downloadDriveFile(file.id, file.name);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download file");
    }
  }, []);

  const cutFile = useCallback((file: DriveFileItem) => {
    setClipboard({ id: file.id, name: file.name, mode: "cut" });
  }, []);

  const copyFile = useCallback((file: DriveFileItem) => {
    setClipboard({ id: file.id, name: file.name, mode: "copy" });
  }, []);

  const duplicateEntryTree = useCallback(async (sourceId: string, parentId: string | null, name: string) => {
    const source = await api.getDriveEntry(sourceId);
    if (source.mimeType === FOLDER_MIME) {
      const folder = await api.createDriveEntry({
        name,
        kind: "folder",
        parentId,
      });
      const children = await api.listDriveEntries({ parentId: source.id });
      for (const child of children) {
        await duplicateEntryTree(child.id, folder.id, child.name);
      }
      return folder;
    }

    try {
      const text = await api.readDriveContent(source.id);
      return api.createDriveEntry({
        name,
        kind: "file",
        mimeType: source.mimeType,
        parentId,
        content: text.content,
      });
    } catch {
      const blob = await api.fetchDriveBlob(source.id);
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result ?? "");
          const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
          if (!base64) reject(new Error("Could not encode file"));
          else resolve(base64);
        };
        reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
        reader.readAsDataURL(blob);
      });
      return api.createDriveEntry({
        name,
        kind: "file",
        mimeType: source.mimeType,
        parentId,
        contentBase64,
      });
    }
  }, []);

  const duplicateFile = useCallback(
    async (file: DriveFileItem) => {
      try {
        const parentId = location === "drive" || location === "music" ? currentFolderId : file.parentId;
        const created = await duplicateEntryTree(file.id, parentId, driveCopyName(file.name));
        await refresh();
        flashItems([created.id]);
        setSelectedId(created.id);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not duplicate item");
      }
    },
    [currentFolderId, duplicateEntryTree, flashItems, location, refresh],
  );

  const pasteClipboard = useCallback(
    async (intoFolderId?: string | null) => {
      if (!clipboard) return;
      const parentId =
        intoFolderId !== undefined
          ? intoFolderId
          : location === "drive" || location === "music"
            ? currentFolderId
            : null;
      try {
        if (clipboard.mode === "cut") {
          await api.patchDriveEntry(clipboard.id, { parentId });
          const movedId = clipboard.id;
          setClipboard(null);
          await refresh();
          flashItems([movedId]);
          setSelectedId(movedId);
        } else {
          const created = await duplicateEntryTree(clipboard.id, parentId, driveCopyName(clipboard.name));
          await refresh();
          flashItems([created.id]);
          setSelectedId(created.id);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not paste item");
      }
    },
    [clipboard, currentFolderId, duplicateEntryTree, flashItems, location, refresh],
  );

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      const parentId = location === "drive" || location === "music" ? currentFolderId : null;
      try {
        const createdIds: string[] = [];
        for (const file of files) {
          const created = await api.uploadDriveFile(file, parentId);
          createdIds.push(created.id);
        }
        await refresh();
        flashItems(createdIds);
        if (createdIds[0]) setSelectedId(createdIds[0]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not upload file");
      }
    },
    [currentFolderId, flashItems, location, refresh],
  );

  const triggerUpload = useCallback(() => {
    uploadInputRef.current?.click();
  }, []);

  const selectLocation = useCallback((next: FilesLocation) => {
    setLocation(next);
    setSearchQuery("");
    setSelectedId(null);
    if (next === "drive") {
      setFolderPath([{ id: null, label: "My Drive" }]);
      return;
    }
    if (next === "music") {
      void (async () => {
        try {
          const root = await api.listDriveEntries({ parentId: null });
          const musicFolder = root.find(
            (entry) => entry.name === MUSIC_FOLDER_NAME && entry.mimeType === FOLDER_MIME,
          );
          if (musicFolder) {
            setFolderPath([
              { id: null, label: "My Drive" },
              { id: musicFolder.id, label: MUSIC_FOLDER_NAME },
            ]);
            setError(null);
          } else {
            setFolderPath([{ id: null, label: MUSIC_FOLDER_NAME }]);
            setError("Music folder not found — restart the server to seed Drive.");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not open Music folder");
        }
      })();
    }
  }, []);

  return {
    location,
    setLocation: selectLocation,
    folderPath,
    files,
    breadcrumb,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    sortDir,
    setSortBy,
    kindFilter,
    setKindFilter,
    selectedId,
    setSelectedId,
    selectedFile,
    previewText,
    sidebarWidth,
    setSidebarWidth,
    previewWidth,
    setPreviewWidth,
    loading,
    error,
    editorFile,
    setEditorFile,
    pdfFile,
    setPdfFile,
    shareFile,
    setShareFile,
    moveFile,
    setMoveFile,
    clipboard,
    flashIds,
    uploadInputRef,
    openFile,
    openFileEditor,
    saveEditor,
    toggleStar,
    createFolder,
    createNew,
    trashFile,
    restoreFile,
    deleteForever,
    renameFile,
    moveFileTo,
    downloadFile,
    cutFile,
    copyFile,
    duplicateFile,
    pasteClipboard,
    uploadFiles,
    triggerUpload,
    refresh,
  };
}
