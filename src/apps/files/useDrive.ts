import { useCallback, useEffect, useMemo, useState } from "react";
import type { FileEntry } from "@shared/capabilities/files";
import {
  DOC_MIME,
  SCHEDULE_MIME,
  SHEET_MIME,
  SLIDES_MIME,
  TASK_MIME,
} from "@shared/capabilities/files";
import { EMPTY_DOC_JSON } from "@shared/capabilities/docs";
import { EMPTY_SHEET_JSON } from "@shared/capabilities/sheets";
import { api } from "../../lib/api";
import { useAuthStore } from "../../os/auth/authStore";
import { openDriveFile } from "../../os/openDriveFile";
import {
  entryToDriveItem,
  type DriveCrumb,
  type DriveFileItem,
  type DriveNewItemType,
  type FilesLocation,
  type FilesViewMode,
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
    content: JSON.stringify({
      version: 1,
      title: "Untitled presentation",
      slides: [{ id: "slide-1", title: "Slide 1", boxes: [] }],
    }),
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

  const files: DriveFileItem[] = useMemo(
    () => entries.map((entry) => entryToDriveItem(entry, ownerName)),
    [entries, ownerName],
  );

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
                setLocation("drive");
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
        setLocation("drive");
        setFolderPath((prev) => [...prev, { id: file.id, label: file.name }]);
        setSelectedId(null);
        return;
      }
      setSelectedId(file.id);
    },
    [],
  );

  const openFileEditor = useCallback(async (file: DriveFileItem) => {
    if (file.kind === "folder") {
      setLocation("drive");
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
  }, []);

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
    setLocation("drive");
    setFolderPath((prev) => {
      const atDriveRoot = location !== "drive" || prev.length <= 1;
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
        parentId: location === "drive" ? currentFolderId : null,
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
          parentId: location === "drive" ? currentFolderId : null,
          content: defaults.content,
        });
        await refresh();
        const item = entryToDriveItem(entry, ownerName);
        openDriveFile(item);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create file");
      }
    },
    [createFolder, currentFolderId, location, ownerName, refresh],
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

  const selectLocation = useCallback((next: FilesLocation) => {
    setLocation(next);
    setSearchQuery("");
    setSelectedId(null);
    if (next === "drive") {
      setFolderPath([{ id: null, label: "My Drive" }]);
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
    openFile,
    openFileEditor,
    saveEditor,
    toggleStar,
    createFolder,
    createNew,
    trashFile,
    restoreFile,
    deleteForever,
    refresh,
  };
}
