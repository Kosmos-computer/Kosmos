/**
 * ACP client — Arco driving an external coding agent as a pluggable brain.
 *
 * ACP (Agent Client Protocol, agentclientprotocol.com) is Zed's standard for
 * editor ↔ coding-agent communication over JSON-RPC/stdio. Here the roles
 * flip from our /mcp endpoint: Arco is the *client*, and the agent (Claude
 * Code, Codex, Gemini CLI, or any stdio ACP server) is a subprocess we spawn.
 * The external agent manages its own LLM, tools, and execution; we send
 * turns and translate its update stream into the same AgentEvents the
 * built-in loop emits, so the Studio UI renders both brains identically:
 *
 *   agent_message_chunk        → text_delta
 *   tool_call / tool_call_update → tool_start / tool_end
 *   session/request_permission → confirm_required (existing confirm card)
 *   fs/write_text_file         → file_changed (with a real before/after diff)
 *
 * One subprocess per Arco chat session, spawned lazily on the first turn and
 * kept warm between turns (the agent holds the conversation context — we
 * only persist user + final assistant text for transcript rendering).
 * Enabled MCP servers are forwarded into session/new, so the external agent
 * connects to the user's servers directly — the reason McpServerConfig was
 * shaped to match ACP's McpServer schema from day one.
 *
 * Credentials: the provider CLIs auto-detect their own subscription logins
 * (Claude/ChatGPT/Google), which take priority over API keys. When Settings
 * holds a matching provider key we also export it as the env var the CLI
 * reads, covering machines with no stored login.
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type Client,
  type ContentBlock,
  type McpServer as AcpMcpServer,
  type ReadTextFileRequest,
  type ReadTextFileResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionModelState,
  type SessionNotification,
  type WriteTextFileRequest,
  type WriteTextFileResponse,
} from "@zed-industries/agent-client-protocol";
import type { AgentEvent, Settings } from "../../shared/types.js";
import { dataDirs, loadSettings } from "../env.js";
import { requestConfirmation } from "../agent/confirmations.js";
import type { RunTurnOptions } from "../agent/loop.js";
import { mcpServerStore } from "../mcp/serverStore.js";
import { getActiveRoot } from "../stores/workspaceStore.js";
import { sessionStore } from "../stores/sessionStore.js";

// ── Run registry ─────────────────────────────────────────────────────────────

/**
 * One live agent subprocess, keyed by Arco session id. `emit` is swapped in
 * at the start of every turn: updates can only arrive while a prompt() is in
 * flight, so pointing it at the current turn's SSE sink is always correct.
 */
interface AcpRun {
  /** Arco chat session id (checkpoint / transcript key). */
  arcoSessionId: string;
  command: string;
  child: ChildProcessWithoutNullStreams;
  conn: ClientSideConnection;
  acpSessionId: string;
  emit: (event: AgentEvent) => void;
  /** Accumulated assistant text for the in-flight turn. */
  turnText: string;
  /** toolCallId → display name, so tool_end can echo what tool_start named. */
  toolNames: Map<string, string>;
  /** Current turn cancellation, also releases pending permission cards. */
  signal?: AbortSignal;
  /** Rejects when the subprocess dies — raced against prompt() so a crashed
   * agent fails the turn instead of hanging the SSE stream forever. */
  exited: Promise<never>;
  /** Models advertised by the agent (unstable session models API in SDK 0.4). */
  models: SessionModelState | null;
}

