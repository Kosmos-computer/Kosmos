/**
 * Unread agent session tracking — mark when an agent finishes / waits while
 * the session is not focused; clear on select.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UnreadState {
  unreadIds: string[];
  markUnread: (sessionId: string) => void;
  clearUnread: (sessionId: string) => void;
  isUnread: (sessionId: string) => boolean;
  toggleUnread: (sessionId: string) => void;
}

export const useUnreadSessionsStore = create<UnreadState>()(
  persist(
    (set, get) => ({
      unreadIds: [],
      markUnread: (sessionId) =>
        set((s) =>
          s.unreadIds.includes(sessionId) ? s : { unreadIds: [...s.unreadIds, sessionId] },
        ),
      clearUnread: (sessionId) =>
        set((s) => ({ unreadIds: s.unreadIds.filter((id) => id !== sessionId) })),
      isUnread: (sessionId) => get().unreadIds.includes(sessionId),
      toggleUnread: (sessionId) => {
        const { unreadIds } = get();
        if (unreadIds.includes(sessionId)) {
          set({ unreadIds: unreadIds.filter((id) => id !== sessionId) });
        } else {
          set({ unreadIds: [...unreadIds, sessionId] });
        }
      },
    }),
    { name: "arco-unread-sessions" },
  ),
);
