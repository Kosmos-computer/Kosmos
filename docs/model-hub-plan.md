# Model Hub — Evaluation & Roadmap

How model management in Arco grows from "a separate Tauri app that runs local
GGUFs" into **the hub for every model the OS uses** — text/agent, voice (STT,
TTS, VAD/turn), and future modalities (image generation, music generation) —
with a design that is native to the Arco shell and a registry that new models
plug into without code changes.

> Companion docs: `docs/app-platform-plan.md` (manifests, contracts, tiers),
> `shared/manifest.ts` (app manifest), `shared/capabilities/voice.ts`
> (os.voice@1 contract).

---

## Part 1 — Evaluation: where model management stands today

### 1.1 Inventory: five places models are configured, none of them the hub

| Surface | What it manages | Source of truth | UI |
| --- | --- | --- | --- |
| **model-manager/** (Tauri app) | Local GGUF download/run via llama-server router (:4650) | `model-manager/src/catalog.ts` (hardcoded) + `~/Library/Application Support/arco-models/` | Own `mm-*` component system, dark-only |
| **Settings app → Model provider** | The one active LLM endpoint for the built-in agent | `data/settings.json` via `PUT /api/settings` | `arco-chip` presets + free-text baseUrl/model/key |
| **Studio composer model menu** | Same setting, different abstraction | `data/settings.json` (via `useModelSelection.ts`) | Dropdown of `PROVIDER_PRESETS` |
| **Voice server config** | STT (Whisper), TTS (Kokoro/Piper), VAD, Smart Turn, voice brain | `voice-server/voice.config.json` — **no UI at all** | None |
| **ACP agents** | External agents (Claude Code, Codex, Gemini) bring their own models | `ACP_PRESETS` in `shared/types.ts` | Settings chips |

Key structural facts:

- **`data/settings.json` holds exactly one model slot** (`provider`, `baseUrl`,
  `model`, `apiKey`) — see `Settings` in `shared/types.ts`. Everything
  LLM-shaped in the OS funnels through it (`server/env.ts` →
  `server/agent/llm.ts`), including voice when
  `voice.config.json.brain.useArcoSettings` is true.
- **Presets are hardcoded in three unrelated files** that can drift:
  `PROVIDER_PRESETS` (`shared/types.ts`), the GGUF catalog
  (`model-manager/src/catalog.ts`), and `voice.config.json` defaults. Today
  `PROVIDER_PRESETS.local.model` is `"Qwen3-1.7B-Q4_K_M"` while the router
  routes on the full filename stem from the catalog — they only agree by
  convention.
- **The model-manager's "Use in Arco" button** (`configure_arco` in
  `model-manager/src-tauri/src/main.rs`) reaches across the process boundary
  and rewrites `data/settings.json` directly — a side channel, not a
  registry.
- **No model registry exists.** The app platform has a real manifest/registry
  system (`shared/manifest.ts`, `data/installed-apps.json`,
  `server/capabilities/registry.ts` with `data/capability-providers.json`
  overrides) — but it covers *apps and capability contracts*, not models.
  Models are strings in config files.

### 1.2 Functional gaps

1. **Voice models are invisible.** Whisper model choice, Kokoro voice,
   Piper endpoint, VAD timings, Smart Turn — all JSON-only
   (`voice-server/voice.config.json`). A user cannot see which STT/TTS model
   is active, switch voices, or know voice exists as a configurable thing.
2. **One LLM slot for every text use-case.** Chat, Studio, automations, and
   the OpenAI-compat facade all share the single `settings.json` model. There
   is no per-use-case assignment (e.g. fast local model for automations,
   frontier model for Studio).
3. **No image or music generation anywhere.** No provider integrations
   (no Replicate/Stability/Suno/ElevenLabs/DALL·E), no capability contract,
   no settings surface. OpenUI can *display* images but nothing generates
   them. The hub must be designed so these slot in as new use-cases, not as
   new one-off settings sections.
4. **On/off is not a concept.** Models can't be enabled/disabled; the only
   states are "is the string in settings.json" and (locally) llama-server's
   loaded/stopped phases.
5. **Adding a model means editing source.** New local models require a PR to
   `catalog.ts`; new cloud presets require editing `PROVIDER_PRESETS`. There
   is no remote/updatable manifest and no "add by URL/ID" flow (the app
   platform already has this pattern for apps — install by manifest URL).

### 1.3 Design-alignment gaps (model-manager vs. Arco design system)

The Tauri app deliberately copied token *values* but forked the system:

- **Parallel component classes.** `mm-btn`, `mm-card`, `mm-model`, `mm-badge`,
  `mm-input` (`model-manager/src/styles.css`) duplicate `arco-btn`,
  `arco-card`, `arco-listrow`, `arco-chip`, `arco-input` from
  `src/styles/base.css` / `src/styles/apps.css`. Two implementations of the
  same visual language will drift (they already have: hover states, paddings,
  and badge shapes differ subtly).
- **Duplicated token block, dark-only.** ~50 lines of `--arco-*` variables are
  pasted rather than imported from `src/styles/tokens.css`, and only the dark
  palette was carried over — `model-manager/index.html` hardcodes
  `data-theme="dark"`. The OS supports light/dark and pushes tokens to
  installed apps (`collectAppTokens()` in the AppHost); the model-manager
  ignores both mechanisms.
- **Not in the shell.** Model management is the only system-level concern
  that lives outside the OS: no dock icon, no window, no mobile presence.
  Users configure "Model provider" in Settings and then must know to launch a
  separate desktop app to make the `local` preset actually work.
- **Layout patterns diverge.** The two-column engine/testbench layout is fine
  for a power tool, but it doesn't reuse any shell pattern (`arco-panel`,
  `arco-listrow` lists, chip pickers, drawers). Reference targets for a
  native redesign: **StudioApp** (`src/apps/studio/StudioApp.tsx`) for
  split-pane + drawer polish, **SettingsApp**/**AutomationsApp** for
  form/list conventions.
