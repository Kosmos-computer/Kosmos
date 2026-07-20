/**
 * Per-conversation execution status for the Studio sidebar dots
 * (agent-canvas ConversationStatusDot semantics).
 *
 * Status is live client state — updated from chat streams and shell events —
 * not persisted on SessionSummary. Finished briefly shows a check, then
 * settles back to idle.
 */
import { create } from "zustand";

/** How long the finished check stays before fading back to idle. */
const FINISHED_TO_IDLE_MS = 4_000;

/** Mirrors OpenHands ExecutionStatus visuals we surface in the rail. */
export type ConversationExecutionStatus =
  | "idle"
  | "running"
  | "waiting"
  | "finished"
  | "paused"
  | "error";

interface ConversationStatusState {
  byId: Record<string, ConversationExecutionStatus>;
  setStatus: (sessionId: string, status: ConversationExecutionStatus) => void;
  /** Prefer this when a turn ends so waiting/error are not clobbered. */
  finishIfRunning: (sessionId: string) => void;
  getStatus: (sessionId: string) => ConversationExecutionStatus;
  migrate: (fromId: string, toId: string) => void;
  clear: (sessionId: string) => void;
}

const idleTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearIdleTimer(sessionId: string): void {
  const timer = idleTimers.get(sessionId);
  if (timer !== undefined) {
    clearTimeout(timer);
    idleTimers.delete(sessionId);
  }
}

function scheduleFinishedToIdle(sessionId: string): void {
  clearIdleTimer(sessionId);
  idleTimers.set(
    sessionId,
    setTimeout(() => {
      idleTimers.delete(sessionId);
      const current = useConversationStatusStore.getState().byId[sessionId];
      if (current === "finished") {
        useConversationStatusStore.getState().setStatus(sessionId, "idle");
      }
    }, FINISHED_TO_IDLE_MS),
  );
}

export const useConversationStatusStore = create<ConversationStatusState>((set, get) => ({
  byId: {},

  setStatus: (sessionId, status) => {
    if (!sessionId) return;
    set((s) => {
      if (s.byId[sessionId] === status) return s;
      return { byId: { ...s.byId, [sessionId]: status } };
    });
    if (status === "finished") {
      scheduleFinishedToIdle(sessionId);
    } else {
      clearIdleTimer(sessionId);
    }
  },

  finishIfRunning: (sessionId) => {
    if (!sessionId) return;
    const current = get().byId[sessionId];
    if (current === "running" || current === undefined) {
      get().setStatus(sessionId, "finished");
    }
  },

  getStatus: (sessionId) => get().byId[sessionId] ?? "idle",

  migrate: (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    clearIdleTimer(fromId);
    const status = get().byId[fromId];
    set((s) => {
      if (status === undefined) return s;
      const next = { ...s.byId, [toId]: status };
      delete next[fromId];
      return { byId: next };
    });
    if (status === "finished") scheduleFinishedToIdle(toId);
  },

  clear: (sessionId) => {
    if (!sessionId) return;
    clearIdleTimer(sessionId);
    set((s) => {
      if (!(sessionId in s.byId)) return s;
      const next = { ...s.byId };
      delete next[sessionId];
      return { byId: next };
    });
  },
}));

/** Non-hook helpers for stream / shell event paths outside React. */
export function setConversationStatus(
  sessionId: string | null | undefined,
  status: ConversationExecutionStatus,
): void {
  if (!sessionId) return;
  useConversationStatusStore.getState().setStatus(sessionId, status);
}

export function finishConversationIfRunning(sessionId: string | null | undefined): void {
  if (!sessionId) return;
  useConversationStatusStore.getState().finishIfRunning(sessionId);
}