const runs = new Map<string, AcpRun>();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal shell-style tokenizer: whitespace-split, honoring quoted spans. */
function tokenize(command: string): string[] {
  const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  return tokens.map((t) => t.replace(/^["']|["']$/g, ""));
}

/** Flatten an ACP content block to displayable text. */
function contentText(block: ContentBlock): string {
  if (block.type === "text") return block.text;
  if (block.type === "resource_link") return block.uri;
  if (block.type === "resource" && "text" in block.resource) return block.resource.text;
  return "";
}

/**
 * Enabled MCP servers, reshaped to ACP's McpServer union. Real (unmasked)
 * secrets are intentional: the subprocess needs working headers/env exactly
 * like our own supervisor does.
 */
function acpMcpServers(): AcpMcpServer[] {
  return mcpServerStore
    .list()
    .filter((s) => s.enabled)
    .map((s): AcpMcpServer => {
      const t = s.transport;
      if (t.kind === "stdio") {
        return {
          name: s.name,
          command: t.command,
          args: t.args ?? [],
          env: Object.entries(t.env ?? {}).map(([name, value]) => ({ name, value })),
        };
      }
      return {
        type: t.kind,
        name: s.name,
        url: t.url,
        headers: Object.entries(t.headers ?? {}).map(([name, value]) => ({ name, value })),
      };
    });
}

/** Resolve OpenAI key from settings wallet or env — not only the legacy top-level field. */
function resolveOpenAiKey(settings: Settings): string {
  return (
    settings.apiKey.trim() ||
    settings.apiKeys?.openai?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.LLM_API_KEY?.trim() ||
    ""
  );
}

function formatAcpError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const o = err as { message?: string; code?: number; data?: unknown };
    const detail =
      typeof o.data === "string" ? o.data : o.data != null ? JSON.stringify(o.data) : "";
    return [o.message, detail].filter(Boolean).join(": ") || JSON.stringify(err);
  }
  return String(err);
}

/**
 * Subprocess environment: inherit ours, then export the Settings API key
 * under the env var the provider CLI reads. Harmless when a subscription
 * login exists — the CLIs prefer their own stored login over env keys.
 */
function spawnEnv(settings: Settings): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_BROWSER: "1" };
  env.CODEX_HOME = path.join(dataDirs.root, ".codex");
  const openaiKey = resolveOpenAiKey(settings);
  if (openaiKey) {
    env.OPENAI_API_KEY = openaiKey;
    env.CODEX_API_KEY = openaiKey;
    env.DEFAULT_AUTH_REQUEST = JSON.stringify({ methodId: "openai-api-key" });
  }
  if (settings.apiKey && settings.provider === "anthropic") {
    env.ANTHROPIC_API_KEY = settings.apiKey;
  }
  return env;
}

async function authenticateAcpAgent(
  conn: ClientSideConnection,
  init: { authMethods?: { id: string }[] },
  settings: Settings,
): Promise<void> {
  const methods = init.authMethods?.map((m) => m.id) ?? [];
  if (methods.length === 0) return;

  const openaiKey = resolveOpenAiKey(settings);
  let methodId: string | null = null;
  if (openaiKey && methods.includes("openai-api-key")) methodId = "openai-api-key";
  else if (openaiKey && methods.includes("codex-api-key")) methodId = "codex-api-key";

  if (!methodId) {
    throw new Error(
      "ACP agent requires authentication. Add an OpenAI API key in Settings → Model, " +
        "or sign in with the provider CLI (e.g. `codex login`).",
    );
  }
  await conn.authenticate({ methodId });
}

/**
 * ACP file paths are absolute (the agent works in cwd = active project
 * root); confine them to that root, same policy as the built-in loop's
 * resolveProjectPath.
 */
/** Realpath that tolerates not-yet-existing files: resolve the deepest
 * existing ancestor, then re-append the remainder. */
function realish(p: string): string {
  let dir = path.resolve(p);
  const suffix: string[] = [];
  while (!fs.existsSync(dir)) {
    suffix.unshift(path.basename(dir));
    dir = path.dirname(dir);
  }
  return path.join(fs.realpathSync(dir), ...suffix);
}

function guardAbsolutePath(p: string): string {
  // Compare real paths: the subprocess sees its cwd through resolved
  // symlinks (macOS /tmp → /private/tmp) while getActiveRoot() may not be.
  const root = realish(getActiveRoot());
  const abs = realish(p);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error(`Path escapes the project root: ${p}`);
  }
  return abs;
}

// ── Client handler (agent → Arco) ────────────────────────────────────────────

