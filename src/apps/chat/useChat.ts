/**
 * Chat state — one hook drives the thread: streaming text deltas, tool-call
 * lifecycle, session load/switch, and routing shell events (os_ui,
 * apps_changed) to the OS stores while the stream is live.
 *
 * Each conversation keeps its own in-memory buffer so switching sidebar tabs
 * does not paint another session's stream into the visible thread. Background
 * streams keep updating their session bucket until the turn finishes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceEvent } from "@shared/capabilities/voice";
import type { AgentEvent, ConfirmOption, Session, SessionSummary } from "@shared/types";
import { api, streamChat } from "../../lib/api";
import { handleShellEvent } from "../../os/osActions";
import { useOsStore } from "../../os/osStore";
import {
  DRAFT_SESSION_KEY,
  useStudioStore,
} from "../studio/studioStore";

export type ChatItem =
  | { kind: "user"; id: string; text: string; timestamp?: string }
  | { kind: "assistant"; id: string; text: string; streaming: boolean; timestamp?: string }
  | {
      kind: "tool";
      id: string;
      callId: string;
      name: string;
      args: Record<string, unknown>;
      result?: string;
    }
  /** A paused action; approved is undefined while pending. `options` present
   *  means the extended policy card (allow once/session/always/deny). */
  | {
      kind: "confirm";
      id: string;
      confirmId: string;
      command: string;
      approved?: boolean;
      options?: ConfirmOption[];
    }
  | { kind: "error"; id: string; text: string; code?: "credits_insufficient" }
  | {
      kind: "thought";
      id: string;
      text: string;
      duration?: number | "brief";
      defaultOpen?: boolean;
    }
  | {
      kind: "todo";
      id: string;
      items: { id: string; label: string; status: "pending" | "active" | "completed" }[];
    }
  | { kind: "status"; id: string; text: string };

/** Live token/time readout for the in-flight turn — shown beside the "Working…" status. */
export interface TurnMeta {
  startedAt: number;
  totalTokens: number;
}

/** Unsaved composer thread before the server assigns a session id. */
const DRAFT_KEY = "__draft__";

interface SessionBuffer {
  items: ChatItem[];
  streaming: boolean;
  turnMeta: TurnMeta | null;
}

interface QueuedTurn {
  text: string;
  opts?: {
    mode?: "agent" | "ask";
    approvalMode?: "strict" | "smart" | "full";
    profileId?: string | null;
    toolsetIds?: string[];
  };
}

function emptyBuffer(): SessionBuffer {
  return { items: [], streaming: false, turnMeta: null };
}

let itemCounter = 0;
function nextId(): string {
  return `item_${++itemCounter}`;
}

/** Reconstruct the rendered thread from persisted session messages. */
export function sessionToFeed(session: Session): ChatItem[] {
  const items: ChatItem[] = [];
  const toolItems = new Map<string, Extract<ChatItem, { kind: "tool" }>>();
  for (const m of session.messages) {
    if (m.role === "user") {
      items.push({ kind: "user", id: nextId(), text: m.content, timestamp: m.timestamp });
    } else if (m.role === "assistant") {
      if (m.content.trim()) {
        items.push({
          kind: "assistant",
          id: nextId(),
          text: m.content,
          streaming: false,
          timestamp: m.timestamp,
        });
      }
      for (const tc of m.toolCalls ?? []) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.arguments || "{}") as Record<string, unknown>;
        } catch {
          // Unparseable args stay empty.
        }
        const item: Extract<ChatItem, { kind: "tool" }> = {
          kind: "tool",
          id: nextId(),
          callId: tc.id,
          name: tc.name,
          args,
        };
        toolItems.set(tc.id, item);
        items.push(item);
      }
    } else {
      const target = toolItems.get(m.toolCallId);
      if (target) target.result = m.content;
    }
  }
  return items;
}

/**
 * Map an assistant feed bubble back to its persisted message index.
 * Prefers content+timestamp, then Nth non-empty assistant message in the feed.
 */
