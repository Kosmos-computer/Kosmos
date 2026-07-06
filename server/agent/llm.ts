/**
 * LLM connectivity — one OpenAI-compatible streaming client covers OpenAI,
 * Anthropic (compat endpoint), OpenRouter, Ollama and anything else speaking
 * /v1/chat/completions. A scripted mock provider makes the whole OS demoable
 * without an API key.
 */
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.mjs";
import type { Settings } from "../../shared/types.js";

export type LlmMessage = ChatCompletionMessageParam;

/**
 * Caps a single completion so a local model stuck in a repetition loop
 * (e.g. re-emitting the same widget-DSL line forever) can't balloon a
 * tool-call argument into a payload so large it breaks the backend's own
 * JSON encoding — llama-server has been seen returning a raw 500 with a
 * C++ JSON parser exception in that case instead of failing cleanly.
 */
const MAX_COMPLETION_TOKENS = 4096;

export interface LlmToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AccumulatedToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmTurn {
  text: string;
  toolCalls: AccumulatedToolCall[];
  usage?: TokenUsage;
}

export interface StreamTurnOptions {
  settings: Settings;
  messages: LlmMessage[];
  tools: LlmToolDef[];
  onTextDelta: (delta: string) => void;
  signal?: AbortSignal;
}

/**
 * Run one completion: stream text deltas out through the callback, accumulate
 * tool-call argument deltas, and return the assembled turn. The agent loop
 * decides whether to execute tools and go again.
 */
export async function streamTurn(opts: StreamTurnOptions): Promise<LlmTurn> {
  if (opts.settings.provider === "mock") return mockTurn(opts);

  const client = new OpenAI({
    apiKey: opts.settings.apiKey || "missing",
    baseURL: opts.settings.baseUrl,
  });

  const tools: ChatCompletionTool[] = opts.tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const stream = await client.chat.completions
    .create(
      {
        model: opts.settings.model,
        messages: opts.messages,
        ...(tools.length > 0 ? { tools } : {}),
        stream: true,
        max_tokens: MAX_COMPLETION_TOKENS,
        // Ask OpenAI-compatible backends to append a final usage-only chunk
        // so the UI can show live token counts alongside the elapsed timer.
        stream_options: { include_usage: true },
      },
      { signal: opts.signal },
    )
    .catch((err) => {
      throw new Error(describeCompletionError(err));
    });

  let text = "";
  const calls: AccumulatedToolCall[] = [];
  let usage: TokenUsage | undefined;

  for await (const chunk of stream) {
    if (chunk.usage) {
      usage = {
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
        totalTokens: chunk.usage.total_tokens,
      };
    }
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;
    if (delta.content) {
      text += delta.content;
      opts.onTextDelta(delta.content);
    }
    for (const tc of delta.tool_calls ?? []) {
      const idx = tc.index ?? 0;
      if (!calls[idx]) calls[idx] = { id: tc.id ?? `call_${idx}`, name: "", arguments: "" };
      if (tc.id) calls[idx].id = tc.id;
      if (tc.function?.name) calls[idx].name += tc.function.name;
      if (tc.function?.arguments) calls[idx].arguments += tc.function.arguments;
    }
  }

  return { text, toolCalls: calls.filter(Boolean), usage };
}

/**
 * Local llama.cpp-style backends sometimes fail mid-generation (e.g. a
 * repetition loop breaks their own grammar-constrained JSON encoder) and
 * return a raw 500 whose body is a C++ JSON parser exception rather than a
 * normal API error. Recognize that shape and give the user something
 * actionable instead of the raw parser dump.
 */
function describeCompletionError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/json\.exception\.parse_error/.test(message)) {
    return (
      "The local model got stuck generating a response (likely a repetition " +
      "loop) and produced output its own server couldn't parse. Try again, " +
      "rephrase the request, or switch to a different model in Settings."
    );
  }
  return message;
}

// ── Mock provider ────────────────────────────────────────────────────────────
// A tiny scripted "model": first turn streams an intro and calls the real
// tools (db seeding + app_create); once tool results are in the transcript it
// streams a closing message with inline generative UI. Exercises the entire
// pipeline — lint, app store, live Query/Mutation — with zero API calls.

