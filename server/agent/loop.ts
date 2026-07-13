/**
 * The agentic loop — one user turn may span several LLM completions:
 * stream text, execute any tool calls, feed results back, repeat until the
 * model answers with text only (or the iteration cap trips).
 *
 * The same loop serves interactive chat (SSE events streamed to the shell)
 * and headless automation runs (events discarded, transcript persisted).
 */
import type { AgentEvent, ChatMessage, Session } from "../../shared/types.js";
import { loadSettings } from "../env.js";
import { modelStore } from "../stores/modelStore.js";
import { sessionStore } from "../stores/sessionStore.js";
import { streamTurn, type LlmMessage } from "./llm.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { applyPolicy, assembleTools, toLlmDefs } from "./toolRegistry.js";
import type { ToolContext } from "./tools.js";

const MAX_ITERATIONS = 12;
/** Tool results beyond this are truncated for the LLM (full result goes to the UI). */
const MAX_TOOL_RESULT_CHARS = 6_000;

function toLlmMessages(session: Session, extraSystem?: string): LlmMessage[] {
  const system = extraSystem ? `${buildSystemPrompt()}\n\n${extraSystem}` : buildSystemPrompt();
  const messages: LlmMessage[] = [{ role: "system", content: system }];
  for (const m of session.messages) {
    if (m.role === "user") {
      messages.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      messages.push({
        role: "assistant",
        content: m.content || null,
        ...(m.toolCalls && m.toolCalls.length > 0
          ? {
              tool_calls: m.toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            }
          : {}),
      });
    } else {
      messages.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
    }
  }
  return messages;
}

export interface RunTurnOptions {
  sessionId: string;
  userMessage: string;
  emit: (event: AgentEvent) => void;
  signal?: AbortSignal;
  /** True when a client is streaming and can answer exec confirmations. */
  interactive?: boolean;
  /** Authenticated user for per-user tools (mail, github, …). */
  userId?: string;
  /** Extra system guidance appended for this caller (e.g. voice speakability). */
  extraSystem?: string;
  /**
   * Ask mode: answer-only turns. Write-class tools are removed from the
   * model's schema entirely (Joplin posture — invisible, not rejected), so
   * the agent can read, search, and explain but never mutate. Ignored by
   * ACP agents, which manage their own tools.
   */
  readOnly?: boolean;
  /**
   * Model-registry use-case slot this turn resolves its LLM through
   * (shared/models.ts USE_CASE_SLOTS). Defaults to "agent.chat"; automations
   * pass "automations.chat", the voice brain "voice.brain".
   */
  slot?: string;
}

const ASK_MODE_SYSTEM =
  "This turn is in Ask mode: answer questions and explain — do not attempt to " +
  "create, modify, or execute anything. Write tools are unavailable this turn; " +
  "if the user asks for changes, describe what you would do and suggest " +
  "switching to Agent mode.";

/**
 * Append the user message, run the loop to completion, persist every step.
 * Returns the final assistant text (used by automation run summaries).
 */
export async function runAgentTurn(opts: RunTurnOptions): Promise<string> {
  // The LLM connection resolves through the model registry's slot table;
  // the rest of settings (agent kind, disabled tools, …) stays as-is.
  const baseSettings = loadSettings();
  const llm = modelStore.resolveModel(opts.slot ?? "agent.chat", baseSettings);
  const settings = {
    ...baseSettings,
    provider: llm.provider,
    baseUrl: llm.baseUrl,
    model: llm.model,
    apiKey: llm.apiKey,
  };
  const session = await sessionStore.get(opts.sessionId);
  if (!session) throw new Error(`Session not found: ${opts.sessionId}`);

  await sessionStore.appendMessages(session.id, [
    { role: "user", content: opts.userMessage },
  ]);

  const ctx: ToolContext = {
    sessionId: session.id,
    emit: opts.emit,
    interactive: opts.interactive ?? false,
    userId: opts.userId,
  };
  let finalText = "";
  const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  // Assembled once per turn, not per iteration: MCP/app tool sets don't
  // change mid-turn, and re-listing remote servers on every loop pass would
  // add latency for nothing.
  const assembled = await assembleTools(ctx);
  const tools = opts.readOnly ? assembled.filter((t) => t.access === "read") : assembled;
  const toolDefs = toLlmDefs(tools);
  const extraSystem = opts.readOnly
    ? [opts.extraSystem, ASK_MODE_SYSTEM].filter(Boolean).join("\n\n")
    : opts.extraSystem;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const current = await sessionStore.get(session.id);
    if (!current) break;

    const turn = await streamTurn({
      settings,
      messages: toLlmMessages(current, extraSystem),
      tools: toolDefs,
      onTextDelta: (delta) => opts.emit({ type: "text_delta", delta }),
      signal: opts.signal,
    });

    if (turn.usage) {
      usage.promptTokens += turn.usage.promptTokens;
      usage.completionTokens += turn.usage.completionTokens;
      usage.totalTokens += turn.usage.totalTokens;
      opts.emit({ type: "usage", ...usage });
    }

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: turn.text,
      ...(turn.toolCalls.length > 0
        ? {
            toolCalls: turn.toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
            })),
          }
        : {}),
    };

    if (turn.toolCalls.length === 0) {
      await sessionStore.appendMessages(session.id, [assistantMessage]);
      finalText = turn.text;
      break;
    }

    const toolMessages: ChatMessage[] = [];
    for (const call of turn.toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
      } catch {
        // Leave args empty; the tool will report what's missing.
      }
      opts.emit({ type: "tool_start", callId: call.id, name: call.name, args });

      let resultString: string;
      const tool = tools.find((t) => t.name === call.name);
      if (!tool) {
        resultString = JSON.stringify({ error: `Unknown tool: ${call.name}` });
      } else {
        // Policy gate: (source, tool) rules may deny outright or park on a
        // user confirmation before the tool runs. System tools pass through
        // unless an explicit rule says otherwise.
        const blocked = await applyPolicy(tool, args, ctx);
        if (blocked) {
          resultString = JSON.stringify({ error: blocked });
        } else {
          try {
            const result = await tool.execute(args, ctx);
            resultString = JSON.stringify(result ?? null);
          } catch (err) {
            resultString = JSON.stringify({
              error: err instanceof Error ? err.message : "Tool execution failed",
            });
          }
        }
      }

      opts.emit({ type: "tool_end", callId: call.id, name: call.name, result: resultString });
      toolMessages.push({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content:
          resultString.length > MAX_TOOL_RESULT_CHARS
            ? resultString.slice(0, MAX_TOOL_RESULT_CHARS) + "…[truncated]"
            : resultString,
      });
    }

    await sessionStore.appendMessages(session.id, [assistantMessage, ...toolMessages]);
    finalText = turn.text;
  }

  return finalText;
}
