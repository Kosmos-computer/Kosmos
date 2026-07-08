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
  | { kind: "error"; id: string; text: string }
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

function emptyBuffer(): SessionBuffer {
  return { items: [], streaming: false, turnMeta: null };
}

let itemCounter = 0;
function nextId(): string {
  return `item_${++itemCounter}`;
}

function sessionToItems(session: Session): ChatItem[] {
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
      buffer.items = [...buffer.items, { kind: "error", id: nextId(), text: event.message }];
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

export function useChat(opts?: { activeProjectId?: string | null }) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingSessions, setStreamingSessions] = useState<string[]>([]);
  const [turnMeta, setTurnMeta] = useState<TurnMeta | null>(null);
  const buffersRef = useRef<Map<string, SessionBuffer>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const activeKeyRef = useRef<string>(DRAFT_KEY);
  const setAgentBusy = useOsStore((s) => s.setAgentBusy);

  const activeProjectId = opts?.activeProjectId ?? null;

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
      const session = await api.getSession(id);
      if (!buffersRef.current.has(id)) {
        buffersRef.current.set(id, {
          items: sessionToItems(session),
          streaming: false,
          turnMeta: null,
        });
      }
      syncActive(id);
      return session;
    },
    [syncActive],
  );

  const newChat = useCallback(() => {
    const draft = buffersRef.current.get(DRAFT_KEY);
    if (draft?.streaming) {
      abortControllersRef.current.get(DRAFT_KEY)?.abort();
    }
    buffersRef.current.set(DRAFT_KEY, emptyBuffer());
    activeKeyRef.current = DRAFT_KEY;
    syncActive(DRAFT_KEY);
    refreshStreamingSessions();
  }, [syncActive, refreshStreamingSessions]);

  const removeSession = useCallback(
    async (id: string) => {
      abortControllersRef.current.get(id)?.abort();
      abortControllersRef.current.delete(id);
      buffersRef.current.delete(id);
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

  const send = useCallback(
    async (text: string, opts?: { mode?: "agent" | "ask" }) => {
      const trimmed = text.trim();
      const streamKey = activeKeyRef.current;
      const buffer = buffersRef.current.get(streamKey) ?? emptyBuffer();
      if (!trimmed || buffer.streaming) return;

      updateBuffer(streamKey, (buf) => {
        buf.items = [
          ...buf.items,
          { kind: "user", id: nextId(), text: trimmed, timestamp: new Date().toISOString() },
        ];
        buf.streaming = true;
        buf.turnMeta = { startedAt: Date.now(), totalTokens: 0 };
      });

      const abort = new AbortController();
      abortControllersRef.current.set(streamKey, abort);

      let targetKey = streamKey;
      let resolvedSessionId = streamKey === DRAFT_KEY ? undefined : streamKey;

      const onEvent = (event: AgentEvent) => {
        handleShellEvent(event);
        if (event.type === "session") {
          resolvedSessionId = event.sessionId;
          if (targetKey === DRAFT_KEY) {
            migrateBuffer(DRAFT_KEY, event.sessionId);
            targetKey = event.sessionId;
          }
          return;
        }
        updateBuffer(targetKey, (buf) => applyAgentEvent(buf, event));
      };

      try {
        await streamChat(
          trimmed,
          resolvedSessionId,
          onEvent,
          abort.signal,
          opts?.mode,
          activeProjectId,
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
    },
    [activeProjectId, migrateBuffer, refreshSessions, updateBuffer],
  );

  const stop = useCallback(() => {
    const key = activeKeyRef.current;
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
    applyVoiceEvent,
  };
}
