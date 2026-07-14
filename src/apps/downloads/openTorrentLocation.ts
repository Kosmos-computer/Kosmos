/**
 * Open Drive / reveal helpers used by the Downloads app.
 */
import { api } from "../../lib/api";
import { useDriveNavigateStore } from "../../os/driveNavigateStore";
import { useOsStore } from "../../os/osStore";
import { useWindowStore } from "../../os/windowStore";
import type { TorrentItem } from "./types";

export async function openTorrentInDrive(torrent: TorrentItem): Promise<void> {
  let folderId = torrent.driveFolderId;
  let selectId = torrent.driveFileIds[0];

  if (!folderId) {
    const updated = await api.downloadsEnsureDrive(torrent.id);
    folderId = updated.driveFolderId;
    selectId = updated.driveFileIds[0] ?? selectId;
  }

  if (!folderId) {
    useOsStore.getState().notify("Nothing in Drive yet — revealing on disk instead.");
    await api.downloadsReveal(torrent.savePath);
    return;
  }

  useDriveNavigateStore.getState().requestNavigate({
    folderId,
    selectId,
    folderName: torrent.name,
  });
  useWindowStore.getState().open({ type: "system", app: "files" }, "Files");
}

export async function revealTorrentOnDisk(torrent: TorrentItem): Promise<void> {
  const target =
    torrent.files.find((file) => file.path && file.progress >= 1)?.path ??
    torrent.files[0]?.path ??
    torrent.savePath;
  await api.downloadsReveal(target);
}

export async function revealTorrentFileOnDisk(filePath: string): Promise<void> {
  await api.downloadsReveal(filePath);
}

export async function openTorrentFileInDrive(
  torrent: TorrentItem,
  fileName: string,
): Promise<void> {
  let folderId = torrent.driveFolderId;
  let fileIds = torrent.driveFileIds;

  if (!folderId || fileIds.length === 0) {
    const updated = await api.downloadsEnsureDrive(torrent.id);
    folderId = updated.driveFolderId;
    fileIds = updated.driveFileIds;
  }

  if (!folderId) {
    const file = torrent.files.find((entry) => entry.name === fileName || entry.name.endsWith(fileName));
    if (file?.path) {
      await api.downloadsReveal(file.path);
      return;
    }
    throw new Error("File is not in Drive yet");
  }

  // Match imported Drive file by basename when possible.
  let selectId = fileIds[0];
  try {
    const children = await api.listDriveEntries({ parentId: folderId });
    const base = fileName.split("/").pop() ?? fileName;
    const match = children.find((entry) => entry.name === base);
    if (match) selectId = match.id;
  } catch {
    // Fall back to first imported file.
  }

  useDriveNavigateStore.getState().requestNavigate({
    folderId,
    selectId,
    folderName: torrent.name,
  });
  useWindowStore.getState().open({ type: "system", app: "files" }, "Files");
}

function importedCount(result: unknown): number {
  if (Array.isArray(result)) return result.length;
  if (result && typeof result === "object") return 1;
  return 0;
}

export async function addTorrentAudioToMusic(torrent: TorrentItem): Promise<void> {
  const result = await api.musicImport({ torrentId: torrent.id });
  const count = importedCount(result);
  useOsStore
    .getState()
    .notify(
      count > 0
        ? `Added ${count} track${count === 1 ? "" : "s"} to Music`
        : "No new audio was added to Music",
    );
  useWindowStore.getState().open({ type: "system", app: "music" }, "Music");
}

export async function addTorrentFileToMusic(
  torrent: TorrentItem,
  fileName: string,
): Promise<void> {
  const result = await api.musicImport({ torrentId: torrent.id, fileName });
  const count = importedCount(result);
  useOsStore
    .getState()
    .notify(
      count > 0
        ? `Added ${count} track${count === 1 ? "" : "s"} to Music`
        : "That track is already in Music",
    );
  useWindowStore.getState().open({ type: "system", app: "music" }, "Music");
}
