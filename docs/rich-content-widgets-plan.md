# Rich Content Widgets Plan (AI-generated widgets in markdown & documents)

> Product/architecture roadmap for making rendered content — chat markdown,
> file previews, and the upcoming Notes/Docs writing apps — a surface the
> agent can enrich with design-aware, interactive widgets.
> Written 2026-07-05. Companion to `office-suite-plan.md` (Notes/Docs/editor-kit
> execution plan) and `app-platform-plan.md` (tiers, contracts, bridge).

## TLDR

Arco already has one rich-content escape hatch: ` ```openui-lang ` fences in
chat, parsed by `parseSegments.ts` and rendered by the OpenUI `Renderer`.
This plan generalizes that into a **content model**: markdown (and later
TipTap JSON) as the substrate, with **widget islands** the AI can emit,
validated against a **widget manifest** the model is explicitly prompted
with. The load-bearing decision: **widgets are schema'd data, not markup
extensions** — one widget registry with typed payloads, rendered by three
hosts (react-markdown pipeline, OpenUI renderer, ProseMirror node views in
`editor-kit`). That is what lets the same "expense chart" widget appear in a
chat reply, a `.md` file preview, and a Notes page, and round-trip between
them.

Sequence: **unify the markdown pipeline → widget manifest + validation →
editor-kit widget nodes (with the Notes/Docs builds) → live data-bound
widgets via contracts → bidirectional widgets → the authoring loop
(select-to-enrich).**

## Current state (verified 2026-07-05)

- **Chat markdown** (`src/apps/chat/AssistantBlock.tsx`): plain
  `react-markdown` + `remark-gfm`, **no custom `components` mapping** —
  tables/code/links are default elements styled by `.arco-chat__markdown`
  in `src/styles/apps.css`.
- **Widget mechanism**: `src/apps/chat/parseSegments.ts` splits assistant
  text into markdown vs ` ```openui-lang ` fences; fences render through
  `@openuidev/react-lang` `Renderer` with `openuiChatLibrary` (cards,
  charts, forms, tabs, follow-ups). This works while streaming.
- **Consumers**: ChatApp and StudioApp only. File previews and any future
  document surface do **not** run through this pipeline.
- **Prompting**: the OpenUI DSL is documented for the model in
  `server/generated/chat-prompt.md` / `app-prompt.md` — hand-maintained
  prose, no machine-readable schema, no render-time validation.
- **Design system**: `--arco-*` tokens (`src/styles/tokens.css`), forwarded
  to Tier-3 app iframes as brand-free `--os-*` (per `app-platform-plan.md`).
- **Coming from the suite plan**: Notes clone + Docs share a TipTap editor
  in `packages/editor-kit/` storing **TipTap JSON** (not raw markdown) as
  `application/x-os-doc+json` in the `os.files@1` store. This is the key
  constraint: the writing apps' native format is a node tree, so widgets
  must exist as **nodes with typed attrs**, not as markdown-only syntax.

## The core reframe

Arco currently has two content tiers: inert prose (markdown) and full
generated apps (OpenUI durable apps / Tier-3 code apps). The opportunity is
the middle tier — **documents as a rendering surface the AI progressively
enriches**. Text stays the substrate (portable, diffable, streamable,
degradable); widgets are islands inside it. Chat already proves the
pattern; this plan makes it a first-class content model shared with the
writing apps instead of a chat-only trick.

### One widget model, three hosts

A **widget instance** is `{ type, version, props }` — a typed payload
validated against the registry, never free-form markup. It has three
serializations/hosts:

