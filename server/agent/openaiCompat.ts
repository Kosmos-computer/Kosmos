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
import { broadcastShellEvent, hasShellClients } from "../shellChannel.js";
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

export const openaiCompatRoutes = new Hono();

openaiCompatRoutes.post("/chat/completions", async (c) => {
  const address = getConnInfo(c).remote.address ?? "";
  if (!isLoopback(address)) {
    return c.json({ error: { message: "The Arco /v1 endpoint only accepts local connections" } }, 403);
  }

  const body = (await c.req.json()) as CompatRequest;
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
  // clients (scripts, tools) get the agent's normal register.
  const extraSystem = conversationKey.startsWith("voice") ? VOICE_SYSTEM : undefined;

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

/** Model listing — some OpenAI clients probe this before chatting. */
openaiCompatRoutes.get("/models", (c) =>
  c.json({
    object: "list",
    data: [{ id: "arco-agent", object: "model", created: 0, owned_by: "arco" }],
  }),
);
