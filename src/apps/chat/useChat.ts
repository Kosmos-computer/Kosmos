/**
 * Chat state — one hook drives the thread: streaming text deltas, tool-call
 * lifecycle, session load/switch, and routing shell events (os_ui,
 * apps_changed) to the OS stores while the stream is live.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, Session, SessionSummary } from "@shared/types";
import { api, streamChat } from "../../lib/api";
import { handleShellEvent } from "../../os/osActions";
import { useOsStore } from "../../os/osStore";

export type ChatItem =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string; streaming: boolean }
  | {
      kind: "tool";
      id: string;
      callId: string;
      name: string;
      args: Record<string, unknown>;
      result?: string;
    }
  /** A risky command paused server-side; approved is undefined while pending. */
  | { kind: "confirm"; id: string; confirmId: string; command: string; approved?: boolean }
  | { kind: "error"; id: string; text: string };

let itemCounter = 0;
function nextId(): string {
  return `item_${++itemCounter}`;
}

function sessionToItems(session: Session): ChatItem[] {
  const items: ChatItem[] = [];
  const toolItems = new Map<string, Extract<ChatItem, { kind: "tool" }>>();
  for (const m of session.messages) {
    if (m.role === "user") {
      items.push({ kind: "user", id: nextId(), text: m.content });
    } else if (m.role === "assistant") {
      if (m.content.trim()) {
        items.push({ kind: "assistant", id: nextId(), text: m.content, streaming: false });
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

export function useChat() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const setAgentBusy = useOsStore((s) => s.setAgentBusy);

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

  const loadSession = useCallback(async (id: string) => {
    const session = await api.getSession(id);
    setSessionId(session.id);
    setItems(sessionToItems(session));
  }, []);

  const newChat = useCallback(() => {
    setSessionId(undefined);
    setItems([]);
  }, []);

  const removeSession = useCallback(
    async (id: string) => {
      await api.deleteSession(id);
      if (id === sessionId) newChat();
      void refreshSessions();
    },
    [sessionId, newChat, refreshSessions],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setItems((prev) => [...prev, { kind: "user", id: nextId(), text: trimmed }]);
      setStreaming(true);
      setAgentBusy(true);
      const abort = new AbortController();
      abortRef.current = abort;

      const onEvent = (event: AgentEvent) => {
        handleShellEvent(event);
        switch (event.type) {
          case "session":
            setSessionId(event.sessionId);
            break;
          case "text_delta":
            setItems((prev) => {
              const last = prev[prev.length - 1];
              if (last?.kind === "assistant" && last.streaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + event.delta },
                ];
              }
              return [
                ...prev,
                { kind: "assistant", id: nextId(), text: event.delta, streaming: true },
              ];
            });
            break;
          case "tool_start":
            setItems((prev) => {
              // Seal any in-flight assistant text so ordering reads naturally.
              const sealed = prev.map((it) =>
                it.kind === "assistant" && it.streaming ? { ...it, streaming: false } : it,
              );
              return [
                ...sealed,
                {
                  kind: "tool",
                  id: nextId(),
                  callId: event.callId,
                  name: event.name,
                  args: event.args,
                },
              ];
            });
            break;
          case "tool_end":
            setItems((prev) =>
              prev.map((it) =>
                it.kind === "tool" && it.callId === event.callId
                  ? { ...it, result: event.result }
                  : it,
              ),
            );
            break;
          case "confirm_required":
            setItems((prev) => [
              ...prev,
              { kind: "confirm", id: nextId(), confirmId: event.confirmId, command: event.command },
            ]);
            break;
          case "confirm_resolved":
            setItems((prev) =>
              prev.map((it) =>
                it.kind === "confirm" && it.confirmId === event.confirmId
                  ? { ...it, approved: event.approved }
                  : it,
              ),
            );
            break;
          case "error":
            setItems((prev) => [...prev, { kind: "error", id: nextId(), text: event.message }]);
            break;
          default:
            break;
        }
      };

      try {
        await streamChat(trimmed, sessionId, onEvent, abort.signal);
      } catch (err) {
        if (!abort.signal.aborted) {
          setItems((prev) => [
            ...prev,
            {
              kind: "error",
              id: nextId(),
              text: err instanceof Error ? err.message : "Chat request failed",
            },
          ]);
        }
      } finally {
        setStreaming(false);
        setAgentBusy(false);
        abortRef.current = null;
        setItems((prev) =>
          prev.map((it) =>
            it.kind === "assistant" && it.streaming ? { ...it, streaming: false } : it,
          ),
        );
        void refreshSessions();
      }
    },
    [sessionId, streaming, refreshSessions, setAgentBusy],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    items,
    sessionId,
    sessions,
    streaming,
    send,
    stop,
    loadSession,
    newChat,
    removeSession,
  };
}
