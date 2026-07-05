# Arco OS — Open Standards Map

> Status: DRAFT v0.1 (Jul 2026). Maps every subsystem to a standards posture and defines where Arco publishes its own open standard — including the fork/replace analysis for OpenUI and the generative components. Companion: `UI Experiments/APP-INDEX-AND-LIBRARY-PLAN.md` (the design-system half of the standard) and `UI Experiments/DESIGN-SYSTEM-SPEC.md`.

## 1. The three postures

Every subsystem is sorted by one question: do we ride an existing open standard, bridge to one at the boundary, or is this where Arco defines its own?

- **Adopt** — use the existing open standard as-is. Ecosystem leverage outweighs control; forking would cut Arco off from the tooling that makes the standard valuable.
- **Bridge** — keep the custom internal format, but map to the open standard at the boundary (import/export, documentation, token files) when interop is needed.
- **Define** — Arco's differentiation, with no adequate existing spec. These subsystems become modules of the new open standard Arco publishes.

## 2. Subsystem-by-subsystem map

| Subsystem | Standard / format today | Posture | Notes | Evidence |
|---|---|---|---|---|
| Generative UI language | openui-lang via `@openuidev/lang-core` + `@openuidev/react-lang` | **Define** | Fork/replace candidate. Grammar, component vocabulary, and binding contract become the core of the new standard. | `src/apps/appview/AppSurface.tsx`, `src/apps/chat/AssistantBlock.tsx` |
| Component vocabulary + schema | JSON Schema 2020-12 generated from `@openuidev/react-ui` | **Define** | JSON Schema stays as the meta-format; the published component profile (chat vs reactive app) is ours to define. | `server/generated/openui-schema.json`, `scripts/generate-prompts.ts` |
| Live data binding (Query/Mutation) | toolProvider contract in `@openuidev/react-lang` runtime | **Define** | No existing spec covers UI-to-tool binding without an LLM round-trip. AG-UI is the closest neighbor; ours is more OS-like. | `src/apps/appview/AppSurface.tsx`, `server/agent/tools.ts` |
| Patch semantics | `mergeStatements()` from `@openuidev/lang-core` | **Define** | Statement-level merge is what makes agent-driven app evolution work; must be normative in a fork. | `server/agent/tools.ts` (`app_update`) |
| os.* capability contracts | Custom versioned intents (`os.calendar@1`, `os.voice@1`) + JSON Schemas | **Define** | Deliberately brand-free already. The natural spine of an open OS-capability standard. | `shared/capabilities/`, `server/capabilities/registry.ts` |
| App manifest | Custom Zod-validated manifest (reverse-DNS id, tiers, permissions, tools) | **Define** | No cross-vendor standard exists for agent-native app manifests. Ours is the packaging format of the standard. | `shared/manifest.ts`, `server/platform/manifestSchema.ts` |
| App bridge | Custom postMessage envelope + `x-app-token` HTTP methods | **Define** | The host/guest API surface for sandboxed apps — pairs with the manifest as one spec module. | `server/platform/bridge.ts`, `packages/app-sdk/` |
| Agent event stream | Custom AgentEvent union over SSE | **Define** | Define, but track AG-UI: if it matures, this could downgrade to a bridge (map AgentEvents to AG-UI events). | `shared/types.ts`, `server/index.ts` |
| Agent cursor protocol | Custom UiSnapshot / CursorCommand with `data-arco-cid` ids | **Define** | Align element roles with ARIA / the accessibility tree rather than inventing new role vocabulary. | `shared/types.ts` (`cursor_request` flow) |
| Agent tool interop | MCP — client (stdio/HTTP/SSE) and outward server | **Adopt** | Ecosystem leverage is the whole point. Expose os.* intents as MCP tools; never fork MCP. | `server/mcp/client.ts`, `server/mcp/outward.ts` |
| External coding agents | ACP (Zed Agent Client Protocol) over JSON-RPC stdio | **Adopt** | Claude Code / Codex / Gemini plug in as subprocess agents. Adapter maps updates into AgentEvents. | `server/acp/acpAgent.ts` |
| LLM inference | OpenAI chat-completions (de facto) + loopback compat endpoint | **Adopt** | Keeps every provider and local llama-server interchangeable. Message storage shape follows the same format. | `server/agent/llm.ts`, `server/agent/openaiCompat.ts` |
| Tool / intent parameter schemas | JSON Schema (inline, per tool and intent) | **Adopt** | Shared meta-format across system tools, MCP tools, and capability intents. Non-negotiable substrate. | `server/agent/tools.ts`, `shared/capabilities/calendar.ts` |
| Voice transport | WebRTC via Pipecat | **Adopt** | W3C/IETF standard transport; Pipecat is a swappable implementation detail. | `src/voice/VoiceClient.ts`, `voice-server/bot.py` |
| Chat prose | Markdown + GFM | **Adopt** | openui-lang fences embed inside standard Markdown, so prose stays portable. | `src/apps/chat/AssistantBlock.tsx` |
| Automations | Cron (5-field) + ISO 8601 timestamps | **Adopt** | Boring on purpose. | `server/automations/scheduler.ts` |
| Storage | SQLite (namespaced per app) | **Adopt** | The db_query/db_execute surface exposed to generated apps is part of the binding contract, not the storage layer. | `server/stores/db.ts` |
| External channels | Telegram Bot API (HTTP JSON) | **Adopt** | Per-channel vendor APIs behind a gateway. Matrix would be the open-standard channel if one is wanted later. | `server/channels/telegram.ts` |
| Design tokens | Custom `--arco-*` CSS vars, forwarded to apps as `--os-*` | **Bridge** | Keep CSS-var delivery; add a DTCG (`$type`/`$value`) token file as canonical source so themes are portable. | `src/styles/tokens.css`, `src/apps/appview/AppHost.tsx` |
| Calendar data | Custom `os.calendar@1` JSON + ISO 8601 | **Bridge** | The intent contract is ours (define); the data should gain iCal (RFC 5545) import/export at the boundary. | `shared/capabilities/calendar.ts` |
| Auth | scrypt + HttpOnly session cookie; bearer tokens for external MCP | **Bridge** | Fine for a local OS. Move to OAuth 2.1/OIDC when third-party clients or the outward MCP server go multi-user. | `server/auth/`, `server/mcp/outward.ts` |
| Public REST API | REST + JSON, undocumented | **Bridge** | No redesign needed — describe the existing routes with an OpenAPI document when external consumers appear. | `server/index.ts` |
| Skills | SKILL.md + YAML frontmatter | **Bridge** | Already de-facto compatible with the Claude/Cursor skills format. Track that ecosystem rather than diverging. | `server/skills/skillStore.ts` |

