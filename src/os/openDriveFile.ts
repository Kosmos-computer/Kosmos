/**
 * Route a Drive file to the editor app that owns its mime type.
 * Returns whether the caller should fall back to the inline text editor.
 *
 * Foreign office formats (ODT/DOCX/…) are imported via docs/sheets/slides
 * Import UI or `*.import` intents — not opened directly as JSON.
 */
import { DOC_MIME, SCHEDULE_MIME, SHEET_MIME, SLIDES_MIME, TASK_MIME } from "@shared/capabilities/files";
import type { DriveFileItem } from "../apps/files/types";
import { isTextLikeMime } from "../apps/files/types";
import {
  installedLaunchKey,
  systemLaunchKey,
  useDocumentLaunchStore,
} from "./documentLaunchStore";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";

const DOCS_APP_ID = "core.docs";
const SLIDES_APP_ID = "core.slides";

export type OpenDriveFileResult = "routed" | "inline" | "unsupported";

function openInstalled(appId: string, file: DriveFileItem, missingMessage: string): OpenDriveFileResult {
  const wm = useWindowStore.getState();
  const os = useOsStore.getState();
  const launch = useDocumentLaunchStore.getState();
  const app = os.installedApps.find((entry) => entry.manifest.id === appId);
  if (!app?.enabled) {
    os.notify(missingMessage);
    return "unsupported";
  }
  launch.requestOpen(installedLaunchKey(appId), file.id);
  wm.open({ type: "installed", appId }, file.name);
  return "routed";
}

export function openDriveFile(file: DriveFileItem): OpenDriveFileResult {
  if (file.kind === "folder") return "unsupported";

  const wm = useWindowStore.getState();
  const os = useOsStore.getState();
  const launch = useDocumentLaunchStore.getState();

  if (file.mimeType === DOC_MIME || file.kind === "doc") {
    return openInstalled(DOCS_APP_ID, file, "Enable Docs in Settings to open documents.");
  }

  if (file.mimeType === SHEET_MIME || file.kind === "sheet") {
    launch.requestOpen(systemLaunchKey("sheets"), file.id);
    wm.open({ type: "system", app: "sheets" }, file.name);
    return "routed";
  }

  if (file.mimeType === SLIDES_MIME || file.kind === "slides") {
    return openInstalled(SLIDES_APP_ID, file, "Enable Slides in Settings to open presentations.");
  }

  if (file.mimeType === TASK_MIME || file.kind === "task") {
    launch.requestOpen(systemLaunchKey("tasks"), file.id);
    wm.open({ type: "system", app: "tasks" }, file.name);
    return "routed";
  }

  if (file.mimeType === SCHEDULE_MIME || file.kind === "schedule") {
    launch.requestOpen(systemLaunchKey("calendar"), file.id);
    wm.open({ type: "system", app: "calendar" }, file.name);
    return "routed";
  }

  if (isTextLikeMime(file.mimeType)) return "inline";

  os.notify(`No editor for ${file.kind} files yet. Use Import in Docs, Sheets, or Slides for office formats.`);
  return "unsupported";
}
