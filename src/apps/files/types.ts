import type { LucideIcon } from "lucide-react";
import {
  Archive,
  CalendarDays,
  CheckSquare,
  Code2,
  FileText,
  Folder,
  Grid3X3,
  Image,
  Layers,
  Video,
} from "lucide-react";
import type { FileEntry } from "@shared/capabilities/files";
import { DOC_MIME, FOLDER_MIME, isBinaryMime, SCHEDULE_MIME, SHEET_MIME, SLIDES_MIME, TASK_MIME } from "@shared/capabilities/files";

export type FileKind =
  | "folder"
  | "doc"
  | "sheet"
  | "slides"
  | "task"
  | "schedule"
  | "pdf"
  | "image"
  | "video"
  | "code"
  | "archive"
  | "other";

/** File types available from the Drive "New" menu. */
export type DriveNewFileType = "doc" | "sheet" | "slides" | "task" | "schedule";

/** All creatable items from the Drive "New" menu, including folders. */
export type DriveNewItemType = DriveNewFileType | "folder";

export type FilesViewMode = "list" | "grid" | "gallery";

export type FilesLocation = "home" | "drive" | "recent" | "starred" | "trash";

export interface DriveFileItem {
  id: string;
  name: string;
  kind: FileKind;
  itemCount?: number;
  sizeLabel?: string;
  modifiedLabel?: string;
  owner?: { name: string };
  starred?: boolean;
  previewText?: string;
  mimeType: string;
  parentId: string | null;
}

export interface DriveCrumb {
  id: string | null;
  label: string;
}

export const FILE_KIND_ICON: Record<FileKind, LucideIcon> = {
  folder: Folder,
  doc: FileText,
  sheet: Grid3X3,
  slides: Layers,
  task: CheckSquare,
  schedule: CalendarDays,
  pdf: FileText,
  image: Image,
  video: Video,
  code: Code2,
  archive: Archive,
  other: FileText,
};

export const FILE_KIND_TONE: Record<FileKind, string> = {
  folder: "neutral",
  doc: "accent",
  sheet: "success",
  slides: "warning",
  task: "accent",
  schedule: "accent",
  pdf: "danger",
  image: "accent",
  video: "accent",
  code: "neutral",
  archive: "neutral",
  other: "neutral",
};

export function formatDriveSize(bytes: number): string {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDriveDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const diffMs = today.getTime() - date.getTime();
  if (diffMs < 60 * 60 * 1000) return `${Math.max(1, Math.round(diffMs / 60000))}m ago`;
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function mimeToFileKind(entry: FileEntry): FileKind {
  if (entry.mimeType === FOLDER_MIME) return "folder";
  if (entry.mimeType === DOC_MIME || entry.mimeType === "text/markdown") return "doc";
  if (entry.mimeType === SHEET_MIME) return "sheet";
  if (entry.mimeType === SLIDES_MIME) return "slides";
  if (entry.mimeType === TASK_MIME) return "task";
  if (entry.mimeType === SCHEDULE_MIME) return "schedule";
  if (entry.mimeType === "application/pdf") return "pdf";
  if (entry.mimeType.startsWith("image/")) return "image";
  if (entry.mimeType.startsWith("video/")) return "video";
  if (/\.(ts|tsx|js|jsx|py|rs|go|json)$/i.test(entry.name) || entry.mimeType.includes("json")) return "code";
  if (/\.(zip|tar|gz|tgz)$/i.test(entry.name)) return "archive";
  return "other";
}

export function entryToDriveItem(entry: FileEntry, ownerName: string, childCount?: number): DriveFileItem {
  const kind = mimeToFileKind(entry);
  return {
    id: entry.id,
    name: entry.name,
    kind,
    itemCount: kind === "folder" ? childCount : undefined,
    sizeLabel: kind === "folder" ? undefined : formatDriveSize(entry.size),
    modifiedLabel: formatDriveDate(entry.updatedAt),
    owner: { name: ownerName },
    starred: entry.starred,
    mimeType: entry.mimeType,
    parentId: entry.parentId,
  };
}

export function isTextLikeMime(mimeType: string): boolean {
  return !isBinaryMime(mimeType) && /^(text\/|application\/(json|x-os-[a-z-]+\+json)$)/.test(mimeType);
}
