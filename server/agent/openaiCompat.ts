/**
 * OpenAI-compatible facade over the Arco agent — POST /v1/chat/completions.
 *
 * This makes the full tool-using agent consumable by anything that speaks
 * the OpenAI API: the voice server's brain slot, scripts, other tools. The
 * caller sends standard chat messages; we extract the latest user message,
 * run the agent loop (which keeps its own persisted transcript), and stream
 * the agent's prose back as completion chunks. Tool execution happens
 * silently between text segments — callers just see the words.
 *
 * Conversation continuity: callers pass a stable `x-arco-conversation`
 * header to keep an Arco session across requests (the voice server keeps
 * its own context too, but the agent session is what preserves tool state).
 * Without the header, all calls share one "voice" session.
 *
 * Not under /api (cookie auth is impossible for server-to-server callers),
 * so it is restricted to loopback connections instead.
 */
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getConnInfo } from "@hono/node-server/conninfo";
import type { AgentEvent } from "../../shared/types.js";
import { USE_CASE_SLOTS } from "../../shared/models.js";
import { broadcastShellEvent, hasShellClients } from "../shellChannel.js";
import { modelStore } from "../stores/modelStore.js";
import { sessionStore } from "../stores/sessionStore.js";
import { runAgentTurn } from "./loop.js";

/**
 * Voice callers have no SSE stream to the desktop, but their turns still
 * drive it. Shell-relevant events go over the shell-events channel; that
 * includes the interactive round trips (cursor commands, approval cards) —
 * the desktop answers those via the same POST endpoints chat uses.
 */
const SHELL_EVENT_TYPES = new Set<AgentEvent["type"]>([
  "os_ui",
  "apps_changed",
  "automations_changed",
  "automation_run_finished",
  "file_changed",
  "cursor_request",
  "confirm_required",
  "confirm_resolved",
]);

function forwardShellEvent(event: AgentEvent): void {
  if (SHELL_EVENT_TYPES.has(event.type)) broadcastShellEvent(event);
}

/** Spoken-output guidance layered onto the agent prompt for voice turns. */
const VOICE_SYSTEM = `This conversation is happening OVER VOICE: everything you write is spoken aloud by TTS.
- Reply in short plain sentences. Never use markdown, bullet points, code blocks, URLs, or emoji.
- Keep answers brief and conversational — one to three sentences unless the user asks for detail.
- You may still use your tools (open or close apps with os_ui, the visible cursor, web search, the calendar); do the action, then say what you did in one sentence.
- Actions needing approval show the user an on-screen card — tell them to tap Allow, then continue.
- Never read raw tool output, ids, or code aloud; summarize it.`;

interface CompatMessage {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

interface CompatRequest {
  model?: string;
  messages?: CompatMessage[];
  stream?: boolean;
}

function contentToText(content: CompatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((part) => (part.type === "text" ? (part.text ?? "") : ""))
    .join("")
    .trim();
}

function isLoopback(address: string): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

/** conversation key (x-arco-conversation) → Arco session id, process-lifetime. */
const conversationSessions = new Map<string, string>();

async function resolveSession(conversationKey: string): Promise<string> {
  const existing = conversationSessions.get(conversationKey);
  if (existing && (await sessionStore.get(existing))) return existing;
  const session = await sessionStore.create("chat", "Voice chat");
  conversationSessions.set(conversationKey, session.id);
  return session.id;
}

function chunkPayload(id: string, model: string, delta: Record<string, unknown>, finish: string | null) {
  return {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finish }],
  };
}

// ── Raw model passthrough ────────────────────────────────────────────────────

interface PassthroughEndpoint {
  baseUrl: string;
  model: string;
  apiKey: string;
}

/**
 * Map a caller-supplied model name to a hub endpoint: a registered model id
 * first, then a text.chat slot id ("agent.chat" → whatever is assigned).
 * Null means "not ours to proxy" — the caller gets the agent instead.
 */
function resolvePassthrough(name: string | undefined): PassthroughEndpoint | null {
  if (!name || name === "arco-agent") return null;
  const direct = modelStore.resolveEndpoint(name);
  if (direct) return guardSelfProxy(direct);
  const slot = USE_CASE_SLOTS.find((s) => s.id === name && s.requires === "text.chat");
  if (slot) {
    const resolved = modelStore.resolveModel(slot.id);
    if (resolved.provider === "mock") return null;
    return guardSelfProxy(resolved);
  }
  return null;
}

/**
 * A registered endpoint may legitimately point back at this server (the
 * voice brain's default is exactly that). Proxying to ourselves would
 * recurse — those callers get the agent path instead.
 */
function guardSelfProxy(endpoint: PassthroughEndpoint): PassthroughEndpoint | null {
  return endpoint.model === "arco-agent" ? null : endpoint;
}