export function findForkMessageIndex(
  session: Session,
  item: Extract<ChatItem, { kind: "assistant" }>,
  feedItems: ChatItem[],
): number {
  if (session.messages.length === 0) return 0;

  if (item.timestamp) {
    for (let i = 0; i < session.messages.length; i++) {
      const m = session.messages[i];
      if (
        m?.role === "assistant" &&
        m.content === item.text &&
        m.timestamp === item.timestamp
      ) {
        return i;
      }
    }
  }

  const occurrence = feedItems
    .filter((it): it is Extract<ChatItem, { kind: "assistant" }> => it.kind === "assistant")
    .findIndex((it) => it.id === item.id);

  if (occurrence >= 0) {
    let seen = 0;
    for (let i = 0; i < session.messages.length; i++) {
      const m = session.messages[i];
      if (m?.role !== "assistant" || !m.content.trim()) continue;
      if (seen === occurrence) return i;
      seen += 1;
    }
  }

  for (let i = session.messages.length - 1; i >= 0; i--) {
    const m = session.messages[i];
    if (m?.role === "assistant" && m.content === item.text) return i;
  }

  return session.messages.length - 1;
}

/** User bubble that prompted this assistant reply (scan backward in the feed). */
export function findPrecedingUserItem(
  items: ChatItem[],
  assistant: Extract<ChatItem, { kind: "assistant" }>,
): Extract<ChatItem, { kind: "user" }> | null {
  const idx = items.findIndex((it) => it.id === assistant.id);
  if (idx < 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    const it = items[i];
    if (it?.kind === "user") return it;
  }
  return null;
}

/** Index of the user message that prompted the assistant turn at `assistantIndex`. */
export function findPrecedingUserMessageIndex(session: Session, assistantIndex: number): number {
  for (let i = assistantIndex - 1; i >= 0; i--) {
    if (session.messages[i]?.role === "user") return i;
  }
  return -1;
}

/**
 * Map a user feed bubble back to its persisted message index.
 * Prefers content+timestamp, then Nth user message in the feed.
 */
export function findUserMessageIndex(
  session: Session,
  item: Extract<ChatItem, { kind: "user" }>,
  feedItems: ChatItem[],
): number {
  if (session.messages.length === 0) return 0;

  if (item.timestamp) {
    for (let i = 0; i < session.messages.length; i++) {
      const m = session.messages[i];
      if (m?.role === "user" && m.content === item.text && m.timestamp === item.timestamp) {
        return i;
      }
    }
  }

  const occurrence = feedItems
    .filter((it): it is Extract<ChatItem, { kind: "user" }> => it.kind === "user")
    .findIndex((it) => it.id === item.id);

  if (occurrence >= 0) {
    let seen = 0;
    for (let i = 0; i < session.messages.length; i++) {
      const m = session.messages[i];
      if (m?.role !== "user") continue;
      if (seen === occurrence) return i;
      seen += 1;
    }
  }

  for (let i = session.messages.length - 1; i >= 0; i--) {
    const m = session.messages[i];
    if (m?.role === "user" && m.content === item.text) return i;
  }

  // Never return a non-user index — truncating at an assistant/tool index
  // leaves the original user turn in place, then send() appends another user
  // (consecutive users → provider 400).
  for (let i = session.messages.length - 1; i >= 0; i--) {
    if (session.messages[i]?.role === "user") return i;
  }
  return 0;
}

/** How many feed items sit after this one (for rewind confirmation copy). */
export function countItemsAfter(items: ChatItem[], itemId: string): number {
  const idx = items.findIndex((it) => it.id === itemId);
  if (idx < 0) return 0;
  return Math.max(0, items.length - idx - 1);
}