function makeClient(run: AcpRun): Client {
  return {
    async sessionUpdate(params: SessionNotification): Promise<void> {
      const update = params.update;
      switch (update.sessionUpdate) {
        case "agent_message_chunk": {
          const delta = contentText(update.content);
          if (!delta) return;
          run.turnText += delta;
          run.emit({ type: "text_delta", delta });
          return;
        }
        case "tool_call": {
          const name = update.title || update.kind || "tool";
          run.toolNames.set(update.toolCallId, name);
          run.emit({
            type: "tool_start",
            callId: update.toolCallId,
            name,
            args: update.rawInput ?? {},
          });
          return;
        }
        case "tool_call_update": {
          if (update.status !== "completed" && update.status !== "failed") return;
          const result =
            update.rawOutput !== undefined
              ? JSON.stringify(update.rawOutput)
              : (update.content ?? [])
                  .map((c) => (c.type === "content" ? contentText(c.content) : ""))
                  .join("\n") || update.status;
          run.emit({
            type: "tool_end",
            callId: update.toolCallId,
            name: run.toolNames.get(update.toolCallId) ?? "tool",
            result,
          });
          return;
        }
        // Thoughts, plans, mode/command announcements have no Studio surface
        // yet; dropping them is safe (they're advisory, not state).
        default:
          return;
      }
    },

    async requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
      const title = params.toolCall.title ?? params.toolCall.toolCallId ?? "agent action";
      const { confirmId, verdict } = requestConfirmation(run.signal);
      run.emit({ type: "confirm_required", confirmId, command: title });
      const answer = await verdict;
      // Translate our Allow/Deny to the closest ACP option. Blanket options
      // (allow_always) are never auto-picked — one card, one approval.
      const wanted = answer.approved ? ["allow_once", "allow_always"] : ["reject_once", "reject_always"];
      for (const kind of wanted) {
        const option = params.options.find((o) => o.kind === kind);
        if (option) return { outcome: { outcome: "selected", optionId: option.optionId } };
      }
      return { outcome: { outcome: "cancelled" } };
    },

    async readTextFile(params: ReadTextFileRequest): Promise<ReadTextFileResponse> {
      const abs = guardAbsolutePath(params.path);
      let content = await fsp.readFile(abs, "utf-8");
      if (params.line != null || params.limit != null) {
        const lines = content.split("\n");
        const start = Math.max((params.line ?? 1) - 1, 0);
        content = lines.slice(start, params.limit != null ? start + params.limit : undefined).join("\n");
      }
      return { content };
    },

    async writeTextFile(params: WriteTextFileRequest): Promise<WriteTextFileResponse> {
      const abs = guardAbsolutePath(params.path);
      const before = await fsp.readFile(abs, "utf-8").catch(() => null);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, params.content, "utf-8");
      const rel = path.relative(realish(getActiveRoot()), abs);
      run.emit({
        type: "file_changed",
        path: rel,
        before,
        after: params.content,
      });
      const { checkpointStore } = await import("../stores/checkpointStore.js");
      void checkpointStore.recordEdit(run.arcoSessionId, {
        path: rel,
        before,
        after: params.content,
      });
      return {};
    },
  };
}

// ── Spawn + handshake ────────────────────────────────────────────────────────

async function spawnRun(
  arcoSessionId: string,
  settings: Settings,
  emit: (event: AgentEvent) => void,
  acpCommand?: string,
): Promise<AcpRun> {
  const command = (acpCommand?.trim() || settings.acpCommand).trim();
  const [cmd, ...args] = tokenize(command);
  if (!cmd) throw new Error("No ACP agent command configured — set one in Settings → Agent.");

  const logDir = path.join(dataDirs.root, "acp-logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `${arcoSessionId}.log`);

  const child = spawn(cmd, args, {
    cwd: getActiveRoot(),
    env: spawnEnv(settings),
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stderr.on("data", (chunk: Buffer) => {
    fs.appendFile(logPath, chunk, () => {});
  });

  const run: AcpRun = {
    arcoSessionId,
    command,
    child,
    conn: undefined as unknown as ClientSideConnection,
    acpSessionId: "",
    emit,
    turnText: "",
    toolNames: new Map(),
    signal: undefined,
    models: null,
    exited: new Promise<never>((_, reject) => {
      child.on("exit", (code) => {
        runs.delete(arcoSessionId);
        reject(new Error(`ACP agent exited (code ${code ?? "signal"}) — see ${logPath}`));
      });
      child.on("error", (err) => {
        runs.delete(arcoSessionId);
        reject(new Error(`Failed to spawn ACP agent "${cmd}": ${err.message}`));
      });
    }),
  };
  // Unhandled-rejection guard: between turns nobody races `exited`.
  run.exited.catch(() => {});

  const stream = ndJsonStream(
    Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
    Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
  );
  run.conn = new ClientSideConnection(() => makeClient(run), stream);

  const handshake = (async () => {
    const init = await run.conn.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: false },
    });
    await authenticateAcpAgent(run.conn, init, settings);
    const created = await run.conn.newSession({ cwd: getActiveRoot(), mcpServers: acpMcpServers() });
    run.acpSessionId = created.sessionId;
    run.models = created.models ?? null;
  })();

  try {
    await Promise.race([handshake, run.exited]);
  } catch (err) {
    child.kill();
    runs.delete(arcoSessionId);
    const message = formatAcpError(err);
    // auth_required is the one error every user will eventually hit; make it
    // actionable instead of surfacing a bare JSON-RPC code.
    if (/auth/i.test(message)) {
      throw new Error(
        `ACP agent requires authentication: ${message}. Sign in with the provider's own CLI ` +
          `(e.g. \`claude /login\`, \`codex login\`, \`gemini\`) or set a matching API key in Settings.`,
      );
    }
    throw new Error(`ACP handshake failed: ${message}`);
  }

  runs.set(arcoSessionId, run);
  return run;
}