/** Forward the request body verbatim (tools, temperature, stream, …) and pipe the response straight back. */
async function proxyCompletion(
  c: { req: { raw: Request } },
  body: CompatRequest,
  endpoint: PassthroughEndpoint,
): Promise<Response> {
  try {
    const upstream = await fetch(`${endpoint.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(endpoint.apiKey ? { authorization: `Bearer ${endpoint.apiKey}` } : {}),
      },
      body: JSON.stringify({ ...body, model: endpoint.model }),
      signal: c.req.raw.signal,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upstream request failed";
    return Response.json(
      { error: { message: `Model endpoint unreachable: ${message}` } },
      { status: 502 },
    );
  }
}

export const openaiCompatRoutes = new Hono();

openaiCompatRoutes.post("/chat/completions", async (c) => {
  const address = getConnInfo(c).remote.address ?? "";
  if (!isLoopback(address)) {
    return c.json({ error: { message: "The Arco /v1 endpoint only accepts local connections" } }, 403);
  }

  const body = (await c.req.json()) as CompatRequest;

  // Raw passthrough: naming a registered model id (or a text.chat slot id
  // like "agent.chat") proxies straight to that model's endpoint — no agent
  // loop, no tools. This is how other apps on the machine consume
  // hub-managed models (docs/model-hub-plan.md). "arco-agent", unknown
  // names, and the mock provider keep the full-agent behavior.
  const passthrough = resolvePassthrough(body.model);
  if (passthrough) return proxyCompletion(c, body, passthrough);

  const messages = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  // No user message yet happens on voice connect: the pipeline queues a
  // system-only context ("greet the user"). Treat the last system message as
  // the instruction so the greeting flows through the agent like any turn.
  const lastAny = [...messages].reverse().find((m) => contentToText(m.content).length > 0);
  const userMessage = lastUser ? contentToText(lastUser.content) : lastAny ? contentToText(lastAny.content) : "";
  if (!userMessage) {
    return c.json({ error: { message: "messages must include a non-empty message" } }, 400);
  }

  const model = body.model || "arco-agent";
  const conversationKey = c.req.header("x-arco-conversation") ?? "voice";
  const sessionId = await resolveSession(conversationKey);
  const completionId = `chatcmpl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  // Speakability guidance only for voice conversations; other local OpenAI
  // clients (scripts, tools) get the agent's normal register. Voice turns
  // also resolve their LLM through the voice.brain slot.
  const isVoice = conversationKey.startsWith("voice");
  const extraSystem = isVoice ? VOICE_SYSTEM : undefined;
  const slot = isVoice ? "voice.brain" : "agent.chat";

  if (body.stream === false) {
    const text = await runAgentTurn({
      sessionId,
      userMessage,
      emit: forwardShellEvent,
      signal: c.req.raw.signal,
      // Interactive when a desktop is connected to the shell-events channel:
      // it renders approval cards and executes cursor commands. With no
      // desktop the turn runs headless (cursor refuses, confirms deny).
      interactive: hasShellClients(),
      slot,
      ...(extraSystem ? { extraSystem } : {}),
    });
    return c.json({
      id: completionId,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        { index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" },
      ],
    });
  }

  return streamSSE(c, async (stream) => {
    const write = (payload: unknown) => void stream.writeSSE({ data: JSON.stringify(payload) });
    write(chunkPayload(completionId, model, { role: "assistant", content: "" }, null));
    try {
      await runAgentTurn({
        sessionId,
        userMessage,
        emit: (event) => {
          // Only prose reaches the caller — tool events would be spoken aloud
          // by TTS consumers, and the model already narrates what it's doing.
          // Shell actions instead ride the out-of-band shell-events channel.
          if (event.type === "text_delta") {
            write(chunkPayload(completionId, model, { content: event.delta }, null));
          } else {
            forwardShellEvent(event);
          }
        },
        signal: c.req.raw.signal,
        interactive: hasShellClients(),
        slot,
        ...(extraSystem ? { extraSystem } : {}),
      });
      write(chunkPayload(completionId, model, {}, "stop"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Agent turn failed";
      write(chunkPayload(completionId, model, { content: `Sorry, something went wrong: ${message}` }, "stop"));
    }
    await stream.writeSSE({ data: "[DONE]" });
    await stream.close();
  });
});

/**
 * Model listing — some OpenAI clients probe this before chatting. Exposes
 * the agent, the text.chat slot aliases, and every enabled chat-capable
 * model in the registry (those proxy raw, without the agent loop).
 */
openaiCompatRoutes.get("/models", (c) => {
  const address = getConnInfo(c).remote.address ?? "";
  if (!isLoopback(address)) {
    return c.json({ error: { message: "The Arco /v1 endpoint only accepts local connections" } }, 403);
  }
  const slots = USE_CASE_SLOTS.filter((s) => s.requires === "text.chat").map((s) => ({
    id: s.id,
    object: "model",
    created: 0,
    owned_by: "arco-slot",
  }));
  const models = modelStore
    .list()
    .filter((m) => m.enabled && m.manifest.capabilities.includes("text.chat"))
    .map((m) => ({ id: m.manifest.id, object: "model", created: 0, owned_by: "arco-hub" }));
  return c.json({
    object: "list",
    data: [{ id: "arco-agent", object: "model", created: 0, owned_by: "arco" }, ...slots, ...models],
  });
});