const MOCK_APP_CODE = `root = Stack([header, addCard, listCard, chartCard])
header = CardHeader("Arco Demo Board", "Live todos stored in SQLite — ask the agent to refine me")
$text = ""
$selectedId = null
todos = Query("db_query", {sql: "SELECT id, text, done, created_at FROM todos ORDER BY created_at DESC", namespace: "arco_demo"}, {rows: []}, 8)
statusData = Query("db_query", {sql: "SELECT CASE done WHEN 1 THEN 'Done' ELSE 'Open' END AS status, COUNT(*) AS n FROM todos GROUP BY done", namespace: "arco_demo"}, {rows: []}, 8)
addTodo = Mutation("db_execute", {sql: "INSERT INTO todos (text) VALUES ($text)", params: {text: $text}, namespace: "arco_demo"})
addCard = Card([addRow])
addRow = Stack([addInput, addBtn], "row", "s", "end")
addInput = Input("text", "What needs doing?", "text", null, $text)
addBtn = Button("Add", Action([@Run(addTodo), @Run(todos), @Run(statusData), @Reset($text)]), "primary")
listCard = Card([CardHeader("Todos"), todoTable])
todoTable = Table([Col("Task", todos.rows.text), Col("Done", todos.rows.done, "number"), Col("Created", todos.rows.created_at)])
chartCard = Card([CardHeader("Completion"), donut])
donut = PieChart(statusData.rows.status, statusData.rows.n)`;

const MOCK_FINAL = `Your **Arco Demo Board** is ready and already open on the desktop. It stores todos in SQLite and refreshes live — no model calls needed once it's built.

\`\`\`openui-lang
root = Card([intro, follow])
intro = TextContent("Try adding a todo in the app window — the pie chart updates on the next refresh cycle.", "default")
follow = FollowUpBlock([f1, f2])
f1 = FollowUpItem("Add a completion trend chart to the demo board")
f2 = FollowUpItem("Build a system monitor app with live CPU and memory")
\`\`\`

*(You're on the built-in mock provider — connect a real model in Settings to generate anything you can describe.)*`;

async function streamText(text: string, onDelta: (d: string) => void): Promise<void> {
  const words = text.split(/(?<=\s)/);
  for (const w of words) {
    onDelta(w);
    await new Promise((r) => setTimeout(r, 8));
  }
}

/** No real API call to report usage from — approximate at ~4 chars/token so the mock provider still exercises the token readout. */
function estimateUsage(messages: LlmMessage[], completion: string): TokenUsage {
  const promptChars = messages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0), 0);
  const promptTokens = Math.max(1, Math.round(promptChars / 4));
  const completionTokens = Math.max(1, Math.round(completion.length / 4));
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
}

async function mockTurn(opts: StreamTurnOptions): Promise<LlmTurn> {
  const last = opts.messages[opts.messages.length - 1];

  // Tool results already in the transcript → close out the run.
  if (last?.role === "tool") {
    await streamText(MOCK_FINAL, opts.onTextDelta);
    return { text: MOCK_FINAL, toolCalls: [], usage: estimateUsage(opts.messages, MOCK_FINAL) };
  }

  const intro =
    "I'm the built-in mock agent (no API key configured). I'll demonstrate the full generative pipeline by building you a live demo app backed by SQLite.\n\n";
  await streamText(intro, opts.onTextDelta);

  return {
    text: intro,
    usage: estimateUsage(opts.messages, intro),
    toolCalls: [
      {
        id: "mock_db_schema",
        name: "db_execute",
        arguments: JSON.stringify({
          sql: "CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY, text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
          namespace: "arco_demo",
        }),
      },
      {
        id: "mock_db_seed",
        name: "db_execute",
        arguments: JSON.stringify({
          sql: "INSERT INTO todos (text, done) SELECT 'Explore Arco OS', 1 WHERE NOT EXISTS (SELECT 1 FROM todos)",
          namespace: "arco_demo",
        }),
      },
      {
        id: "mock_app_create",
        name: "app_create",
        arguments: JSON.stringify({ title: "Arco Demo Board", code: MOCK_APP_CODE }),
      },
    ],
  };
}
