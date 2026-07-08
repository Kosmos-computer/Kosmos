/**
 * Remote kosmos adapter — Arco relaying chat turns to another kosmos
 * server's own POST /api/chat, the same role openhandsAgent.ts/
 * cursorAgent.ts play for their respective backends.
 *
 * Unlike those two, no event translation is needed: a remote kosmos server
 * emits the exact same AgentEvent union this one does, so turns are a plain
 * SSE relay. Auth rides a scoped bearer token minted on the remote server
 * via Settings → External Access (server/platform/externalClients.ts),
 * not a user session — see server/auth/middleware.ts's requireAuth.
 */
import type { AgentBackend, AgentEvent, Settings } from "../../shared/types.js";
import { loadSettings, resolveActiveAgentBackend } from "../env.js";
import type { RunTurnOptions } from "../agent/loop.js";
import { sessionStore } from "../stores/sessionStore.js";

// ── Run registry ─────────────────────────────────────────────────────────────
//
// Stateless relay — nothing to keep warm between turns beyond which remote
// conversation this Arco session maps to.

const remoteSessionIds = new Map<string, string>();

function requireBackend(settings: Settings): AgentBackend {
  const backend = resolveActiveAgentBackend(settings, "kosmos");
  if (!backend) {
    throw new Error("No kosmos remote backend configured. Add one in Settings → Agent.");
  }
  return backend;
}

/** Parse complete `data: ` SSE lines into AgentEvents — malformed chunks are skipped. */
export function parseSseLines(lines: string[]): AgentEvent[] {
  const events: AgentEvent[] = [];
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data) continue;
    try {
      events.push(JSON.parse(data) as AgentEvent);
    } catch {
      // Skip malformed chunks — the stream is best-effort.
    }
  }
  return events;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Run one chat turn by relaying it to a remote kosmos server's /api/chat.
 * Same contract as runAgentTurn.
 */
export async function runKosmosRemoteTurn(opts: RunTurnOptions): Promise<string> {
  const settings = loadSettings();
  const backend = requireBackend(settings);
  const session = await sessionStore.get(opts.sessionId);
  if (!session) throw new Error(`Session not found: ${opts.sessionId}`);

  await sessionStore.appendMessages(session.id, [{ role: "user", content: opts.userMessage }]);

  const res = await fetch(`${backend.host.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${backend.apiKey}` },
    body: JSON.stringify({
      message: opts.userMessage,
      sessionId: remoteSessionIds.get(opts.sessionId),
      mode: opts.readOnly ? "ask" : "agent",
    }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`Remote kosmos chat failed: ${res.status}${body ? ` ${body.slice(0, 200)}` : ""}`);
  }

  let turnText = "";
  let errorMessage: string | null = null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const event of parseSseLines(lines)) {
      if (event.type === "session") {
        remoteSessionIds.set(opts.sessionId, event.sessionId);
        continue;
      }
      if (event.type === "done") continue;
      if (event.type === "error") {
        errorMessage = event.message;
        continue;
      }
      opts.emit(event);
      if (event.type === "text_delta") turnText += event.delta;
    }
  }

  if (errorMessage) throw new Error(errorMessage);

  const finalText = turnText || "(no response)";
  await sessionStore.appendMessages(session.id, [{ role: "assistant", content: finalText }]);
  return finalText;
}

/** Forget all tracked remote session mappings — called when kosmos-remote settings change. */
export function stopAllKosmosRemoteRuns(): void {
  remoteSessionIds.clear();
}
