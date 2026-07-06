/**
 * Route a Drive file to the editor app that owns its mime type.
 * Returns whether the caller should fall back to the inline text editor.
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
const CALENDAR_APP_ID = "core.calendar";

export type OpenDriveFileResult = "routed" | "inline" | "unsupported";

export function openDriveFile(file: DriveFileItem): OpenDriveFileResult {
  if (file.kind === "folder") return "unsupported";

  const wm = useWindowStore.getState();
  const os = useOsStore.getState();
  const launch = useDocumentLaunchStore.getState();

  if (file.mimeType === DOC_MIME || file.kind === "doc") {
    const docs = os.installedApps.find((entry) => entry.manifest.id === DOCS_APP_ID);
    if (!docs?.enabled) {
      os.notify("Enable Docs in Settings to open documents.");
      return "unsupported";
    }
    launch.requestOpen(installedLaunchKey(DOCS_APP_ID), file.id);
    wm.open({ type: "installed", appId: DOCS_APP_ID }, file.name);
    return "routed";
  }

  if (file.mimeType === SHEET_MIME || file.kind === "sheet") {
    launch.requestOpen(systemLaunchKey("sheets"), file.id);
    wm.open({ type: "system", app: "sheets" }, file.name);
    return "routed";
  }

  if (file.mimeType === SLIDES_MIME || file.kind === "slides") {
    os.notify("Slides editor is not available yet.");
    return "unsupported";
  }

  if (file.mimeType === TASK_MIME || file.kind === "task") {
    launch.requestOpen(systemLaunchKey("tasks"), file.id);
    wm.open({ type: "system", app: "tasks" }, file.name);
    return "routed";
  }

  if (file.mimeType === SCHEDULE_MIME || file.kind === "schedule") {
    const calendar = os.installedApps.find((entry) => entry.manifest.id === CALENDAR_APP_ID);
    if (!calendar?.enabled) {
      os.notify("Enable Calendar in Settings to open schedules.");
      return "unsupported";
    }
    launch.requestOpen(installedLaunchKey(CALENDAR_APP_ID), file.id);
    wm.open({ type: "installed", appId: CALENDAR_APP_ID }, file.name);
    return "routed";
  }

  if (isTextLikeMime(file.mimeType)) return "inline";

  os.notify(`No editor for ${file.kind} files yet.`);
  return "unsupported";
}