Tally: 9 define, 9 adopt, 5 bridge.

## 3. If we fork or replace OpenUI: what becomes the spec

Today the generative stack is four `@openuidev/*` packages. A fork is not "rewrite the renderer" — it is deciding which layers become **normative spec** (anyone can implement them) and which stay **reference implementation** (Arco's code, replaceable). The value of the standard lives almost entirely in the top four layers.

| Layer | Today (OpenUI) | In an Arco standard | Role |
|---|---|---|---|
| Language grammar | `@openuidev/lang-core` parser (statement assignments, refs, @actions) | Normative grammar spec — the heart of the standard | **Spec** |
| Component vocabulary | `openuiLibrary` / `openuiChatLibrary` from `@openuidev/react-ui` | Published JSON Schema profiles: "chat" (static) and "app" (reactive) conformance levels | **Spec** |
| Host binding contract | Query/Mutation/$state resolved via toolProvider (`exec`, `read`, `db_query`, `db_execute`) | Normative host interface — how a runtime binds UI to tools without an LLM | **Spec** |
| Patch semantics | `mergeStatements()` statement-level merge in `app_update` | Normative — agents must be able to patch apps deterministically | **Spec** |
| Renderer | `@openuidev/react-lang` Renderer + React components | Reference implementation only — React today, other hosts later | Reference impl |
| Lint / validation | `server/lint/lint-openui.ts` against generated schema | Conformance test suite + reference linter | Reference impl |

**Why the binding contract is the crown jewel.** Grammar and component vocabularies exist elsewhere (MDX, Adaptive Cards, AG-UI generative payloads, A2UI). What no existing spec covers is Arco's live-data model: a generated app whose Query and Mutation nodes call host tools directly — with **no LLM round-trip** — plus deterministic statement-level patching so agents can evolve apps in place. If only one layer gets standardized, it should be this one.

**Keep from OpenUI upstream:**
- JSON Schema 2020-12 as the component-vocabulary meta-format — the generate → lint → render pipeline already keys off it.
- The two-tier surface split (static chat UI vs reactive app), which maps cleanly to two conformance profiles.
- The single-source principle: prompts, validator, and renderer all generated from one library so they never drift.

**Change in a fork:**
- Decouple the vocabulary from React: today the schema is derived from `@openuidev/react-ui` components, so the spec is implicitly React-shaped. (The Longformer block registry is the planned replacement vocabulary — see the companion doc.)
- Make the toolProvider host interface explicit and versioned (it is currently an informal TypeScript object in `AppSurface.tsx`).
- Fold Arco's adaptive-layout contract (`data-arco-size` classes) into the spec instead of CSS overrides on inline styles.

**Fork trigger:** fork when upstream's roadmap blocks the binding contract or the React decoupling; stay on upstream while it only affects component styling. A fork inherits the full maintenance cost of parser, schema generation, and renderer.

## 4. Shape of the Arco open standard

The nine "define" rows are not nine standards — they group into one spec family with four modules. Everything in it is already brand-free by design (os.* naming), which was the stated intent in the platform docs.

| Module | Contents |
|---|---|
| **1 — UI language + binding** | Grammar, component profiles, Query/Mutation host contract, patch semantics. The OpenUI fork/replacement lives here. |
| **2 — Capabilities (os.*)** | Versioned intent contracts with JSON Schemas (`os.calendar@1`, `os.voice@1`, planned `os.files@1`). Exposed outward as MCP tools — the bridge between our standard and the adopted one. |
| **3 — App packaging + bridge** | Manifest (ids, tiers, permissions, contributed tools/events) and the postMessage/HTTP host bridge with per-window tokens. |
| **4 — Agent surface** | AgentEvent stream and cursor protocol. Weakest claim to permanence: re-evaluate against AG-UI before publishing, and borrow ARIA roles for the cursor snapshot. |

**Publishing checklist per module.** A module only counts as an open standard once it ships four artifacts: a written spec, versioned JSON Schemas, a reference implementation (Arco itself), and a conformance test suite (the lint pipeline is the seed for Module 1). Until then it is just internal architecture.

## 5. How to apply this going forward

When a new subsystem appears, run it through the same three questions:

1. Does a spec with real ecosystem adoption cover it? If yes, **adopt** — as with MCP and ACP.
2. Is the internal format fine but interop expected later? **Bridge** — keep the format, add the standard at the edge, as planned for design tokens and calendar data.
3. Is it core differentiation with no adequate spec? **Define** — add it as a module of the Arco standard and ship the four publishing artifacts.

Standing watch item: AG-UI could eventually absorb Module 4 (agent surface), which would move those rows from define to bridge.

## 6. Relationship to Longformer (UI Experiments)

Arco supplies the runtime/protocol half of Module 1 (grammar, Query/Mutation binding, patch semantics, capability grants); the Longformer kit in `UI Experiments` supplies the design-system half (tokens, primitives, block registry, adaptivity, containers). The join point is the block registry: one `defineBlock` manifest emits the openui-lang library definition Arco's prompts consume, the payload schemas, and the render mapping into Longformer components. See `UI Experiments/APP-INDEX-AND-LIBRARY-PLAN.md` and `UI Experiments/DESIGN-SYSTEM-SPEC.md` (§9, D3, D5).