function applyAgentEvent(buffer: SessionBuffer, event: AgentEvent): void {
  switch (event.type) {
    case "text_delta":
      {
        const last = buffer.items[buffer.items.length - 1];
        if (last?.kind === "assistant" && last.streaming) {
          buffer.items = [
            ...buffer.items.slice(0, -1),
            { ...last, text: last.text + event.delta },
          ];
        } else {
          buffer.items = [
            ...buffer.items,
            {
              kind: "assistant",
              id: nextId(),
              text: event.delta,
              streaming: true,
              timestamp: new Date().toISOString(),
            },
          ];
        }
      }
      break;
    case "tool_start":
      buffer.items = [
        ...buffer.items.map((it) =>
          it.kind === "assistant" && it.streaming ? { ...it, streaming: false } : it,
        ),
        {
          kind: "tool",
          id: nextId(),
          callId: event.callId,
          name: event.name,
          args: event.args,
        },
      ];
      break;
    case "tool_end":
      buffer.items = buffer.items.map((it) =>
        it.kind === "tool" && it.callId === event.callId ? { ...it, result: event.result } : it,
      );
      break;
    case "confirm_required":
      buffer.items = [
        ...buffer.items,
        {
          kind: "confirm",
          id: nextId(),
          confirmId: event.confirmId,
          command: event.command,
          ...(event.options ? { options: event.options } : {}),
        },
      ];
      break;
    case "confirm_resolved":
      buffer.items = buffer.items.map((it) =>
        it.kind === "confirm" && it.confirmId === event.confirmId
          ? { ...it, approved: event.approved }
          : it,
      );
      break;
    case "error":
      buffer.items = [
        ...buffer.items,
        {
          kind: "error",
          id: nextId(),
          text: event.message,
          ...(event.code ? { code: event.code } : {}),
        },
      ];
      break;
    case "usage":
      buffer.turnMeta = buffer.turnMeta
        ? { ...buffer.turnMeta, totalTokens: event.totalTokens }
        : { startedAt: Date.now(), totalTokens: event.totalTokens };
      break;
    default:
      break;
  }
}

function anyBufferStreaming(buffers: Map<string, SessionBuffer>): boolean {
  for (const buf of buffers.values()) {
    if (buf.streaming) return true;
  }
  return false;
}

function collectStreamingSessions(buffers: Map<string, SessionBuffer>): string[] {
  const ids: string[] = [];
  for (const [key, buf] of buffers) {
    if (buf.streaming && key !== DRAFT_KEY) ids.push(key);
  }
  return ids;
}

/** Short-lived undo after restore — cleared on next send (Cursor “Redo checkpoint”). */
export interface PendingRestoreUndo {
  sessionKey: string;
  mode: "both" | "conversation" | "code";
  /** Feed snapshot before restore (used for draft / instant conversation redo). */
  previousItems: ChatItem[];
}

