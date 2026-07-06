/**
 * Pending file opens — when Drive (or the agent) launches an editor app with a
 * specific document, the target app reads and consumes the file id on mount.
 */
import { create } from "zustand";

/** Window-store key for an installed app. */
export function installedLaunchKey(appId: string): string {
  return `installed:${appId}`;
}

/** Window-store key for a system app. */
export function systemLaunchKey(appId: string): string {
  return `system:${appId}`;
}

interface DocumentLaunchStore {
  pendingByTarget: Record<string, string>;
  requestOpen: (targetKey: string, fileId: string) => void;
  peek: (targetKey: string) => string | undefined;
  consume: (targetKey: string) => string | undefined;
}

export const useDocumentLaunchStore = create<DocumentLaunchStore>((set, get) => ({
  pendingByTarget: {},

  requestOpen: (targetKey, fileId) => {
    set((state) => ({
      pendingByTarget: { ...state.pendingByTarget, [targetKey]: fileId },
    }));
  },

  peek: (targetKey) => get().pendingByTarget[targetKey],

  consume: (targetKey) => {
    const fileId = get().pendingByTarget[targetKey];
    if (!fileId) return undefined;
    set((state) => {
      const next = { ...state.pendingByTarget };
      delete next[targetKey];
      return { pendingByTarget: next };
    });
    return fileId;
  },
}));
