/**
 * Build script — emits the prompt + schema artifacts the Arco server needs at
 * runtime. Ported from openclaw-os `claw-plugin/generate-prompt.ts` and
 * adapted for Arco's tool surface and adaptive-layout requirements.
 *
 *   server/generated/chat-prompt.md    — inline generative UI in chat replies (static surface)
 *   server/generated/app-prompt.md     — durable apps (Query/Mutation/$state, full surface)
 *   server/generated/openui-schema.json — drives the lint loop in server/lint/lint-openui.ts
 *
 * Why a build script: `openuiLibrary` carries "use client" + React imports.
 * They are fine to import in a Node build script, but we don't want the
 * component library loaded inside the server process. Generate once, ship
 * the strings as filesystem artifacts.
 *
 * Re-run with `npm run generate` whenever @openuidev/react-ui changes.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateWidgetPromptSection } from "../shared/widgets/prompt.js";
import {
  openuiAdditionalRules,
  openuiChatAdditionalRules,
  openuiChatExamples,
  openuiChatLibrary,
  openuiChatPromptOptions,
  openuiExamples,
  openuiLibrary,
  openuiPromptOptions,
} from "@openuidev/react-ui/genui-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(__dirname, "..", "server", "generated");
mkdirSync(generatedDir, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// 1. Chat prompt — inline UI in a chat reply. Static surface only.
// ─────────────────────────────────────────────────────────────────────────────

const CHAT_PREAMBLE = `You can render generative UI inline in a chat reply, using a small DSL called openui-lang.

DSL SHAPE — every program is identifier-equals-component-call assignments:

  identifier = Component(arg1, arg2)
  root = Card([child1, child2])

NOT JSX (\`<Section>\`). NOT object literals (\`Section { ... }\`). NOT MDX. If you catch yourself writing braces around component bodies or angle brackets, stop — you are hallucinating a different DSL. Your training data does not contain openui-lang.

Wrap your openui-lang code in triple-backtick fences tagged \`openui-lang\`. The renderer ONLY extracts code from those fences.

Three response shapes:
1. Plain text — for simple questions ("hi", "what time is it", "explain X").
2. Text + UI — short prose, then a fenced openui-lang block (most common shape).
3. UI only — when the user explicitly asks for a chart, table, form, or follow-ups.

Render UI when ANY of these apply:
- Chart, graph, plot, trend, comparison, table, breakdown, summary, visualization.
- Compare or rank 2+ things; series of numbers; leaderboards.
- Multi-field input ("plan a trip", "fill out X", "set up Y") — render a Form with FormControls + submit Button. Never a numbered question list.
- Answer would exceed ~10 lines — wrap in \`SectionBlock([SectionItem(...)])\`.
- Suggesting next actions — end with \`FollowUpBlock([FollowUpItem(...)])\`.

This surface is STATIC: no \`Query\`, no \`Mutation\`, no \`$state\` runtime. The \`value\` arg on Input/TextArea/Select takes a static default string — it is NOT a \`$state\` binding (chat has nothing to bind to). To collect form data, attach \`Action([@ToAssistant("...")])\` to the submit Button so the form contents come back as a user message.

If the user wants live data, refresh, or write operations, do NOT render inline UI — build a durable app with \`app_create\` instead.

COMMON MISTAKES (the renderer drops them or shows broken UI):

- Section { } or <Section>           → SectionBlock([SectionItem("id", "Trigger", [content])])
- Heading("Title")                   → CardHeader("Title", "Subtitle") or TextContent("Title", "large-heavy")
- Markdown(...)                      → MarkDownRenderer(...)
- Badge(...)                         → Tag(text, null, "sm", "info" | "success" | "warning" | "danger")
- Divider()                          → Separator()
- Stack([a, b], "row", "m")          → chat has NO Stack. Use Tabs/Carousel/SectionBlock, or stack vertically inside Card (the default).
- Input(name, ph, "text", null, $x)  → chat has NO $state. Pass a static string default: Input(name, ph, "text", null, "default")
- FollowUp("text", "msg")            → FollowUpItem("text") — one arg, the clickable text
- TabItem("rev", "Revenue", revTab)  → TabItem("rev", "Revenue", [revTab]) — content MUST be an array, even with one child
- AccordionItem same — three args, content array
- "col" direction                    → "column" (or omit; column is the default)
- @Map(rows, ...)                    → there is no @Map in chat (no live data anyway). Just inline literal arrays.
- Triple-backticks INSIDE MarkDownRenderer text → close the outer openui-lang fence early. NEVER nest triple-backticks. Use single backticks or describe code in prose.

STREAMING ORDER — define dependencies right after their parent, breadth-first. A reference resolves only once its definition has streamed in, so a child defined far below its parent renders late. In particular: a Form's Buttons argument (2nd positional) is the submit affordance — define \`btns\` and its Button(s) IMMEDIATELY after \`form = Form(...)\`, BEFORE the FormControl fields, or the submit button only pops in at the very end. Same for any container: \`Card([a, b])\` → define \`a\`, then \`b\`, then their internals. Don't push all leaf definitions to the bottom.`;

const chatPromptRaw = openuiChatLibrary.prompt({
  ...openuiChatPromptOptions,
  preamble: CHAT_PREAMBLE,
  toolCalls: false,
  bindings: false,
  examples: openuiChatExamples,
  additionalRules: openuiChatAdditionalRules,
});

// Strip `$binding<...>` annotations — the static chat surface has no $state
// runtime, so leaving them in teaches the model a capability it doesn't have.
const chatPrompt = chatPromptRaw
  .replace(/\nProps marked `\$binding<type>` accept[^\n]*\n/g, "\n")
  .replace(/\$binding<([^>]+)>/g, "$1");

const widgetSection = generateWidgetPromptSection();
const chatPromptFull = `${chatPrompt.trimEnd()}\n\n${widgetSection}\n`;
writeFileSync(join(generatedDir, "chat-prompt.md"), chatPromptFull, "utf8");
console.log(`✓ server/generated/chat-prompt.md (${chatPromptFull.length} chars, incl. widgets)`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. App prompt — durable apps with live data. Full reactive surface.
// ─────────────────────────────────────────────────────────────────────────────

const CREATOR_PREAMBLE = `You can create and edit durable apps using openui-lang — a small DSL specific to Arco OS. Apps persist via \`app_create\` / \`app_update\` and run independently after creation; the runtime calls tools directly on every refresh with NO LLM in the loop. Apps appear on the user's desktop dock and open in resizable windows.

DSL SHAPE — every program is identifier-equals-component-call assignments:

  identifier = Component(arg1, arg2)
  root = Stack([child1, child2])

NOT JSX (\`<Section>\`). NOT object literals (\`Section { ... }\`). NOT MDX. Your training data does not contain openui-lang.

\`app_create\` and \`app_update\` take RAW openui-lang in the \`code\` / \`patch\` argument — no fences. Wrap in fences (tagged \`openui-lang\`) only when previewing inline.

CRITICAL — Query first arg is ONE of these four strings, no exceptions:
- \`"exec"\`        — shell in the Arco workspace. Args: \`{command: "..."}\`
- \`"read"\`        — file read (workspace-relative path). Args: \`{file_path: "..."}\`
- \`"db_query"\`    — read SQLite. Args: \`{sql: "SELECT ...", params?: {...}, namespace?: "default"}\`
- \`"db_execute"\`  — write SQLite (only inside \`Mutation\`). Args: \`{sql: "INSERT ...", params?: {...}, namespace?: "default"}\`

There is NO \`"fetch"\`, NO \`"http"\`, NO MCP-qualified tool name. To call an external API, write a Node script with the \`write_file\` tool (e.g. \`scripts/my-data.js\`) and shell out via \`Query("exec", {command: "node scripts/my-data.js"})\`. The exec cwd IS the workspace root, so relative paths work.

\`@Run\` / \`@Set\` / \`@Reset\` take a REFERENCE to a top-level statement, never an inline call. Per-row mutations: route the row id through a \`$state\`, then sequence \`@Set\` → \`@Run(mutationRef)\` → \`@Run(refreshQueryRef)\`.

Tables are COLUMN-oriented. \`Table([Col("Label", dataArray), Col("Count", countArray, "number")])\` — the third \`Col\` arg is a TYPE hint, not a label.

CALL \`app_create\` IMMEDIATELY when the code is ready. Do not wait for your final paragraph. After the tool returns, keep streaming explanation/follow-ups.

If \`app_create\` or \`app_update\` returns \`validationErrors\`, the code IS saved — but lint flagged issues. ALWAYS fix via a TINY follow-up \`app_update\` (1–10 statements) with ONLY the corrected statements. The runtime merges by statement name; untouched lines stay put. NEVER re-emit the whole program — that's the failure mode we're avoiding (slower, costs tokens, risks introducing new errors).

ADAPTIVE LAYOUT — apps render in windows of ANY size (a phone-width sidebar panel up to a full 5K display). The Arco runtime automatically reflows row Stacks into columns in compact containers, but you must design for it:
- NEVER use fixed pixel widths or assume a wide viewport.
- Structure content as vertically stackable groups: each row Stack should hold 2–3 self-contained Cards that still make sense stacked vertically.
- Put the most important KPI/summary content FIRST in \`root\` — in compact windows the user sees the top of the app.
- Prefer one chart per Card; charts resize fluidly.
- Tables with many columns degrade in narrow windows — keep tables to 3–5 essential columns.

LAYOUT — preventing pathologies the renderer can't shrink out of:
- Max 3 KPI Cards per row, NO wrap. For 4–6 KPIs, use TWO \`Stack(..., "row", "m", "stretch")\` rows. \`wrap=true\` on a row of Cards triggers a known interaction with the Card width style that collapses tile text to single characters.
- Do NOT nest \`Stack\` directly inside another \`Stack\` as a flex child. If you need a header with a left block + right block, wrap the inner block in \`Card([...], "clear")\` so it gets proper flex sizing. (\`Stack\` itself doesn't set \`min-width: 0\`, so as a flex child it can't shrink and will overflow.)

KPI STRIP RECIPE — use this exactly. There is no \`KPI\` / \`Metric\` / \`StatCard\` component:

  kpiRow = Stack([k1, k2, k3], "row", "m", "stretch")
  k1 = Card([TextContent("Open PRs", "small"), TextContent("" + @Count(prs), "large-heavy"), Tag("17 overdue", null, "sm", "warning")], "sunk")
  k2 = Card([TextContent("MRR", "small"), TextContent("$" + @Round(stripe.mrr, 0), "large-heavy")], "sunk")
  k3 = Card([TextContent("Runway", "small"), TextContent("" + stripe.runway + " mo", "large-heavy")], "sunk")

For 6 KPIs, two rows: \`kpiGrid = Stack([row1, row2], "column", "m", "stretch")\` then two row Stacks of 3 each.

SQL — verify columns BEFORE SELECT. Either run \`db_query\` with \`PRAGMA table_info(<table>)\` first, or write \`SELECT *\` and project columns in the UI. NEVER extrapolate column names from a pattern. The runtime fails with \`no such column\` and your app shows an error.

Multi-line statements are OK inside brackets and ternaries — newlines are ignored by the parser.

COMMON MISTAKES (these will lint-fail or break the render):

- Section { } or <Section>            → Accordion([AccordionItem("id", "Title", [content])]) — there is no SectionBlock in apps
- Heading("Title")                    → CardHeader("Title", "Subtitle") or TextContent("Title", "large-heavy")
- KpiCard / KPI / StatCard / Metric   → Card+TextContent recipe above
- Markdown(...)                       → MarkDownRenderer(...)
- Badge(...)                          → Tag(text, null, "sm", "info" | "success" | "warning" | "danger")
- Divider()                           → Separator()
- Tab(...)                            → TabItem("id", "Trigger", [content])
- Grid(...)                           → two Stack rows of max 3 children — NOT wrap=true
- FollowUpBlock / SectionBlock / ListBlock — chat-only; in apps use Accordion / Tabs / @Each(rows, "r", Card([...]))
- @Map(rows, ...)                     → @Each(rows, "r", ...)
- @JsonParse / @ParseJSON             → does not exist; Query("exec") auto-parses stdout starting with \`{\` or \`[\`
- @FormatDate / @FormatNumber         → do not exist; use string concat or @Round + concat
- @Length                             → @Count(array)
- @Find                               → @First(@Filter(array, "field", "==", value))
- TabItem("rev", "Revenue", revTab)   → TabItem("rev", "Revenue", [revTab]) — content MUST be an array
- AccordionItem same                  → three args, content array
- "col" direction                     → "column" (or omit; column is the default)

ENUM ENFORCEMENT (the lint validates these and reports \`validationErrors\` on the \`app_create\` / \`app_update\` response):
- Stack/Card direction: \`"row"\` | \`"column"\` only
- Card variant: \`"card"\` | \`"sunk"\` | \`"clear"\` (no \`"compact"\`/\`"primary"\`/\`"muted"\`/\`"warning"\`)
- Tag variant: \`"neutral"\` | \`"info"\` | \`"success"\` | \`"warning"\` | \`"danger"\` (no \`"negative"\`/\`"positive"\`/\`"medium"\`)
- TextContent size: \`"small"\` | \`"default"\` | \`"large"\` | \`"small-heavy"\` | \`"large-heavy"\` (no \`"huge"\`)`;

const creatorPrompt = openuiLibrary.prompt({
  ...openuiPromptOptions,
  preamble: CREATOR_PREAMBLE,
  toolCalls: true,
  bindings: true,
  editMode: true,
  inlineMode: true,
  examples: openuiExamples,
  additionalRules: openuiAdditionalRules,
});

const CREATOR_WORKFLOW = `

---

## Arco tools and workflow

Beyond the openui-lang surface above, wire apps into Arco's tool surface (\`app_create\`, \`app_update\`, \`get_app\`, \`list_apps\`, \`exec\`, \`read_file\`, \`write_file\`, \`db_query\`, \`db_execute\`).

### Creating an app

1. Write the complete openui-lang code.
2. Call \`app_create({title, code})\` with the title and the full RAW code (no fences).
3. Call \`app_create\` immediately once the code is ready. Do NOT wait for your final paragraph.

The app is stored, appears in the dock, and opens on the user's desktop. The user can open, refine, and return to it later.

### Apps with live data — discover → script → generate

Follow these three steps in order. Do NOT skip straight to generating markup.

**Step 1: Discover data.** Use the \`exec\` tool to explore what's available:

    exec({command: "vm_stat"})
    exec({command: "ps aux -m | head -10"})
    exec({command: "df -h"})

Inspect the raw output — understand its format, fields, and what can be extracted. Use absolute paths for system binaries outside /usr/bin and /bin (e.g. \`/usr/sbin/sysctl\`, \`/opt/homebrew/bin/<tool>\`).

**Step 2: Write and save a data script.** Raw command output is rarely in a shape the UI can bind to directly. Write a self-contained Node script that calls the raw commands, parses the output into clean JSON, and prints it via \`console.log(JSON.stringify(...))\`:

    write_file({path: "scripts/my-data.js", content: "const os = require('os');\\n..."})

Then test:

    exec({command: "node scripts/my-data.js"})

Verify the output is valid JSON like \`{"totalGB":16.0,"freeGB":2.1,"pct":86.9}\`. Embedding multi-line scripts inside Query strings causes escaping nightmares — saved script files keep the Query call readable.

**Step 3: Generate the app.** Create openui-lang with \`Query()\` statements that call the saved script:

    data = Query("exec", {command: "node scripts/my-data.js"}, {totalGB: 16.0, freeGB: 2.1, pct: 86.9}, 5)

- First arg: tool name — always \`"exec"\` (or \`"read"\` for file reads).
- Second arg: args object passed directly to the tool.
- Third arg: defaults — use the REAL JSON output from your step 2 test.
- Fourth arg: refresh interval in seconds.
- Access fields directly: \`data.fieldA\` — stdout is auto-parsed, no \`.result\` wrapper.

### Persistent app state (SQLite)

For todos, notes, saved filters, or any CRUD data, use the SQLite tools rather than faking state.

1. In the agent turn, call \`db_execute\` to create the schema.
2. In the app markup, use \`Query("db_query", ...)\` for reads.
3. Use \`Mutation("db_execute", ...)\` for writes.
4. Trigger the read query again after writes with \`Action([@Run(writeMutation), @Run(readQuery)])\`.

Example agent-turn setup:

    db_execute({sql: "CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY, text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)", namespace: "todos"})

Example app markup:

    $text = ""
    todos = Query("db_query", {sql: "SELECT id, text, done, created_at FROM todos ORDER BY created_at DESC", namespace: "todos"}, {rows: []}, 5)
    createTodo = Mutation("db_execute", {sql: "INSERT INTO todos (text) VALUES ($text)", params: {text: $text}, namespace: "todos"})
    addButton = Button("Add", Action([@Run(createTodo), @Run(todos), @Reset($text)]))

- \`db_query\` returns \`{namespace, rows: [...]}\`.
- \`db_execute\` returns \`{namespace, changes, lastInsertRowid}\`.
- Use the same \`namespace\` across setup, reads, and writes for one app.
- Prefer SQL parameters over string interpolation for user input.

### Editing apps (refine flow)

When the user wants to change an existing app (the context may include a \`linked_app\` id):

1. Call \`get_app({id: "..."})\` to see the current code.
2. Identify what needs to change.
3. Call \`app_update({id: "...", patch: "chart = LineChart(...)..."})\` with ONLY the changed/new statements.

The runtime merges by statement name:
- Same name → replaced.
- New name → added.
- Missing from patch → kept unchanged.

A typical edit is 1-5 statements. NEVER output the entire program as a patch.

### Manual refresh buttons

If the user wants a visible refresh control, re-run the declared \`Query()\` refs:

    refreshBtn = Button("↻ Refresh", Action([@Run(overview), @Run(procs)]), "secondary", "normal", "small")

A plain \`Button("Refresh")\` sends a message to the assistant; it does NOT refresh queries. Manual refresh always targets declared query refs via \`@Run(queryRef)\`.

### Automations (scheduled agent runs)

Use \`create_automation({name, schedule, prompt})\` for recurring work (cron syntax, e.g. \`"0 9 * * *"\` = daily 9am). An automation's prompt is its ONLY context at fire time — no session memory. Prompts must name their target explicitly: either \`db_execute\` with \`namespace\` + table schema, OR \`app_update\` with the app id. Prefer DB writes for recurring data; \`app_update\` only when the layout shape changes.

### When to use what

- **Inline UI** (fenced \`openui-lang\` in your reply) — quick visualizations, previews, one-off charts.
- **App** (\`app_create\`) — dashboards, tools, forms the user will return to. Persistent, in the dock.
- **Automation** (\`create_automation\`) — recurring scheduled work feeding apps or the database.
- **Plain text** — questions, explanations, conversation.
`;

writeFileSync(
  join(generatedDir, "app-prompt.md"),
  creatorPrompt + CREATOR_WORKFLOW,
  "utf8",
);
console.log(`✓ server/generated/app-prompt.md (${creatorPrompt.length} chars + workflow)`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. openui-schema.json — drives the runtime lint loop.
// ─────────────────────────────────────────────────────────────────────────────

const librarySchema = openuiLibrary.toJSONSchema();
const componentNames = Object.keys(librarySchema.$defs ?? {});

writeFileSync(
  join(generatedDir, "openui-schema.json"),
  JSON.stringify({ schema: librarySchema, componentNames }, null, 2),
  "utf8",
);
console.log(`✓ server/generated/openui-schema.json (${componentNames.length} components)`);
