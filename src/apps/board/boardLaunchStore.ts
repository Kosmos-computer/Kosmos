/**
 * Pending Studio opens from the Board — Studio consumes on focus.
 */
import { create } from "zustand";

export interface BoardStudioLaunch {
  workItemId: string;
  sessionId?: string;
  projectId?: string | null;
  worktreePath?: string | null;
  composerText?: string;
  /** When true, create a fresh chat after applying workspace context. */
  startNewChat?: boolean;
  /** When true with composerText, auto-submit the first agent turn. */
  submitComposer?: boolean;
}

interface BoardLaunchStore {
  pending: BoardStudioLaunch | null;
  /** Work item waiting for the next real session id (after draft → persisted). */
  pendingLinkWorkItemId: string | null;
  request: (launch: BoardStudioLaunch) => void;
  peek: () => BoardStudioLaunch | null;
  consume: () => BoardStudioLaunch | null;
  armSessionLink: (workItemId: string) => void;
  consumeSessionLink: () => string | null;
}

export const useBoardLaunchStore = create<BoardLaunchStore>((set, get) => ({
  pending: null,
  pendingLinkWorkItemId: null,

  request: (launch) => set({ pending: launch }),

  peek: () => get().pending,

  consume: () => {
    const launch = get().pending;
    if (!launch) return null;
    set({ pending: null });
    return launch;
  },

  armSessionLink: (workItemId) => set({ pendingLinkWorkItemId: workItemId }),

  consumeSessionLink: () => {
    const id = get().pendingLinkWorkItemId;
    if (!id) return null;
    set({ pendingLinkWorkItemId: null });
    return id;
  },
}));
