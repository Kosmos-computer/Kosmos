/**
 * OpenHands Agent Server adapter — Arco driving a remote OpenHands
 * conversation as a pluggable chat brain, the same role cursorAgent.ts
 * plays for the Cursor SDK.
 *
 * One conversation + websocket subscription per Arco chat session, kept
 * warm between turns. OpenHands ConversationEvents are translated into the
 * same AgentEvents the built-in loop emits so Studio renders every brain
 * identically. OpenHands manages its own LLM and tools server-side (via
 * Profiles) — Arco only relays turns.
 */
import { ConversationClient } from "@openhands/typescript-client/clients";
import { WebSocketCallbackClient } from "@openhands/typescript-client";
import type { Event as OpenhandsEvent } from "@openhands/typescript-client";
import type { AgentBackend, AgentEvent, Settings } from "../../shared/types.js";
import { loadSettings, resolveActiveAgentBackend } from "../env.js";
import type { RunTurnOptions } from "../agent/loop.js";
import { sessionStore } from "../stores/sessionStore.js";

// ── Run registry ─────────────────────────────────────────────────────────────

interface PendingTurn {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
}

interface OpenhandsRun {
  settingsKey: string;
  backend: AgentBackend;
  client: ConversationClient;
  ws: WebSocketCallbackClient;
  conversationId: string;
  emit: (event: AgentEvent) => void;
  turnText: string;
  pending: PendingTurn | null;
}

const runs = new Map<string, OpenhandsRun>();

function settingsKey(backend: AgentBackend): string {
  return [backend.id, backend.host, backend.apiKey].join("|");
}

function requireBackend(settings: Settings): AgentBackend {
  const backend = resolveActiveAgentBackend(settings, "openhands");
  if (!backend) {
    throw new Error(
      "No OpenHands backend configured. Add one in Settings → Agent.",
    );
  }
  return backend;
}

function textOf(content: { type: string; text?: string }[] | undefined): string {
  if (!content) return "";
  return content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("");
}

/**
 * Pure translation of one OpenHands ConversationEvent into an Arco
 * AgentEvent. Returns null for events with no Arco equivalent (e.g.
 * FinishEvent, which resolves the pending turn rather than emitting).
 */
export function translateOpenhandsEvent(event: OpenhandsEvent): AgentEvent | null {
  const kind = (event as { kind?: string }).kind;
  switch (kind) {
    case "MessageEvent": {
      const msg = event as unknown as {
        source?: string;
        llm_message?: { content?: { type: string; text?: string }[] };
      };
      if (msg.source !== "agent") return null;
      const text = textOf(msg.llm_message?.content);
      if (!text) return null;
      return { type: "text_delta", delta: text };
    }
    case "ActionEvent": {
      const action = event as unknown as {
        tool_call_id: string;
        tool_name: string;
        action: Record<string, unknown>;
      };
      return {
        type: "tool_start",
        callId: action.tool_call_id,
        name: action.tool_name,
        args: action.action ?? {},
      };
    }
    case "ObservationEvent": {
      const obs = event as unknown as {
        tool_call_id: string;
        tool_name: string;
        observation: unknown;
      };
      const result =
        typeof obs.observation === "string" ? obs.observation : JSON.stringify(obs.observation ?? "");
      return { type: "tool_end", callId: obs.tool_call_id, name: obs.tool_name, result };
    }
    case "AgentErrorEvent": {
      const err = event as unknown as { error: string };
      return { type: "error", message: err.error || "OpenHands agent error" };
    }
    case "ConversationErrorEvent": {
      const err = event as unknown as { detail: string };
      return { type: "error", message: err.detail || "OpenHands conversation error" };
    }
    default:
      return null;
  }
}

/** Apply one OpenHands ConversationEvent to a live run — emits, accumulates, and resolves the turn. */
function handleEvent(run: OpenhandsRun, event: OpenhandsEvent): void {
  if ((event as { kind?: string }).kind === "FinishEvent") {
    const finish = event as unknown as { message?: string };
    run.pending?.resolve(run.turnText || finish.message || "");
    run.pending = null;
    return;
  }

  const translated = translateOpenhandsEvent(event);
  if (!translated) return;

  run.emit(translated);
  if (translated.type === "text_delta") {
    run.turnText += translated.delta;
  } else if (translated.type === "error") {
    run.pending?.reject(new Error(translated.message));
    run.pending = null;
  }
}

async function createRun(
  arcoSessionId: string,
  backend: AgentBackend,
  emit: (event: AgentEvent) => void,
): Promise<OpenhandsRun> {
  const client = new ConversationClient({ host: backend.host, apiKey: backend.apiKey || undefined });
  const conversation = await client.createConversation({});
  const conversationId = (conversation as { id: string }).id;

  const run: OpenhandsRun = {
    settingsKey: settingsKey(backend),
    backend,
    client,
    conversationId,
    ws: null as unknown as WebSocketCallbackClient,
    emit,
    turnText: "",
    pending: null,
  };

  run.ws = new WebSocketCallbackClient({
    host: backend.host,
    conversationId,
    apiKey: backend.apiKey || undefined,
    callback: (event) => handleEvent(run, event),
    onError: (err) => run.pending?.reject(err),
  });
  run.ws.start();

  runs.set(arcoSessionId, run);
  return run;
}

async function ensureRun(
  arcoSessionId: string,
  backend: AgentBackend,
  emit: (event: AgentEvent) => void,
): Promise<OpenhandsRun> {
  const existing = runs.get(arcoSessionId);
  const key = settingsKey(backend);
  if (existing && existing.settingsKey === key) {
    existing.emit = emit;
    return existing;
  }
  if (existing) {
    existing.ws.stop();
    existing.client.close();
    runs.delete(arcoSessionId);
  }
  return createRun(arcoSessionId, backend, emit);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Run one chat turn through an OpenHands Agent Server conversation. Same
 * contract as runAgentTurn.
 */
export async function runOpenhandsTurn(opts: RunTurnOptions): Promise<string> {
  const settings = loadSettings();
  const backend = requireBackend(settings);
  const session = await sessionStore.get(opts.sessionId);
  if (!session) throw new Error(`Session not found: ${opts.sessionId}`);

  await sessionStore.appendMessages(session.id, [{ role: "user", content: opts.userMessage }]);

  const run = await ensureRun(opts.sessionId, backend, opts.emit);
  run.turnText = "";

  const turnPromise = new Promise<string>((resolve, reject) => {
    run.pending = { resolve, reject };
  });

  const onAbort = () => {
    void run.client.interruptConversation(run.conversationId).catch(() => {});
  };
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    await run.client.sendEvent(
      run.conversationId,
      { role: "user", content: [{ type: "text", text: opts.userMessage }], run: true },
      { run: true },
    );

    const finalText = (await turnPromise) || "(no response)";
    await sessionStore.appendMessages(session.id, [{ role: "assistant", content: finalText }]);
    return finalText;
  } finally {
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/** Close all OpenHands websocket/client handles — called when OpenHands settings change. */
export function stopAllOpenhandsRuns(): void {
  for (const [, run] of runs) {
    run.ws.stop();
    run.client.close();
  }
  runs.clear();
}
