# Memory — System Design & v1 Roadmap

> Written 2026-07-06. Companion to `agent-extensibility-plan.md` (agent
> capabilities), `app-platform-plan.md` (contracts + grants), and
> `open-standards-map.md` (standards posture). This doc covers how Arco
> remembers across sessions — typed stores, vector/RAG backends, knowledge
> graphs, and **which agents may read or write which memory**.
>
> **Status: PROPOSED v1.** Nothing here is shipped yet. Arco today has chat
> session transcripts, workspace files, and skills — not agent memory.

## Why

Hermes treats memory as a first-class subsystem: durable notes, automatic
recall prefill, session-end extraction, and a management UI. Longformer's
Psyche workspace mocks the operator surface (memory entries, vector
collections, RAG traces, knowledge graph, identity docs). Arco has neither.

Without memory, every new chat starts cold except for raw transcript replay.
Automations are intentionally memoryless. ACP subprocess agents bring their
own opaque memory. The product thesis ("agents share focus context across
every workspace") cannot land until memory is a **system service with a
permission model**, not ad-hoc files the agent happens to read.

## Design principles

1. **Contracts over backends.** Arco defines `os.memory@1` — typed memory
   kinds, recall/extract intents, collection schemas, and agent ACLs. Vector
   indexes, graph stores, and extractors are **swappable providers** behind
   that contract (same posture as `os.calendar@1` + calendar provider).
2. **One choke point.** Every memory read/write/search flows through
   `memoryStore` with a caller identity attached (`agent:<id>`,
   `app:<id>`, `user`, `system`). Audit, redaction, and rate limits live
   there — not in agent prompts.
3. **Kinds are explicit.** "Memory" is not one blob. Episodic, semantic,
   working, procedural, identity, and reference corpora are separate kinds
   with different retention, indexing, and default ACLs. Callers request a
   kind (or collection within a kind); the store resolves the provider.
4. **Agents are principals.** Built-in Arco, ACP subprocess agents, channel
   bots, and automations each have a stable **agent profile id**. Memory
   grants are keyed `(agentProfileId, memoryScope)` — parallel to app grants
   and agent tool policy, not merged with user auth capabilities.
5. **Recall is budgeted.** Prefill injected before a turn is capped (tokens
   + item count). Extraction after a turn is async and idempotent. The model
   never sees memory it wasn't granted.
6. **Swappable without migration pain.** Provider records carry a `schemaVersion`
   and `backendKind`. Replacing sqlite-vec with Qdrant is a registry repoint +
   reindex job — not a rewrite of the agent loop or UI.
7. **Start local, bridge outward.** v1 defaults to embedded SQLite +
   sqlite-vec (already our storage posture). External vector DBs and Odysseus
   attach as optional providers over HTTP/MCP — never required for a working
   install.

---

## 1. Evaluation — what to build for v1

### 1.1 Reference patterns (what we're synthesizing)

| Source | Keep | Skip for v1 |
| --- | --- | --- |
| **Hermes** | Session-end commit, recall prefill, SOUL/USER/MEMORY sections, redaction on export, memory API | Monolithic file layout tied to `HERMES_HOME`; gateway-specific lifecycle hooks |
| **Longformer Psyche** | Operator UI: memory browser, collection health, RAG trace viewer, graph explorer, identity doc editor | Mock-only data; no backend in the demo |
| **NanoClaw / OpenClaw** | File scaffold for imported agent memory; group-scoped memory dirs | Container-per-group isolation (Arco uses ACL tables instead) |
| **Arco today** | `sessionStore`, `grantStore`, `policyStore`, `skillStore`, audit JSONL, Settings sections pattern | Transcript-as-only-context; skills mistaken for episodic memory |

### 1.2 Backend options (vector + graph + RAG)

| Option | Pros | Cons | v1 verdict |
| --- | --- | --- | --- |
| **SQLite + sqlite-vec** (embedded) | Zero ops; matches `server/stores/db.ts`; backup = copy `data/`; good through ~1M vectors on desktop | No distributed search; reindex blocks writer briefly | **Default provider** |
| **LanceDB** (embedded file) | Faster bulk ANN; columnar metadata filters | New dependency; second storage engine to backup | **Phase 2 candidate** — implement `VectorBackend` interface first, swap later |
| **Qdrant / Chroma** (local HTTP) | Production ANN; multi-process | Requires sidecar; ops burden for a desktop OS | **Optional provider** — register in Settings → Memory → Backends |
| **Odysseus** (AGPL sidecar) | Rich PIM + RAG already planned in Kosmos story | License boundary; not in tree | **Bridge provider** — HTTP/MCP only, post-v1 |
| **MCP memory servers** (e.g. future ecosystem) | Interop with external agents | Immature; schema drift | **Adopt at boundary** via MCP adapter, not core store |

**Graph / DAG layer:** v1 stores edges in SQLite (`memory_edges` table) with
typed relations (`supports`, `contradicts`, `derived_from`, `mentions`).
No separate graph DB until edge count or traversal patterns force it. Graph
**visualization** is UI over the same tables; GraphRAG retrieval is a
**query profile** on top of vector + edge expansion (1–2 hop), not a separate
product.

**RAG pipeline:** v1 is **ingest → chunk → embed → store in collection →
retrieve on recall**. No agent-in-the-loop reranking initially; optional
cross-encoder reranker as Phase 3 provider hook.

### 1.3 Recommended v1 stack (the "best system we can swap out")

```
┌─────────────────────────────────────────────────────────────────┐
│  Memory app (UI) + Settings → Memory section                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST
┌────────────────────────────▼────────────────────────────────────┐
│  memoryStore (choke point)                                      │
│    • ACL check (memoryGrantStore)                               │
│    • audit append                                               │
│    • redaction on export                                        │
└─────┬──────────────┬──────────────┬─────────────────────────────┘
      │              │              │
      ▼              ▼              ▼
 DocumentStore   VectorBackend   GraphIndex
 (SQLite)        (provider)      (SQLite edges)
      │              │              │
      └──────────────┴──────────────┘
                     │
              RecallPipeline / ExtractPipeline
                     │
              agent loop (prefill + tools)
```

**Swap surface:** only `VectorBackend`, `Embedder`, and `Extractor` are
pluggable interfaces. Document storage and ACLs stay in Arco core.

---

## 2. Memory taxonomy

Kinds align with Longformer Psyche nomenclature so the UI ports cleanly.

| Kind | Purpose | Typical content | Default retention | Indexed? |
| --- | --- | --- | --- | --- |
| **working** | Scratch context for the active task | "User is refactoring auth.ts" | Session TTL or 7d | No (key-value) |
| **episodic** | What happened — time-stamped events | Session summaries, decisions, outcomes | 365d (configurable) | Yes (embed summary) |
| **semantic** | Stable facts about the world/user | "Prefers dark mode", "Company uses Linear" | Indefinite | Yes |
| **procedural** | How to do things here | Workflows, repo conventions, tool recipes | Indefinite | Yes (title + tags) |
| **identity** | Agent/user persona docs | SOUL.md, ETHICS.md, USER.md | Indefinite | Optional (section embed) |
| **reference** | RAG corpora (files, notes, URLs) | Ingested docs, chunks, citations | Per-collection policy | Yes (chunk vectors) |

**Collections** subdivide a kind (especially `reference`): e.g.
`reference:notes`, `reference:project-arco`, `semantic:personal`. Each
collection declares embedding model, chunk policy, and ACL defaults.

**Status lifecycle:** `pending` → `active` → `archived` | `conflicted`.
Conflicts arise when extraction proposes a fact that contradicts an active
semantic entry — surfaced in UI for merge/dismiss (v1: flag only; auto-merge
is Phase 3).

---

## 3. Agent profiles & permissions

### 3.1 Principals

Every caller that reads or writes memory resolves to a **principal**:

| Principal | Id pattern | Notes |
| --- | --- | --- |
| Built-in agent | `agent:builtin` | Default chat + Studio |
| ACP agent | `agent:acp:<presetOrHash>` | Derived from `settings.acpCommand` |
| Automation | `agent:automation:<id>` | Narrow grants; no episodic write by default |
| Channel session | `agent:channel:<channelId>` | DM bots; read-mostly |
| Installed app | `app:<manifestId>` | Via bridge `memory.*` intents |
| User (UI) | `user:<userId>` | Full admin in Settings / Memory app |
| System | `system` | Extraction jobs, reindex, retention sweep |

### 3.2 Grant model (`memoryGrantStore`)

Parallel to `grantStore` — keys are **not** shared with app intents.

```ts
type MemoryAccess = "none" | "read" | "write" | "admin";

// Scope: kind, collection, or wildcard
type MemoryScope =
  | { level: "kind"; kind: MemoryKind }
  | { level: "collection"; collectionId: string }
  | { level: "all" };

// Stored: data/memory-grants.json
// Key: `${principalId}#${scopeKey}` → MemoryAccess
```

**Default matrix (v1):**

| Principal | working | episodic | semantic | procedural | identity | reference |
| --- | --- | --- | --- | --- | --- | --- |
| `agent:builtin` | R/W | R/W | R/W | R | R | R |
| `agent:acp:*` | R | R | R | R | R | R* |
| `agent:automation:*` | — | — | R | R | R | R* |
| `agent:channel:*` | R | R | R | — | — | — |
| `app:*` | — | — | — | — | — | R* |

\* Reference access requires explicit collection grant or `reference:*` admin
approval in Settings.

**Write vs extract:** `write` allows tool/API mutations. **Extraction**
(commit after session) uses `system` + delegated rules: only principals with
`write` on `episodic` or `semantic` get auto-extract; otherwise extract
produces `pending` entries for user review.

### 3.3 Tool policy integration

Memory tools register through `toolRegistry` with `source: { kind: "system" }`
and respect `policyStore` like any other tool (`memory_search` default
`auto`, `memory_write` default `confirm`, `memory_delete` default `confirm`).

---

## 4. Core interfaces (swappable providers)

### 4.1 `VectorBackend`

```ts
interface VectorBackend {
  readonly id: string;           // e.g. "local-sqlite-vec", "qdrant-local"
  readonly capabilities: ("upsert" | "delete" | "search" | "reindex")[];

  upsert(collectionId: string, vectors: VectorRecord[]): Promise<void>;
  delete(collectionId: string, ids: string[]): Promise<void>;
  search(query: VectorQuery): Promise<ScoredVector[]>;
  collectionStats(collectionId: string): Promise<CollectionStats>;
  reindex?(collectionId: string, opts: ReindexOptions): AsyncIterable<ReindexProgress>;
}
```

Registered in `memoryProviderRegistry` (mirror of `capabilities/registry.ts`).
Settings → Memory → Backends: enable one backend per collection family
(default: all collections → `local-sqlite-vec`).

### 4.2 `Embedder`

```ts
interface Embedder {
  readonly id: string;           // e.g. "local-nomic", "openai-text-3-small"
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
```

Tied to model-hub registry when Phase 4 lands; v1 ships one local preset +
optional OpenAI-compatible remote.

### 4.3 `Extractor`

```ts
interface Extractor {
  readonly id: string;           // e.g. "builtin-llm", "noop"
  extract(input: ExtractInput): Promise<ExtractProposal[]>;
}

interface ExtractProposal {
  kind: MemoryKind;
  title: string;
  summary: string;
  confidence: number;
  sourceSessionId: string;
  edges?: { toEntryId: string; relation: EdgeRelation }[];
}
```

v1 default: `builtin-llm` runs a **small structured prompt** on session
idle/close (not every turn). `noop` disables extraction for privacy mode.

### 4.4 `GraphIndex`

v1: SQL tables + recursive CTE traversals. Interface exists so Neo4j or
Kuzu can plug in later without UI changes.

---

## 5. Recall & extract pipelines

### 5.1 Pre-turn recall (injection)

Hook: `runAgentTurn` / `runAcpTurn` **before** `streamTurn`, after loading
session messages.

```
recallForTurn({
  principal,
  sessionId,
  userMessage,
  focusContext?,      // active project, open file, focused app (Phase 2)
  budget: { maxTokens, maxItems },
}) → RecallBundle
```

**RecallBundle** becomes `extraSystem` appended to the system prompt (same
seam as voice speakability today):

- Identity snippets (SOUL/USER sections agent may read)
- Top-k semantic + episodic hits from vector search on `userMessage`
- Optional reference chunks (RAG) with citation ids
- Working memory key-values for this session

Hermes-style **recall scripts** (user-authored Python) are Phase 2 — the
hook point is `RecallProvider` plugins; v1 is built-in search only.

### 5.2 Post-turn extract (commit)

Hook: session idle timer (5 min) + explicit session close + user "Save to
memory" action.

```
extractFromSession(sessionId) → ExtractProposal[]
  → dedupe against existing semantic entries
  → write pending or active based on confidence + grants
  → append audit
```

ACP agents: Arco **does not** inspect subprocess memory. Options:
(a) recall/extract wrappers only around Arco-owned transcript, or
(b) Settings toggle "Allow ACP agent to use memory tools" exposing
`memory_search` / `memory_write` through the outward tool surface.

### 5.3 Automations

Unchanged posture: cron prompt is still the **only** context. v1 adds
**optional** `recallCollections: string[]` on automation config — when set,
the scheduler runs `recallForTurn` into the automation's one-shot system block
(read-only reference RAG for that job).

---

## 6. Data model (v1 SQLite)

Namespace: `data/memory/` (metadata JSON + `memory.db`).

**Tables (conceptual):**

| Table | Role |
| --- | --- |
| `memory_entries` | Canonical records (id, kind, collectionId, title, body, status, confidence, source, timestamps) |
| `memory_vectors` | vectorId, entryId, collectionId, embedderId, blob |
| `memory_edges` | fromId, toId, relation, weight |
| `memory_collections` | id, kind, name, embedderId, backendId, chunkPolicy, retention |
| `memory_chunks` | reference corpora chunks (for RAG citations) |
| `memory_grants` | materialized ACL cache (source of truth remains JSON for diff-friendly Settings) |
| `memory_audit` | optional mirror of audit.jsonl for memory-specific queries |

**Identity docs:** `identity:soul`, `identity:ethics`, `identity:user` stored
as entries with `format: markdown` — editable in Memory app document view
(Longformer `DocumentView` port).

---

## 7. Agent tools (system)

| Tool | Access | Description |
| --- | --- | --- |
| `memory_search` | read | Semantic search across granted collections/kinds |
| `memory_read` | read | Fetch entry by id (includes citations for reference chunks) |
| `memory_write` | write | Create/update entry (confirm by policy) |
| `memory_archive` | write | Soft-delete / archive |
| `memory_link` | write | Add graph edge between entries |
| `ingest_document` | write | Chunk + embed file/URL into reference collection |
| `memory_list_collections` | read | Discover allowed collections |

Tools hidden entirely when principal lacks read on the requested scope
(Joplin posture — model doesn't see what it can't use).

---

## 8. HTTP API (sketch)

Prefix: `/api/memory/`

| Method | Path | Role |
| --- | --- | --- |
| GET | `/entries?kind&collection&status&q` | List/filter (UI browser) |
| GET | `/entries/:id` | Detail + edges + chunks |
| POST | `/entries` | Create (user or agent) |
| PATCH | `/entries/:id` | Update |
| POST | `/entries/:id/archive` | Archive |
| GET | `/collections` | List collections + stats |
| POST | `/collections` | Create collection (admin) |
| PATCH | `/collections/:id` | Update embedder, retention, backend |
| POST | `/collections/:id/reindex` | Trigger reindex job |
| POST | `/collections/:id/ingest` | Ingest file path or URL |
| GET | `/graph?centerId&depth` | Subgraph for explorer |
| GET | `/rag/queries` | Recent retrieval traces (debug/operator) |
| GET | `/grants` | ACL matrix |
| PUT | `/grants` | Update principal scopes |
| GET | `/backends` | Registered vector backends + health |
| GET | `/identity/:doc` | soul \| ethics \| user markdown |

All routes enforce principal from session auth (user) or internal agent context.

---

## 9. UI — Memory workspace (Psyche port)

Register as system app **`Memory`** (`core.memory` or `system.memory`) when
implementing — stub with mock data first per UI migration skill.

| View | Source (Longformer) | v1 scope |
| --- | --- | --- |
| Dashboard | `DashboardView` | Metrics: entry counts, collection health, last extract |
| Memory browser | `MemoryView` | List/detail, kind filters, archive, conflict queue |
| Knowledge graph | `KnowledgeGraphView` | Read-only force graph over `memory_edges` |
| RAG | `RagView` | Query log + retrieved chunks (operator/debug) |
| Vector DB | `VectorDbView` | Collection list, dimensions, embedder, reindex button |
| Identity | `DocumentView` | SOUL / ETHICS / USER markdown editor |
| Settings | Psyche settings placeholder | Link to Settings → Memory for backends/ACLs |

**Settings → Memory** (admin): backends, embedders, default grants for new
agent profiles, extraction toggle, retention policies, redaction rules.

---

## 10. Integration points

| Existing piece | Memory integration |
| --- | --- |
| `runAgentTurn` (`loop.ts`) | `recallForTurn` pre-hook; optional extract post-hook |
| `buildSystemPrompt` | Identity index only (full docs via recall, not always-on) |
| `sessionStore` | Source for extraction; session id on episodic entries |
| `projectStore` | `focusContext.projectId` filters recall (Phase 2) |
| Notes / Files apps | Ingest intents from `os.files@1` when landed (Phase 2) |
| `skillStore` | Orthogonal — skills are procedures; may **link** to procedural memory entries |
| `grantStore` / `policyStore` | Parallel `memoryGrantStore`; shared audit.jsonl format |
| MCP outward server | Expose `memory_search` / `memory_read` as MCP tools (Phase 3) |
| Automations scheduler | Optional `recallCollections` on automation record |

---

## 11. Open standards posture

| Piece | Posture |
| --- | --- |
| SQLite + sqlite-vec | **Adopt** — embedded storage |
| Embedding API | **Adopt** — OpenAI-compatible `/v1/embeddings` |
| Memory wire format | **Define** — `os.memory@1` intent contract |
| External vector DBs | **Bridge** — optional HTTP providers |
| Odysseus / Mem0 / Zep | **Bridge** — provider adapter, not hard dependency |
| Graph exchange | **Bridge** — export/import JSON-LD later; internal SQL v1 |

Add row to `open-standards-map.md` when Phase 1 ships.

---

## 12. v1 roadmap (phased)

### Phase 0 — Spec & stubs (1 week)

- [ ] Land this doc; add `shared/capabilities/memory.ts` types only
- [ ] Memory app UI shell with mock data (Longformer Psyche port)
- [ ] Settings → Memory section stub (backends + grants placeholders)

**Exit:** Operator can browse mock memory; no server writes.

### Phase 1 — Kernel (2–3 weeks)

**Goal:** Swappable-free core — document store + ACLs + manual CRUD.

- [ ] `memoryStore` choke point + `memoryGrantStore`
- [ ] SQLite schema + `memory_entries` / `memory_collections`
- [ ] REST CRUD for entries and collections
- [ ] Agent tools: `memory_read`, `memory_write`, `memory_search` (keyword only)
- [ ] Settings grant matrix UI (principal × kind)
- [ ] Audit lines on every mutation

**Exit:** User and built-in agent can create/search memories with permissions enforced.

### Phase 2 — Vector + RAG (2–3 weeks)

**Goal:** Semantic recall and reference corpora.

- [ ] `VectorBackend` interface + `local-sqlite-vec` provider
- [ ] `Embedder` interface + one local model preset
- [ ] `memory_vectors` + collection stats
- [ ] `memory_search` → vector search; pre-turn `recallForTurn` in agent loop
- [ ] `ingest_document` + chunk pipeline for reference collections
- [ ] Vector DB + RAG views wired to live API
- [ ] Collection reindex job + progress in UI

**Exit:** New chat turns include relevant recalled context; PDF/markdown ingest works.

### Phase 3 — Extract + graph (2 weeks)

**Goal:** Memories accumulate from use; relations visible.

- [ ] `Extractor` + session idle commit job
- [ ] `memory_edges` + `memory_link` tool
- [ ] Knowledge graph view (read-only)
- [ ] Conflict flagging (`status: conflicted`) on contradictory semantic extract
- [ ] Identity docs (SOUL/USER/ETHICS) as first-class entries

**Exit:** Ending a session can propose new episodic/semantic memories; graph explorer works.

### Phase 4 — Swappable backends & agents (2 weeks)

**Goal:** Prove the swap story; widen agent coverage.

- [ ] `memoryProviderRegistry` + Settings backend picker
- [ ] Optional HTTP provider scaffold (Qdrant local documented)
- [ ] ACP memory tool forwarding toggle + principal mapping
- [ ] Automation `recallCollections` field
- [ ] MCP outward: read-only memory tools

**Exit:** Admin can point a collection at a different backend and reindex; ACP agents can search granted memory.

### Phase 5 — Focus context + ingestion hooks (ongoing)

- [ ] `focusContext` from active window/project feeds recall filters
- [ ] Notes/Files watch → auto-ingest rules per collection
- [ ] User recall scripts (Hermes-style) as `RecallProvider` plugin
- [ ] Cross-encoder reranker provider hook

---

## 13. v1 evaluation scorecard

Use this to decide if v1 is "done" before expanding scope.

| Criterion | Target |
| --- | --- |
| **Swappable** | Replace embedder + vector backend on one collection without code changes outside providers |
| **Permissioned** | Two agent profiles with different grants see different search results |
| **Typed** | All six kinds creatable; reference collections support ingest + cite |
| **Recall** | Built-in chat measurably includes pre-turn context under token budget |
| **Extract** | Session end produces reviewable proposals with audit trail |
| **Operator UI** | Memory app shows entries, collections, vector health, graph, identity docs |
| **Safe defaults** | Channel + automation agents cannot write semantic memory without explicit grant |
| **No lock-in** | Core runs fully offline with sqlite-vec + local embedder |

---

## 14. Non-goals (v1)

- Multi-user cloud sync of memory stores
- Real-time collaborative memory editing
- Automatic ingest of entire Drive without collection rules
- Full GraphRAG agent with multi-hop reasoning loops
- Replacing chat session transcripts (sessions remain the verbatim record;
  memory is distilled + searchable)
- ACP subprocess internal memory inspection

---

## 15. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Embedding model size / RAM | Lazy-load embedder; default to small local model; remote embedder optional |
| Recall pollutes context | Hard token budget + diversity cap (max N per kind) |
| Extract hallucinates facts | Default `pending` below confidence threshold; user review queue |
| Backend swap data loss | Reindex from canonical `memory_entries` + chunks, not vectors alone |
| Permission complexity | Start with kind-level grants; collection-level is opt-in advanced UI |
| AGPL Odysseus coupling | HTTP/MCP bridge only; core memory never imports Odysseus code |

---

## 16. File ownership (when implementing)

| Area | Path |
| --- | --- |
| Types + contract | `shared/capabilities/memory.ts`, `shared/types.ts` (additions) |
| Store + ACL | `server/memory/memoryStore.ts`, `server/memory/memoryGrantStore.ts` |
| Providers | `server/memory/providers/` (`sqliteVec.ts`, `embedders/`, `extractors/`) |
| Pipelines | `server/memory/recall.ts`, `server/memory/extract.ts` |
| Agent tools | `server/agent/tools.ts` (register memory tools) |
| API routes | `server/index.ts` ( `/api/memory/*` ) |
| UI app | `src/apps/memory/` |
| Settings | `src/apps/settings/MemorySection.tsx` |
| Data | `data/memory/` |

Coordinate with agent-extensibility owner: memory tools use `toolRegistry` /
`policyStore` only — no edits to MCP client internals unless adding outward tools in Phase 4.

---

## 17. Immediate next step

Execute **Phase 0**: port Psyche → `MemoryApp` with stub hook matching the
API shapes in §8, and add `shared/capabilities/memory.ts` so downstream work
shares one type source. Phase 1 can proceed in parallel once entry CRUD routes
exist.