- **Adjacent confusion in Settings.** "Default providers"
  (`ProvidersSection.tsx`) is about capability contracts (calendar), and sits
  near "Model provider" (LLM vendors) in the same app. A dedicated Models hub
  removes the collision.

### 1.4 What's worth keeping

- The **llama-server router supervisor** (Rust side of model-manager) is solid
  engineering: download with progress, presets.ini generation, router
  load/unload, log streaming, benchmarking. It should become the *local
  engine backend* of the hub, not stay a whole separate product.
- The **curated catalog philosophy** (speed-tiered, tool-calling-benchmarked
  picks with rationale in `catalog.ts`) is good editorial content — it should
  move into a data-driven manifest, not disappear.
- The **capability registry pattern** (`os.calendar@1` → provider binding,
  user overrides in `data/capability-providers.json`) is exactly the right
  shape for model→use-case assignment and should be mirrored, not
  reinvented.

---

## Part 2 — Target design: the Models hub

### 2.1 Product shape

**Models becomes a system app in the shell** (entry in
`src/os/systemApps.tsx`, alongside Chat/Studio/Settings), built entirely from
`arco-*` primitives and shared tokens, light+dark. The Tauri app is demoted to
an optional headless engine host (or its supervisor is reached via a thin
local HTTP daemon) — the UI lives in the OS.

Two-level information architecture:

1. **Use-cases (the top level).** One row/card per model *slot* the OS
   defines: Agent/Chat, Automations, Voice brain, Speech-to-text,
   Text-to-speech, Image generation, Music generation, Embeddings (future).
   Each shows the currently assigned model, its status (running/ready/
   unreachable/disabled), and a picker of eligible models. This is what 90%
   of users touch.
2. **Model library (the second level).** Every known model across providers:
   view details (capabilities, size, cost tier, local/cloud, benchmark
   notes), enable/disable, download/remove (local), add new (by preset,
   by manifest URL, or custom endpoint), test-bench and logs tucked into a
   drawer for local engine power users.

### 2.2 The model manifest & registry

Mirror the app platform's proven pattern — a typed manifest, a disk-backed
registry, and a binding table:

