/**
 * Pending Drive navigation — Downloads (and others) can open Files at a folder
 * and optionally select a file once the Drive window mounts.
 */
import { create } from "zustand";

export interface DriveNavigateRequest {
  /** Folder to open; null = My Drive root. */
  folderId: string | null;
  /** Optional file/folder id to select after navigation. */
  selectId?: string;
  /** Crumb labels when we already know the path (folder name at least). */
  folderName?: string;
}

interface DriveNavigateStore {
  pending: DriveNavigateRequest | null;
  requestNavigate: (request: DriveNavigateRequest) => void;
  consume: () => DriveNavigateRequest | undefined;
}

export const useDriveNavigateStore = create<DriveNavigateStore>((set, get) => ({
  pending: null,

  requestNavigate: (request) => set({ pending: request }),

  consume: () => {
    const pending = get().pending;
    if (!pending) return undefined;
    set({ pending: null });
    return pending;
  },
}));