export function useChat(opts?: { activeProjectId?: string | null; persistedSessionKey?: string }) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingSessions, setStreamingSessions] = useState<string[]>([]);
  const [turnMeta, setTurnMeta] = useState<TurnMeta | null>(null);
  const [pendingRestoreUndo, setPendingRestoreUndo] = useState<PendingRestoreUndo | null>(null);
  const buffersRef = useRef<Map<string, SessionBuffer>>(new Map());
  const queuedTurnsRef = useRef<Map<string, QueuedTurn[]>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const detachedPollsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const activeKeyRef = useRef<string>(DRAFT_KEY);
  const setAgentBusy = useOsStore((s) => s.setAgentBusy);

  const activeProjectId = opts?.activeProjectId ?? null;
  const persistedSessionKey = opts?.persistedSessionKey;

  const persistActiveSession = useCallback((id?: string) => {
    if (!persistedSessionKey) return;
    try {
      if (id) localStorage.setItem(persistedSessionKey, id);
      else localStorage.removeItem(persistedSessionKey);
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
    }
  }, [persistedSessionKey]);

  const syncActive = useCallback((key: string) => {
    const buf = buffersRef.current.get(key) ?? emptyBuffer();
    setItems(buf.items);
    setStreaming(buf.streaming);
    setTurnMeta(buf.turnMeta);
    setSessionId(key === DRAFT_KEY ? undefined : key);
  }, []);

  const refreshStreamingSessions = useCallback(() => {
    setStreamingSessions(collectStreamingSessions(buffersRef.current));
    setAgentBusy(anyBufferStreaming(buffersRef.current));
  }, [setAgentBusy]);

  const updateBuffer = useCallback(
    (key: string, updater: (buffer: SessionBuffer) => void) => {
      const current = buffersRef.current.get(key) ?? emptyBuffer();
      updater(current);
      buffersRef.current.set(key, current);
      if (activeKeyRef.current === key) syncActive(key);
      refreshStreamingSessions();
    },
    [syncActive, refreshStreamingSessions],
  );

  const migrateBuffer = useCallback(
    (from: string, to: string) => {
      const fromBuf = buffersRef.current.get(from);
      if (!fromBuf) return;
      buffersRef.current.delete(from);
      buffersRef.current.set(to, fromBuf);
      const ctrl = abortControllersRef.current.get(from);
      if (ctrl) {
        abortControllersRef.current.delete(from);
        abortControllersRef.current.set(to, ctrl);
      }
      const queued = queuedTurnsRef.current.get(from);
      if (queued) {
        queuedTurnsRef.current.delete(from);
        const existing = queuedTurnsRef.current.get(to) ?? [];
        queuedTurnsRef.current.set(to, [...existing, ...queued]);
      }
      if (activeKeyRef.current === from) {
        activeKeyRef.current = to;
        syncActive(to);
      }
      refreshStreamingSessions();
    },
    [syncActive, refreshStreamingSessions],
  );

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await api.listSessions());
    } catch {
      // Server unreachable — keep stale list.
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const loadSession = useCallback(
    async (id: string) => {
      activeKeyRef.current = id;
      persistActiveSession(id);
      useStudioStore.getState().setActiveSession(id);
      setPendingRestoreUndo((prev) => (prev?.sessionKey === id ? prev : null));
      const session = await api.getSession(id);
      if (!buffersRef.current.has(id)) {
        buffersRef.current.set(id, {
          items: sessionToFeed(session),
          streaming: false,
          turnMeta: null,
        });
      }
      syncActive(id);

      const status = await api.chatTurnStatus(id).catch(() => ({ active: false }));
      if (status.active && !detachedPollsRef.current.has(id)) {
        updateBuffer(id, (buf) => { buf.streaming = true; });
        const poll = setInterval(() => {
          void Promise.all([api.getSession(id), api.chatTurnStatus(id)]).then(([next, turn]) => {
            updateBuffer(id, (buf) => {
              buf.items = sessionToFeed(next);
              buf.streaming = turn.active;
            });
            if (!turn.active) {
              clearInterval(poll);
              detachedPollsRef.current.delete(id);
              void refreshSessions();
            }
          }).catch(() => {});
        }, 1_000);
        detachedPollsRef.current.set(id, poll);
      }
      return session;
    },
    [persistActiveSession, refreshSessions, syncActive, updateBuffer],
  );

  useEffect(() => {
    if (!persistedSessionKey) return;
    let id: string | null = null;
    try { id = localStorage.getItem(persistedSessionKey); } catch { /* ignore */ }
    if (id) void loadSession(id).catch(() => persistActiveSession());
    return () => {
      for (const poll of detachedPollsRef.current.values()) clearInterval(poll);
      detachedPollsRef.current.clear();
    };
  }, [loadSession, persistedSessionKey, persistActiveSession]);

  const newChat = useCallback(() => {
    const draft = buffersRef.current.get(DRAFT_KEY);
    if (draft?.streaming) {
      abortControllersRef.current.get(DRAFT_KEY)?.abort();
    }
    buffersRef.current.set(DRAFT_KEY, emptyBuffer());
    queuedTurnsRef.current.delete(DRAFT_KEY);
    activeKeyRef.current = DRAFT_KEY;
    useStudioStore.getState().setActiveSession(null);
    persistActiveSession();
    setPendingRestoreUndo(null);
    syncActive(DRAFT_KEY);
    refreshStreamingSessions();
  }, [persistActiveSession, syncActive, refreshStreamingSessions]);

  const removeSession = useCallback(
    async (id: string) => {
      abortControllersRef.current.get(id)?.abort();
      abortControllersRef.current.delete(id);
      buffersRef.current.delete(id);
      queuedTurnsRef.current.delete(id);
      useStudioStore.getState().removeSessionActivity(id);
      await api.deleteSession(id);
      if (activeKeyRef.current === id) newChat();
      refreshStreamingSessions();
      void refreshSessions();
    },
    [newChat, refreshSessions, refreshStreamingSessions],
  );

  const renameSession = useCallback(
    async (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      await api.updateSessionTitle(id, trimmed);
      void refreshSessions();
    },
    [refreshSessions],
  );

  /**
   * Branch into a new conversation with history through this assistant message.
   * Original session is unchanged (ChatGPT / TypingMind fork semantics).
   */
  const forkConversation = useCallback(
    async (item: Extract<ChatItem, { kind: "assistant" }>) => {
      const sourceId = activeKeyRef.current;
      if (sourceId === DRAFT_KEY) {
        useOsStore.getState().notify("Save the chat first — fork needs a persisted session");
        return;
      }
      try {
        const session = await api.getSession(sourceId);
        const feed = buffersRef.current.get(sourceId)?.items ?? items;
        const upToMessageIndex = findForkMessageIndex(session, item, feed);
        const forked = await api.forkSession(sourceId, upToMessageIndex);
        await loadSession(forked.id);
        void refreshSessions();
        useOsStore.getState().notify(`Forked into “${forked.title}”`);
      } catch (err) {
        useOsStore
          .getState()
          .notify(err instanceof Error ? err.message : "Could not fork conversation");
      }
    },
    [items, loadSession, refreshSessions],
  );

  const send = useCallback(
    async (text: string, opts?: {
      mode?: "agent" | "ask";
      approvalMode?: "strict" | "smart" | "full";
      profileId?: string | null;
      toolsetIds?: string[];
    }) => {
      const trimmed = text.trim();
      const streamKey = activeKeyRef.current;
      const buffer = buffersRef.current.get(streamKey) ?? emptyBuffer();
      if (!trimmed) return;

      // Committing a new turn dismisses Cursor-style “Redo checkpoint”.
      setPendingRestoreUndo(null);

      if (buffer.streaming) {
        const queue = queuedTurnsRef.current.get(streamKey) ?? [];
        queuedTurnsRef.current.set(streamKey, [...queue, { text: trimmed, opts }]);
        updateBuffer(streamKey, (buf) => {
          buf.items = [
            ...buf.items,
            { kind: "user", id: nextId(), text: trimmed, timestamp: new Date().toISOString() },
          ];
        });
        return;
      }

      let nextTurn: QueuedTurn | undefined = { text: trimmed, opts };
      let appendUser = true;
      let nextKey = streamKey;

      while (nextTurn) {
        const currentTurn = nextTurn;
        let targetKey = nextKey;
        let resolvedSessionId = targetKey === DRAFT_KEY ? undefined : targetKey;

        updateBuffer(targetKey, (buf) => {
          if (appendUser) {
            buf.items = [
              ...buf.items,
              { kind: "user", id: nextId(), text: currentTurn.text, timestamp: new Date().toISOString() },
            ];
          }
          buf.streaming = true;
          buf.turnMeta = { startedAt: Date.now(), totalTokens: 0 };
        });

        const abort = new AbortController();
        abortControllersRef.current.set(targetKey, abort);

        const onEvent = (event: AgentEvent) => {
          handleShellEvent(
            event,
            targetKey === DRAFT_KEY ? null : targetKey,
          );
          if (event.type === "session") {
            resolvedSessionId = event.sessionId;
            if (targetKey === DRAFT_KEY) {
              migrateBuffer(DRAFT_KEY, event.sessionId);
              useStudioStore.getState().migrateSessionActivity(DRAFT_SESSION_KEY, event.sessionId);
              targetKey = event.sessionId;
            }
            useStudioStore.getState().setActiveSession(event.sessionId);
            persistActiveSession(event.sessionId);
            return;
          }
          updateBuffer(targetKey, (buf) => applyAgentEvent(buf, event));
        };

        try {
          await streamChat(
            currentTurn.text,
            resolvedSessionId,
            onEvent,
            abort.signal,
            currentTurn.opts?.mode,
            activeProjectId,
            currentTurn.opts?.approvalMode,
            currentTurn.opts?.profileId,
            currentTurn.opts?.toolsetIds,
          );
        } catch (err) {
          if (!abort.signal.aborted) {
            updateBuffer(targetKey, (buf) => {
              buf.items = [
                ...buf.items,
                {
                  kind: "error",
                  id: nextId(),
                  text: err instanceof Error ? err.message : "Chat request failed",
                },
              ];
            });
          }
        } finally {
          abortControllersRef.current.delete(targetKey);
          updateBuffer(targetKey, (buf) => {
            buf.streaming = false;
            buf.items = buf.items.map((it) =>
              it.kind === "assistant" && it.streaming ? { ...it, streaming: false } : it,
            );
          });
          void refreshSessions();
        }

        nextKey = targetKey;
        const queue = queuedTurnsRef.current.get(nextKey);
        nextTurn = queue?.shift();
        if (queue && queue.length === 0) queuedTurnsRef.current.delete(nextKey);
        appendUser = false;
      }
    },
    [activeProjectId, migrateBuffer, persistActiveSession, refreshSessions, updateBuffer],
  );

  /**
   * Regenerate — drop this assistant reply (and everything after), then resubmit
   * the preceding user prompt. Overwrite semantics (ChatGPT / Claude style MVP).
   */
  const regenerateResponse = useCallback(
    async (item: Extract<ChatItem, { kind: "assistant" }>) => {
      const key = activeKeyRef.current;
      const buffer = buffersRef.current.get(key) ?? emptyBuffer();
      if (buffer.streaming) {
        useOsStore.getState().notify("Wait for the current response to finish");
        return;
      }

      const feed = buffer.items;
      const userItem = findPrecedingUserItem(feed, item);
      if (!userItem) {
        useOsStore.getState().notify("Nothing to regenerate — no prior user message");
        return;
      }
      const feedUserIdx = feed.findIndex((it) => it.id === userItem.id);
      if (feedUserIdx < 0) return;

      if (key !== DRAFT_KEY) {
        try {
          const session = await api.getSession(key);
          const assistantIdx = findForkMessageIndex(session, item, feed);
          const userMsgIdx = findPrecedingUserMessageIndex(session, assistantIdx);
          if (userMsgIdx < 0) {
            useOsStore.getState().notify("Nothing to regenerate — no prior user message");
            return;
          }
          await api.truncateSession(key, userMsgIdx);
          void refreshSessions();
        } catch (err) {
          useOsStore
            .getState()
            .notify(err instanceof Error ? err.message : "Could not regenerate response");
          return;
        }
      }

      queuedTurnsRef.current.delete(key);
      updateBuffer(key, (buf) => {
        buf.items = buf.items.slice(0, feedUserIdx);
        buf.streaming = false;
        buf.turnMeta = null;
      });

      // Don't await — streaming UI owns the rest; awaiting would pin a spinner
      // on a footer that unmounts when this bubble is removed.
      void send(userItem.text);
    },
    [refreshSessions, send, updateBuffer],
  );

  /**
   * Edit + resend — Cursor/ChatGPT style: drop this user turn and everything
   * after, then submit the edited prompt. Caller should confirm first.
   */
  const editAndResend = useCallback(
    async (item: Extract<ChatItem, { kind: "user" }>, nextText: string) => {
      const trimmed = nextText.trim();
      if (!trimmed) {
        useOsStore.getState().notify("Message can’t be empty");
        return;
      }

      const key = activeKeyRef.current;
      const buffer = buffersRef.current.get(key) ?? emptyBuffer();
      if (buffer.streaming) {
        useOsStore.getState().notify("Wait for the current response to finish");
        return;
      }

      const feed = buffer.items;
      const feedIdx = feed.findIndex((it) => it.id === item.id);
      if (feedIdx < 0) return;

      if (key !== DRAFT_KEY) {
        try {
          const session = await api.getSession(key);
          const userMsgIdx = findUserMessageIndex(session, item, feed);
          await api.truncateSession(key, userMsgIdx);
          void refreshSessions();
        } catch (err) {
          useOsStore
            .getState()
            .notify(err instanceof Error ? err.message : "Could not edit message");
          return;
        }
      }

      queuedTurnsRef.current.delete(key);
      updateBuffer(key, (buf) => {
        buf.items = buf.items.slice(0, feedIdx);
        buf.streaming = false;
        buf.turnMeta = null;
      });

      void send(trimmed);
    },
    [refreshSessions, send, updateBuffer],
  );

  /**
   * Restore checkpoint — Claude Code / Cursor style.
   * mode "both" reverts tracked write_file/ACP edits and rewinds the chat;
   * "conversation" keeps files; "code" keeps the chat.
   * Leaves a pending undo (“Redo checkpoint”) until the next send.
   * Returns the message text to load into the composer (when conversation rewound).
   */
  const restoreCheckpoint = useCallback(
    async (
      item: Extract<ChatItem, { kind: "user" }>,
      mode: "both" | "conversation" | "code" = "both",
    ): Promise<string | null> => {
      const key = activeKeyRef.current;
      const buffer = buffersRef.current.get(key) ?? emptyBuffer();
      if (buffer.streaming) {
        useOsStore.getState().notify("Wait for the current response to finish");
        return null;
      }

      const feed = buffer.items;
      const feedIdx = feed.findIndex((it) => it.id === item.id);
      if (feedIdx < 0) return null;
      const previousItems = feed.map((it) => ({ ...it }));

      if (key === DRAFT_KEY) {
        // No persisted session — conversation rewind only.
        if (mode === "code") {
          useOsStore.getState().notify("No tracked file edits to restore yet");
          return null;
        }
        queuedTurnsRef.current.delete(key);
        updateBuffer(key, (buf) => {
          buf.items = buf.items.slice(0, feedIdx + 1);
          buf.streaming = false;
          buf.turnMeta = null;
        });
        setPendingRestoreUndo({ sessionKey: key, mode: "conversation", previousItems });
        useOsStore.getState().notify("Restored conversation to this message");
        return item.text;
      }

      try {
        const session = await api.getSession(key);
        const userMsgIdx = findUserMessageIndex(session, item, feed);
        const result = await api.restoreCheckpoint(key, {
          upToUserMessageIndex: userMsgIdx,
          mode,
        });
        if (result.restoredFiles.length > 0) {
          useStudioStore.getState().applyRestoredFiles(result.restoredFiles, key);
        }
        void refreshSessions();

        if (mode === "both" || mode === "conversation") {
          queuedTurnsRef.current.delete(key);
          updateBuffer(key, (buf) => {
            buf.items = buf.items.slice(0, feedIdx + 1);
            buf.streaming = false;
            buf.turnMeta = null;
          });
        }

        if (result.canUndo) {
          setPendingRestoreUndo({ sessionKey: key, mode, previousItems });
        }

        const fileNote =
          result.restoredFiles.length === 0
            ? "no tracked file edits"
            : result.restoredFiles.length === 1
              ? "1 file reverted"
              : `${result.restoredFiles.length} files reverted`;
        if (mode === "both") {
          useOsStore.getState().notify(`Restored code and conversation (${fileNote})`);
        } else if (mode === "conversation") {
          useOsStore.getState().notify("Restored conversation — files left unchanged");
        } else {
          useOsStore.getState().notify(`Restored code (${fileNote})`);
        }

        return mode === "code" ? null : item.text;
      } catch (err) {
        useOsStore
          .getState()
          .notify(err instanceof Error ? err.message : "Could not restore checkpoint");
        return null;
      }
    },
    [refreshSessions, updateBuffer],
  );

  /** Undo the last restore before the next turn (Cursor “Redo checkpoint”). */
  const redoCheckpoint = useCallback(async () => {
    const pending = pendingRestoreUndo;
    if (!pending) return;
    const key = pending.sessionKey;

    if (key === DRAFT_KEY) {
      updateBuffer(key, (buf) => {
        buf.items = pending.previousItems;
        buf.streaming = false;
        buf.turnMeta = null;
      });
      setPendingRestoreUndo(null);
      useOsStore.getState().notify("Redid checkpoint — restored previous chat");
      return;
    }

    try {
      const result = await api.redoCheckpoint(key);
      if (result.redoFiles.length > 0) {
        useStudioStore.getState().applyRestoredFiles(result.redoFiles, key);
      }
      if (result.mode === "both" || result.mode === "conversation") {
        // Prefer server transcript; fall back to the pre-restore feed snapshot.
        if (result.session) {
          updateBuffer(key, (buf) => {
            buf.items = sessionToFeed(result.session!);
            buf.streaming = false;
            buf.turnMeta = null;
          });
        } else {
          updateBuffer(key, (buf) => {
            buf.items = pending.previousItems;
            buf.streaming = false;
            buf.turnMeta = null;
          });
        }
      }
      void refreshSessions();
      setPendingRestoreUndo(null);
      useOsStore.getState().notify("Redid checkpoint");
    } catch (err) {
      useOsStore
        .getState()
        .notify(err instanceof Error ? err.message : "Could not redo checkpoint");
    }
  }, [pendingRestoreUndo, refreshSessions, updateBuffer]);

  const dismissRestoreUndo = useCallback(async () => {
    const pending = pendingRestoreUndo;
    if (!pending) return;
    if (pending.sessionKey !== DRAFT_KEY) {
      void api.dismissRestoreUndo(pending.sessionKey).catch(() => {});
    }
    setPendingRestoreUndo(null);
  }, [pendingRestoreUndo]);

  const stop = useCallback(() => {
    const key = activeKeyRef.current;
    if (key !== DRAFT_KEY) void api.cancelChatTurn(key).catch(() => {});
    abortControllersRef.current.get(key)?.abort();
  }, []);

  /** Mirror a voice conversation into the active thread only. */
  const applyVoiceEvent = useCallback(
    (event: VoiceEvent) => {
      const key = activeKeyRef.current;
      switch (event.type) {
        case "userTranscript": {
          const text = event.transcript.text.trim();
          if (event.transcript.final && text) {
            updateBuffer(key, (buf) => {
              buf.items = [
                ...buf.items,
                { kind: "user", id: nextId(), text, timestamp: new Date().toISOString() },
              ];
            });
          }
          break;
        }
        case "botTranscript": {
          const text = event.transcript.text.trim();
          if (!text) break;
          updateBuffer(key, (buf) => {
            const last = buf.items[buf.items.length - 1];
            if (last?.kind === "assistant" && last.streaming) {
              buf.items = [...buf.items.slice(0, -1), { ...last, text: `${last.text} ${text}` }];
            } else {
              buf.items = [
                ...buf.items,
                {
                  kind: "assistant",
                  id: nextId(),
                  text,
                  streaming: true,
                  timestamp: new Date().toISOString(),
                },
              ];
            }
          });
          break;
        }
        case "state":
          if (event.state === "listening" || event.state === "idle") {
            updateBuffer(key, (buf) => {
              buf.items = buf.items.map((it) =>
                it.kind === "assistant" && it.streaming ? { ...it, streaming: false } : it,
              );
            });
          }
          break;
        default:
          break;
      }
    },
    [updateBuffer],
  );

  return {
    items,
    sessionId,
    sessions,
    streaming,
    streamingSessions,
    turnMeta,
    send,
    stop,
    loadSession,
    newChat,
    removeSession,
    renameSession,
    forkConversation,
    regenerateResponse,
    editAndResend,
    restoreCheckpoint,
    pendingRestoreUndo,
    redoCheckpoint,
    dismissRestoreUndo,
    applyVoiceEvent,
  };
}