/** Reuse a live subprocess when the command hasn't changed; respawn otherwise. */
async function ensureRun(
  arcoSessionId: string,
  settings: Settings,
  emit: (event: AgentEvent) => void,
  acpCommand?: string,
): Promise<AcpRun> {
  const command = (acpCommand?.trim() || settings.acpCommand).trim();
  const existing = runs.get(arcoSessionId);
  if (existing) {
    if (existing.command === command && existing.child.exitCode === null) {
      return existing;
    }
    existing.child.kill();
    runs.delete(arcoSessionId);
  }
  return spawnRun(arcoSessionId, settings, emit, command);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Run one chat turn through the external ACP agent. Same contract as
 * runAgentTurn: appends the user message, streams AgentEvents via emit,
 * persists and returns the final assistant text.
 */
export async function runAcpTurn(opts: RunTurnOptions): Promise<string> {
  const settings = loadSettings();
  const session = await sessionStore.get(opts.sessionId);
  if (!session) throw new Error(`Session not found: ${opts.sessionId}`);

  const { withSessionWorkspace } = await import("../stores/turnWorkspace.js");
  return withSessionWorkspace(session.projectId, () => runAcpTurnBody(opts, session, settings));
}

async function runAcpTurnBody(
  opts: RunTurnOptions,
  session: NonNullable<Awaited<ReturnType<typeof sessionStore.get>>>,
  settings: import("../../shared/types.js").Settings,
): Promise<string> {
  await sessionStore.appendMessages(session.id, [{ role: "user", content: opts.userMessage }]);

  const run = await ensureRun(opts.sessionId, settings, opts.emit, opts.acpCommand);
  run.emit = opts.emit;
  run.turnText = "";
  run.signal = opts.signal;

  const onAbort = () => {
    void run.conn.cancel({ sessionId: run.acpSessionId }).catch(() => {});
  };
  opts.signal?.addEventListener("abort", onAbort, { once: true });
  if (opts.signal?.aborted) onAbort();

  try {
    const response = await Promise.race([
      run.conn.prompt({
        sessionId: run.acpSessionId,
        prompt: [{ type: "text", text: opts.userMessage }],
      }),
      run.exited,
    ]);

    let finalText = run.turnText;
    if (!finalText && response.stopReason !== "end_turn") {
      finalText = `(agent stopped: ${response.stopReason})`;
    }
    if (finalText) {
      await sessionStore.appendMessages(session.id, [{ role: "assistant", content: finalText }]);
    }
    return finalText;
  } catch (err) {
    // A dead subprocess must not poison the session — the next turn respawns.
    if (run.child.exitCode !== null) runs.delete(opts.sessionId);
    throw err;
  } finally {
    opts.signal?.removeEventListener("abort", onAbort);
    run.signal = undefined;
  }
}

/** Kill all agent subprocesses — called when agent settings change. */
export function stopAllAcpRuns(): void {
  for (const [id, run] of runs) {
    run.child.kill();
    runs.delete(id);
  }
}

/** Peek cached ACP model state for a warm session key (no spawn). */
export function peekAcpModels(sessionKey: string): SessionModelState | null {
  return runs.get(sessionKey)?.models ?? null;
}

/**
 * Ensure an ACP subprocess is warm for `sessionKey` and return its model list.
 * Uses the unstable session `models` field (SDK 0.4); migrate to
 * configOptions when the dependency is upgraded.
 */
export async function ensureAcpModels(
  sessionKey: string,
  acpCommand: string,
): Promise<SessionModelState | null> {
  const settings = loadSettings();
  const run = await ensureRun(sessionKey, settings, () => {}, acpCommand);
  return run.models;
}

/** Select a model on a warm (or freshly ensured) ACP session. */
export async function setAcpSessionModel(
  sessionKey: string,
  modelId: string,
  acpCommand?: string,
): Promise<SessionModelState | null> {
  const settings = loadSettings();
  const run = await ensureRun(sessionKey, settings, () => {}, acpCommand);
  await run.conn.setSessionModel({
    sessionId: run.acpSessionId,
    modelId,
  });
  if (run.models) {
    run.models = {
      ...run.models,
      currentModelId: modelId,
    };
  } else {
    run.models = {
      availableModels: [{ modelId, name: modelId }],
      currentModelId: modelId,
    };
  }
  return run.models;
}
