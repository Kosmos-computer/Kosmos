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
import { sessionStore } from "../stores/sessionStore.js";
import { runAgentTurn } from "./loop.js";

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
  const lastUser = [...(body.messages ?? [])].reverse().find((m) => m.role === "user");
  const userMessage = lastUser ? contentToText(lastUser.content) : "";
  if (!userMessage) {
    return c.json({ error: { message: "messages must include a user message" } }, 400);
  }

  const model = body.model || "arco-agent";
  const sessionId = await resolveSession(c.req.header("x-arco-conversation") ?? "voice");
  const completionId = `chatcmpl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  if (body.stream === false) {
    const text = await runAgentTurn({
      sessionId,
      userMessage,
      emit: () => {},
      signal: c.req.raw.signal,
      interactive: false,
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
          if (event.type === "text_delta") {
            write(chunkPayload(completionId, model, { content: event.delta }, null));
          }
        },
        signal: c.req.raw.signal,
        interactive: false,
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