| Host | Serialization | Renderer |
| --- | --- | --- |
| Markdown surfaces (chat, `.md` previews, agent output) | Fenced block (` ```openui-lang ` today; a `widget` fence with JSON payload as the general form) + a lightweight inline directive for small widgets | Shared `RichMarkdown` component (extracted from `AssistantBlock`) |
| Notes / Docs (TipTap) | A ProseMirror node type (`arcoWidget`) with the payload in node attrs, stored inside the doc JSON | Node view in `packages/editor-kit/` backed by the same registry |
| Durable apps | Existing OpenUI trees | Existing `Renderer` (unchanged) |

Because the payload is host-independent, content converts losslessly:
markdown fence ⇄ TipTap node. That's what makes "agent drafts a report in
chat → save to Notes" and "export a Notes page as `.md`" both keep their
widgets. Every widget type must define a **plain-text/markdown fallback**
(e.g. a chart degrades to its data table) so files remain valid markdown
outside Arco and unknown/old widgets render as labeled data instead of
breaking a document.

## Phase 1 — Unify the markdown pipeline (shell-side, independent)

*Goal: every markdown surface can host widgets and is design-system-native.*

- Extract `parseSegments` + rendering from `AssistantBlock.tsx` into a
  shared `RichMarkdown` component (`src/components/richmarkdown/` or a
  package if editor-kit will consume pieces).
- Give `react-markdown` a `components` mapping wired to `--arco-*` tokens:
  tables, task lists, callouts/blockquotes, links, code blocks. Even plain
  prose stops looking like browser defaults.
- Adopt the general embed grammar: keep ` ```openui-lang ` working, add the
  JSON-payload `widget` fence, and pick an inline-directive syntax
  (remark-directive style, e.g. `:metric[42%]{trend=up}`) for widgets that
  live inside a sentence or list item.
- Wire the file manager's `.md` preview (and any doc-ish surface) through
  `RichMarkdown`.
- **Exit criterion:** the same markdown string with a widget fence renders
  identically in chat and in a file preview; a malformed fence degrades to
  a labeled code block, never a crash.

## Phase 2 — Widget manifest: make generation component-aware

*Goal: the model knows exactly what widgets exist, when to use them, and its
output is validated.*

- `shared/widgets/` — a registry: per-widget JSON schema for props, a
  usage description ("when to use"), selection heuristics ("numeric series
  over time → line chart, not a markdown table"), and 1–2 exemplars.
- Generate the prompt section from the registry (replacing hand-maintained
  DSL prose drift in `server/generated/*.md`) and validate AI output
  against the schemas at render time.
- Version the registry (`type@1`) — documents persist and schemas will
  evolve; old payloads must keep rendering (or fall back) forever.
- **Product effect:** the agent stops answering with a markdown table when
  a sortable table or chart exists, because the manifest tells it so —
  selection logic lives in the registry, not scattered through the system
  prompt.
- **Exit criterion:** removing a widget from the registry removes it from
  the prompt and turns existing instances into their fallbacks; adding one
  requires no prompt editing.

## Phase 3 — Widgets in the writing apps (lands with Notes/Docs)

*Goal: widgets are first-class blocks in Notes and Docs, not a chat-only
feature. This phase is coordinated with office-suite Stage 2.*

- `packages/editor-kit/` gains an `arcoWidget` ProseMirror node type:
  payload in attrs, rendered by a node view that consumes the shared
  registry. Editing UX: select node → configure props (or "ask the agent
  to change it"); no free-form editing of widget internals.
- Serialization: `editor-kit` exports markdown ⇄ TipTap conversion where
  widget fences map to `arcoWidget` nodes and back. This is the bridge that
  makes chat content and Notes pages the same medium.
- **Renderer placement decision (open, but leaning):** Notes/Docs are
  Tier-3 iframe apps, and the OpenUI renderer currently lives in the shell.
  Ship the widget renderer *inside* `editor-kit` (bundled into the app),
  with schemas shared via `shared/widgets/`. Keeps the platform boundary
  clean (no shell-DOM reach-in), at the cost of bundle duplication —
  acceptable for a prototype; revisit with a shared chunk if it hurts.
- Agent authoring path: the agent writes docs as typed JSON via
  `files.content.write` (per the suite plan) — widget nodes are just nodes
  in that schema, so "insert a budget chart into my Q3 notes page" is a
  file write, no new machinery.
- **Exit criterion:** the agent creates a Notes page containing prose +
  a chart widget via intents; the page renders in the Notes app; exporting
  to `.md` and previewing it shows the same widget.

## Phase 4 — Live documents (data-bound widgets)

*Goal: a widget in a document can declare a data source and stay current —
a Notes page titled "Weekly metrics" is a living dashboard, not a snapshot.*

- Widget payloads gain an optional `source`: a contract intent
  (`os.files@1` read, a `sheets.query` range once `os.sheets@1` exists, a
  DB query, a tool call) plus a refresh policy (on-open / interval /
  manual).
- Data flows through the **existing bridge** with the host app's identity
  and grants — a widget inside Notes reading a sheet range is just Notes
  calling `sheets.query`, covered by the one-choke-point permission model.
  No new security surface.
- Clear visual affordance for live vs. frozen content; freeze-to-snapshot
  action bakes current data into the payload.
- Care points: caching and refresh discipline (documents must not hammer
  tools on every render); offline/stale rendering from the last snapshot.
- **Exit criterion:** a Notes page shows a chart bound to a sheet range;
  editing the sheet and reopening the note shows new data; the read appears
  in the audit log under the Notes app's identity.

## Phase 5 — Bidirectional widgets (documents you can act in)

*Goal: widgets that write back — the ConfirmCard/follow-up pattern moved
into persistent documents.*

- Checkboxes/task lists that persist, an inline form inserting a DB row, a
  kanban block backed by a table, an approve/reject card that triggers an
  automation.
- Writes are **action intents through the bridge**, subject to the same
  `auto | confirm | deny` policies as everything else (platform plan
  Phase 3).
- State storage default: **write back into the document source** (markdown
  or doc JSON — portable, diffable) whenever the state is small and
  human-readable; sidecar storage keyed by widget id only for state that
  doesn't belong in the document.
- **Exit criterion:** ticking a task in a rendered `.md` preview updates
  the file; a form widget in a Notes page inserts a row via intent with a
  confirmation prompt.

## Phase 6 — The authoring loop (select-to-enrich)

*Goal: enrichment becomes a user gesture, not just an AI initiative — this
is where it stops being a rendering feature and becomes a creation medium.*

- Select a paragraph/table in Notes, Docs, or a chat reply → "turn this
  into a timeline / chart / comparison" → the agent rewrites that span into
  a widget in place (a scoped edit via `files.content.write` or a chat
  patch).
- The inverse: "flatten to plain markdown" per widget or per document, for
  export.
- Later: proactive suggestions ("this list of dates could be a timeline")
  surfaced like lint hints, powered by the same selection heuristics
  already in the widget manifest.
- **Exit criterion:** select a markdown table in Notes → one action turns
  it into a sortable chart widget → undo restores the table.

## Coordination with the office suite / notes clone

1. **editor-kit owns the widget node.** The `arcoWidget` node type,
   node-view renderer, and markdown⇄JSON conversion live in
   `packages/editor-kit/` so Notes and Docs get widgets for free. Design it
   in from the start — retrofitting node types into a shipped document
   format is much more painful than including one whose renderer starts as
   a stub.
2. **Schemas live in `shared/widgets/`,** not in editor-kit and not in the
   shell — the same registry feeds the chat prompt, render-time validation,
   and the doc JSON schema published in `shared/capabilities/` so the agent
   can author widget-bearing documents directly.
3. **Document format note for the suite plan:** `application/x-os-doc+json`
   should reserve the widget node shape (`{ type: "arcoWidget", attrs:
   { widgetType, version, props, source? } }`) in v1 of the schema even if
   no widgets render yet.
4. **Drive/preview:** once `os.files@1` lands, the `.md` preview surface is
   `RichMarkdown` — same pipeline as chat (Phase 1 makes this free).
5. **Tier discipline:** widgets are Tier-1-style declarative data — nothing
   executes; interactivity is intents through the bridge. Don't grow an
   expression language inside widget props; if a widget needs logic, that's
   the (deferred) WASM-functions rung of the platform plan.

## Sequencing summary

| Phase | Work | Depends on | Done when |
| --- | --- | --- | --- |
| 1 | Shared `RichMarkdown`, token-native element mapping, general fence + inline grammar, `.md` previews | Nothing | Same widget renders in chat + file preview; malformed → fallback |
| 2 | `shared/widgets/` registry, prompt generation, render-time validation, versioning | Phase 1 | Registry drives prompt + validation with no hand-edited prose |
| 3 | `arcoWidget` node in editor-kit, markdown⇄JSON conversion, agent doc authoring | Suite Stage 2 (editor-kit), `os.files@1` | Agent-authored Notes page with a widget; export round-trips |
| 4 | Data-bound widgets (`source` + refresh) via bridge | Phase 3, contracts in place | Live chart in a note, audited under app identity |
| 5 | Write-back widgets (intents, doc-source state) | Phase 4 | Task tick persists; form insert prompts + audits |
| 6 | Select-to-enrich + flatten + suggestions | Phases 3–5 | Table → chart in one gesture, undoable |

## Risks / open questions

- **Streaming partial fences:** chat already renders fences progressively;
  the new grammar (JSON-payload fences, inline directives) needs a sane
  partial-parse story or widgets flicker/break mid-stream. Decide the
  buffering rule in Phase 1.
- **Renderer duplication across the iframe boundary:** bundling the widget
  renderer into editor-kit duplicates chart/UI code between shell and app
  bundles. Accept for the prototype; note it as a shared-chunk candidate.
- **Two DSLs risk:** `openui-lang` (expression-ish DSL) vs. plain JSON
  widget payloads. Converge deliberately — the widget registry should
  become the constrained, document-safe subset; don't let documents grow
  full OpenUI expressiveness (state, queries) beyond the `source` field.
- **Schema versioning is forever:** once widgets live in persisted
  documents, every widget version must render or fall back indefinitely.
  Registry versioning discipline from day one (Phase 2), not later.
- **Refresh economics:** live widgets multiply background reads; cache
  aggressively and default to on-open refresh, not intervals.
- **Markdown portability:** the fallback rule (every widget defines a
  plain-markdown degradation) must be enforced by the registry — a widget
  type without a fallback shouldn't pass review.
