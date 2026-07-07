/**
 * Cursor SDK agent — Arco driving Cursor agents as a pluggable chat brain.
 *
 * Uses @cursor/sdk to spawn local or cloud Cursor agents. One SDK agent handle
 * per Arco chat session, kept warm between turns. SDK stream events are
 * translated into the same AgentEvents the built-in loop emits so Studio
 * renders both brains identically.
 */
import {
  Agent,
  CursorAgentError,
  type AgentOptions,
  type McpServerConfig as SdkMcpServerConfig,
  type SDKAgent,
} from "@cursor/sdk";
import type { AgentEvent, Settings } from "../../shared/types.js";
import { CURSOR_DEFAULT_MODEL } from "../../shared/types.js";
import { loadSettings, resolveCursorApiKey } from "../env.js";
import type { RunTurnOptions } from "../agent/loop.js";
import { mcpServerStore, slugify } from "../mcp/serverStore.js";
import { getActiveRoot } from "../stores/projectStore.js";
import { sessionStore } from "../stores/sessionStore.js";

// ── Run registry ─────────────────────────────────────────────────────────────

interface CursorRun {
  settingsKey: string;
  agent: SDKAgent;
  emit: (event: AgentEvent) => void;
  turnText: string;
}

const runs = new Map<string, CursorRun>();

function settingsKey(settings: Settings): string {
  return [
    resolveCursorApiKey(settings),
    settings.cursorModel,
    settings.cursorRuntime,
    settings.cursorRepoUrl,
    getActiveRoot(),
  ].join("|");
}

function cursorMcpServers(): Record<string, SdkMcpServerConfig> {
  const out: Record<string, SdkMcpServerConfig> = {};
  for (const server of mcpServerStore.list().filter((s) => s.enabled)) {
    const key = slugify(server.name);
    const transport = server.transport;
    if (transport.kind === "stdio") {
      out[key] = {
        type: "stdio",
        command: transport.command,
        args: transport.args,
        env: transport.env,
      };
    } else {
      out[key] = {
        type: transport.kind,
        url: transport.url,
        headers: transport.headers,
      };
    }
  }
  return out;
}

function buildAgentOptions(settings: Settings, arcoSessionId: string): AgentOptions {
  const apiKey = resolveCursorApiKey(settings);
  if (!apiKey) {
    throw new Error(
      "Cursor API key not configured. Create one at cursor.com/dashboard/integrations and add it in Settings → Agent.",
    );
  }

  const model = { id: settings.cursorModel.trim() || CURSOR_DEFAULT_MODEL };
  const base: AgentOptions = {
    apiKey,
    model,
    name: `arco-${arcoSessionId.slice(0, 8)}`,
    mcpServers: cursorMcpServers(),
  };

  if (settings.cursorRuntime === "cloud") {
    const repoUrl = settings.cursorRepoUrl.trim();
    if (!repoUrl) {
      throw new Error("Cloud Cursor agents need a repository URL in Settings → Agent.");
    }
    return { ...base, cloud: { repos: [{ url: repoUrl }] } };
  }

  return {
    ...base,
    local: {
      cwd: getActiveRoot(),
      settingSources: [],
    },
  };
}

async function createRun(
  arcoSessionId: string,
  settings: Settings,
  emit: (event: AgentEvent) => void,
): Promise<CursorRun> {
  const agent = await Agent.create(buildAgentOptions(settings, arcoSessionId));
  const run: CursorRun = {
    settingsKey: settingsKey(settings),
    agent,
    emit,
    turnText: "",
  };
  runs.set(arcoSessionId, run);
  return run;
}

async function ensureRun(
  arcoSessionId: string,
  settings: Settings,
  emit: (event: AgentEvent) => void,
): Promise<CursorRun> {
  const existing = runs.get(arcoSessionId);
  const key = settingsKey(settings);
  if (existing && existing.settingsKey === key) {
    return existing;
  }
  if (existing) {
    existing.agent.close();
    runs.delete(arcoSessionId);
  }
  return createRun(arcoSessionId, settings, emit);
}

async function consumeStream(
  run: Awaited<ReturnType<SDKAgent["send"]>>,
  state: CursorRun,
): Promise<void> {
  let emittedLen = 0;
  try {
    for await (const msg of run.stream()) {
      if (msg.type === "assistant") {
        const text = msg.message.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("");
        if (text.length > emittedLen) {
          const delta = text.slice(emittedLen);
          state.emit({ type: "text_delta", delta });
          state.turnText += delta;
          emittedLen = text.length;
        }
      } else if (msg.type === "tool_call") {
        if (msg.status === "running") {
          state.emit({
            type: "tool_start",
            callId: msg.call_id,
            name: msg.name,
            args:
              msg.args && typeof msg.args === "object" && !Array.isArray(msg.args)
                ? (msg.args as Record<string, unknown>)
                : {},
          });
        } else {
          const result =
            typeof msg.result === "string"
              ? msg.result
              : msg.result != null
                ? JSON.stringify(msg.result)
                : msg.status === "error"
                  ? "(tool error)"
                  : "";
          state.emit({
            type: "tool_end",
            callId: msg.call_id,
            name: msg.name,
            result,
          });
        }
      } else if (msg.type === "usage") {
        state.emit({
          type: "usage",
          promptTokens: msg.usage.inputTokens,
          completionTokens: msg.usage.outputTokens,
          totalTokens: msg.usage.totalTokens,
        });
      }
    }
  } catch {
    // Stream closed — wait() carries the terminal result.
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Run one chat turn through a Cursor SDK agent. Same contract as runAgentTurn.
 */
export async function runCursorTurn(opts: RunTurnOptions): Promise<string> {
  const settings = loadSettings();
  const session = await sessionStore.get(opts.sessionId);
  if (!session) throw new Error(`Session not found: ${opts.sessionId}`);

  await sessionStore.appendMessages(session.id, [{ role: "user", content: opts.userMessage }]);

  const state = await ensureRun(opts.sessionId, settings, opts.emit);
  state.emit = opts.emit;
  state.turnText = "";

  const sendOptions = {
    mode: (opts.readOnly ? "plan" : "agent") as "plan" | "agent",
    mcpServers: cursorMcpServers(),
    ...(settings.cursorRuntime === "local" ? { local: { force: false } } : {}),
  };

  let run: Awaited<ReturnType<SDKAgent["send"]>>;
  try {
    run = await state.agent.send(opts.userMessage, sendOptions);
  } catch (err) {
    if (err instanceof CursorAgentError && /busy/i.test(err.message) && settings.cursorRuntime === "local") {
      run = await state.agent.send(opts.userMessage, {
        ...sendOptions,
        local: { force: true },
      });
    } else {
      throw err;
    }
  }

  const onAbort = () => {
    if (run.supports("cancel")) void run.cancel();
  };
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  const streamTask = consumeStream(run, state);

  try {
    const result = await run.wait();
    await streamTask;

    let finalText = state.turnText || result.result || "";
    if (result.status === "error") {
      const detail = result.error?.message ?? "Cursor agent run failed";
      throw new Error(detail);
    }
    if (!finalText) {
      finalText = "(no response)";
    }

    await sessionStore.appendMessages(session.id, [{ role: "assistant", content: finalText }]);
    return finalText;
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(
        `Cursor agent failed to start: ${err.message}. Check your API key in Settings → Agent.`,
      );
    }
    throw err;
  } finally {
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/** Close all Cursor SDK agent handles — called when Cursor settings change. */
export function stopAllCursorRuns(): void {
  for (const [, run] of runs) {
    run.agent.close();
  }
  runs.clear();
}
