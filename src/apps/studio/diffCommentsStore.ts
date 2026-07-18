/**
 * In-memory store for Studio diff review comments (session-scoped).
 */
import { create } from "zustand";
import type { DiffComment } from "@shared/diffComments";

interface DiffCommentsState {
  comments: DiffComment[];
  addComment: (filePath: string, lineNumber: number, body: string) => DiffComment;
  removeComment: (id: string) => void;
  clearSent: () => void;
  markAllSent: () => void;
  pendingForFile: (filePath: string) => DiffComment[];
  pendingAll: () => DiffComment[];
}

function uid(): string {
  return `dc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useDiffCommentsStore = create<DiffCommentsState>((set, get) => ({
  comments: [],
  addComment: (filePath, lineNumber, body) => {
    const comment: DiffComment = {
      id: uid(),
      filePath,
      lineNumber,
      body: body.trim(),
      createdAt: Date.now(),
    };
    set((s) => ({ comments: [...s.comments, comment] }));
    return comment;
  },
  removeComment: (id) => set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),
  clearSent: () => set((s) => ({ comments: s.comments.filter((c) => !c.sentAt) })),
  markAllSent: () =>
    set((s) => ({
      comments: s.comments.map((c) => (c.sentAt ? c : { ...c, sentAt: Date.now() })),
    })),
  pendingForFile: (filePath) =>
    get().comments.filter((c) => c.filePath === filePath && !c.sentAt),
  pendingAll: () => get().comments.filter((c) => !c.sentAt),
}));