```ts
// shared/models.ts (new)

/** What a model can do — the join key between models and use-case slots. */
export type ModelCapability =
  | "text.chat"        // OpenAI-compatible chat/completions + tool calling
  | "text.embedding"
  | "speech.stt"
  | "speech.tts"
  | "image.generate"
  | "music.generate";

export interface ModelManifest {
  /** Reverse-DNS-ish id, e.g. "local.qwen3-1.7b", "openai.gpt-5.5". */
  id: string;
  name: string;
  description?: string;
  capabilities: ModelCapability[];
  /** How to reach/run it. */
  runtime:
    | { kind: "openai-compatible"; baseUrl: string; model: string; apiKeyRef?: string }
    | { kind: "llama-gguf"; file: string; url: string; sizeBytes: number;
        presetExtras?: Record<string, string> }        // absorbs catalog.ts
    | { kind: "voice-engine"; engine: "whisper-mlx" | "faster-whisper"
        | "kokoro" | "piper"; model?: string; voice?: string; baseUrl?: string };
  /** Editorial metadata (speedTier, experimental, benchmark notes). */
  meta?: Record<string, string | number | boolean>;
}

export interface RegisteredModel {
  manifest: ModelManifest;
  source: "seed" | "url" | "user";   // same vocabulary as InstalledApp
  enabled: boolean;
  addedAt: string;
}

/** One OS-defined slot a model can be assigned to. */
export interface UseCaseSlot {
  id: string;                  // "agent.chat", "voice.stt", "image.generate"
  label: string;
  requires: ModelCapability;
  /** Registered model id, or null = slot unconfigured/uses fallback. */
  assigned: string | null;
}
```

Persistence and plumbing, all following existing conventions:

- **`data/models.json`** — the registry (like `data/installed-apps.json`),
  seeded on boot from a `models/` seed directory or a bundled seed list that
  absorbs `PROVIDER_PRESETS` and `catalog.ts`.
- **`data/model-assignments.json`** — slot → model id bindings (like
  `data/capability-providers.json`).
- **`server/stores/modelStore.ts` + `/api/models` routes** — CRUD, enable/
  disable, assign; consumers (`server/agent/llm.ts`, voice server, future
  image/music services) resolve their slot through one function:
  `resolveModel(slotId)` instead of `loadSettings().model`.
- **New models arrive as data, not code:** add-by-manifest-URL (fetch a
  `model.json`, validate with a Zod schema à la
  `server/platform/manifestSchema.ts`, register) plus a "Custom endpoint"
  form for anything OpenAI-compatible. A curated remote catalog can later be
  polled the same way app seeds are.

Backwards compatibility: `data/settings.json`'s provider/baseUrl/model block
becomes a legacy mirror of the `agent.chat` slot during migration, then is
retired. `voice.config.json`'s stt/tts/brain slots are generated from
assignments (voice server reads the registry the way it already optionally
reads Arco settings via `useArcoSettings`).

### 2.3 Design alignment rules for the new app

- Import `src/styles/tokens.css`; zero copied token blocks. Light and dark.
- Build from existing primitives: `arco-panel`, `arco-listrow` (model rows),
  `arco-chip-row` (capability filters, slot pickers), `arco-btn` variants,
  `arco-card`, `Menu.tsx` for pickers, Lucide icons.
- Status badges reuse the semantic colors (`--arco-success/warning/danger`)
  with one shared badge component promoted into `src/components/` (both the
  Models app and future apps need it — today badges exist only as `mm-badge`).
- Downloads/long operations surface through the shell notification system
  (`osStore` notifications) rather than a bespoke progress area.
- Keyboard/ARIA parity with SettingsApp patterns (`aria-pressed` chips,
  labeled inputs).

---

## Part 3 — Roadmap

### Phase 1 — Registry foundation (backend, no UI change)

1. Add `shared/models.ts` (manifest, registry, slot types) + Zod schema.
2. Add `server/stores/modelStore.ts`, `data/models.json`,
   `data/model-assignments.json`, and `/api/models` routes; seed from
   `PROVIDER_PRESETS` + `catalog.ts` content.
3. Introduce `resolveModel("agent.chat")` in `server/agent/llm.ts`, keeping
   `settings.json` as a synced legacy mirror so nothing breaks.

*Exit criteria: agent runs off the registry; settings UI unchanged and still works.*

### Phase 2 — Models system app (design-aligned hub, LLM slots first)

