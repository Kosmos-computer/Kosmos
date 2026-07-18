/**
 * Client-side worktree lifecycle flags (pin / sleep / archive).
 * Paths are absolute git worktree paths.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorktreeMeta {
  pinned: string[];
  sleeping: string[];
  archived: string[];
}

interface WorktreeMetaState extends WorktreeMeta {
  isPinned: (path: string) => boolean;
  isSleeping: (path: string) => boolean;
  isArchived: (path: string) => boolean;
  togglePinned: (path: string) => void;
  toggleSleeping: (path: string) => void;
  clearSleeping: (path: string) => void;
  archive: (path: string) => void;
  removeMeta: (path: string) => void;
}

function toggleIn(list: string[], path: string): string[] {
  return list.includes(path) ? list.filter((p) => p !== path) : [...list, path];
}

export const useWorktreeMetaStore = create<WorktreeMetaState>()(
  persist(
    (set, get) => ({
      pinned: [],
      sleeping: [],
      archived: [],
      isPinned: (path) => get().pinned.includes(path),
      isSleeping: (path) => get().sleeping.includes(path),
      isArchived: (path) => get().archived.includes(path),
      togglePinned: (path) => set((s) => ({ pinned: toggleIn(s.pinned, path) })),
      toggleSleeping: (path) => set((s) => ({ sleeping: toggleIn(s.sleeping, path) })),
      clearSleeping: (path) =>
        set((s) => ({ sleeping: s.sleeping.filter((p) => p !== path) })),
      archive: (path) =>
        set((s) => ({
          archived: s.archived.includes(path) ? s.archived : [...s.archived, path],
          sleeping: s.sleeping.filter((p) => p !== path),
        })),
      removeMeta: (path) =>
        set((s) => ({
          pinned: s.pinned.filter((p) => p !== path),
          sleeping: s.sleeping.filter((p) => p !== path),
          archived: s.archived.filter((p) => p !== path),
        })),
    }),
    { name: "arco-worktree-meta" },
  ),
);