1. Create `src/apps/models/` (ModelsApp, UseCaseSlots, ModelLibrary,
   ModelDetail) using only `arco-*` primitives; register in
   `src/os/systemApps.tsx` with a dock icon.
2. Slots shipped: **Agent/Chat** and **Automations** (both `text.chat`);
   library covers cloud presets + custom endpoints, with enable/disable and
   add-by-URL/custom-endpoint flows.
3. Point Settings' "Model provider" section and Studio's `useModelSelection`
   at the registry (Settings section slims to a link + active-model summary;
   Studio menu lists enabled `text.chat` models).

*Exit criteria: one source of truth; three old selection UIs read/write it.*

### Phase 3 — Local engine integration (absorb model-manager)

1. Expose the llama-server supervisor to the OS: either the Tauri app grows a
   small localhost API mirroring its bridge commands, or the supervisor is
   ported to a Node sidecar under `server/` (preferred long-term — one less
   runtime).
2. Models app gains local-model powers: download with progress (shell
   notifications), run/stop, remove, engine start/stop, and a details drawer
   housing the test bench and logs (port `TestBench`/`LogsPane` to `arco-*`).
3. `catalog.ts` entries become seed `ModelManifest`s (`runtime.kind:
   "llama-gguf"`); `configure_arco` is replaced by a normal slot assignment.
4. Retire the `mm-*` CSS fork; the Tauri UI either goes away or becomes a
   thin shell around the same React components.

*Exit criteria: no separate model-manager UI needed for the local workflow.*

### Phase 4 — Voice models in the hub

1. Register STT/TTS/voice-brain as slots (`voice.stt`, `voice.tts`,
   `voice.brain`) with seed manifests for Whisper (large-v3-turbo /
   faster-whisper), Kokoro voices, and Piper.
2. Voice server reads assignments from the registry (extend the existing
   `useArcoSettings` bridge in `voice-server/bot.py` to cover stt/tts, or
   generate `voice.config.json` from assignments on save + restart signal).
3. UI: voice slots show engine + voice pickers (e.g. Kokoro voice list),
   with a "test voice" affordance.

*Exit criteria: a user can switch TTS voice or STT model from the Models app
without touching JSON.*

### Phase 5 — New modalities: image & music generation

1. Define capability contracts the platform way (`os.image-gen@1`,
   `os.music-gen@1` in `shared/capabilities/`), with intents like
   `image.generate` so generated apps and the agent consume them through the
   existing capability registry and permission model.
2. Add first providers as model manifests (`image.generate`,
   `music.generate` capabilities; runtime `openai-compatible` covers OpenAI
   Images-style APIs, add runtime kinds as needed for Replicate-style async
   jobs).
3. Slots appear in the Models hub automatically (slot list is data-driven);
   agent gains `generate_image` / `generate_music` tools that resolve through
   the slots.

*Exit criteria: "generate an image" works end-to-end and the model powering
it is swappable in the hub.*

### Phase 6 — Polish & governance

- Remote curated catalog (signed manifest feed) for one-click model adds;
  update checks for seed manifests.
- Per-model health checks (endpoint reachability, key validity) surfaced as
  status badges; cost/usage notes per slot.
- Mobile layout for the Models app (`MobileShell` parity).
- Docs: user-facing "Managing models" page; this plan folds into
  `docs/app-platform-plan.md`'s contract list.

---

## Risks & open questions

- **Tauri supervisor vs. Node sidecar (Phase 3):** porting process
  supervision to Node duplicates working Rust; keeping Tauri means shipping a
  desktop dependency for local models. Recommendation: keep the Rust
  supervisor short-term behind a localhost API, decide on the port only if
  the Tauri runtime becomes a distribution problem.
- **Voice server restart semantics:** Pipecat pipelines bind models at
  startup; slot changes need a restart/reload signal (Phase 4, item 2) — the
  UX must show "applying…" honestly.
- **API key storage:** the registry references keys (`apiKeyRef`) rather than
  embedding them; keys stay in the existing masked settings store. Multiple
  providers means multiple keys — the settings store needs to become keyed by
  provider rather than a single `apiKey` field.
- **ACP agents are out of scope for slots:** external agents bring their own
  models; the hub should display them as informational ("managed by Claude
  Code") rather than pretending to control them.
