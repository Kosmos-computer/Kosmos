/**
 * Model registry types — the hub for every model the OS uses (text/agent,
 * voice STT/TTS, future image/music). Mirrors the app platform's pattern:
 * a typed manifest, a disk-backed registry (data/models.json), and a slot
 * assignment table (data/model-assignments.json).
 *
 * Design doc: docs/model-hub-plan.md. Server side: server/stores/modelStore.ts.
 */

/** What a model can do — the join key between models and use-case slots. */
export type ModelCapability =
  | "text.chat" // OpenAI-compatible chat/completions + tool calling
  | "text.embedding"
  | "speech.stt"
  | "speech.tts"
  | "image.generate"
  | "music.generate";

/** A GGUF file the local engine downloads and serves. */
export interface GgufFile {
  /** Filename on disk — also the model id the llama-server router routes on. */
  file: string;
  /** Download source (Hugging Face resolve URL). */
  url: string;
  sizeBytes: number;
}

export type ModelRuntime =
  | {
      /** Anything speaking /v1/chat/completions — cloud or local endpoint. */
      kind: "openai-compatible";
      baseUrl: string;
      model: string;
      /** Key name in Settings.apiKeys — keys never live in the registry. */
      apiKeyRef?: string;
    }
  | ({
      /** Local GGUF served by the OS-managed llama-server router. */
      kind: "llama-gguf";
      /**
       * Extra preset keys for this model (INI `key = value` lines) beyond the
       * shared tuning flags in the global [*] section.
       */
      presetExtras?: Record<string, string>;
      /** Companion draft model for speculative decoding (downloaded alongside). */
      draft?: GgufFile;
    } & GgufFile)
  | {
      /** Models bound inside the Pipecat voice server (STT/TTS engines). */
      kind: "voice-engine";
      engine: "whisper-mlx" | "faster-whisper" | "kokoro" | "piper";
      model?: string;
      voice?: string;
      baseUrl?: string;
    };

export interface ModelManifest {
  /** Reverse-DNS-ish id, e.g. "local.qwen3-1.7b", "openai.gpt-5.5". */
  id: string;
  name: string;
  description?: string;
  capabilities: ModelCapability[];
  runtime: ModelRuntime;
  /** Editorial metadata (speedTier, experimental, benchmark notes). */
  meta?: Record<string, string | number | boolean>;
  /** Optional trust / safety labels (model-agent-profiles Phase 5). */
  trust?: import("./profiles.js").TrustLevel;
  safety?: import("./profiles.js").SafetyProfile;
  audience?: import("./profiles.js").AudienceProfile;
  certification?: import("./profiles.js").CertificationProfile;
}

/** Same vocabulary as InstalledApp: seeded, added by URL, or hand-entered. */
export type ModelSource = "seed" | "url" | "user";

export interface RegisteredModel {
  manifest: ModelManifest;
  source: ModelSource;
  enabled: boolean;
  addedAt: string;
}

// ── Use-case slots ───────────────────────────────────────────────────────────

/** Built-in slots ship with the OS; user slots are added in the Models app. */
export type UseCaseSlotSource = "seed" | "user";

/** One OS-defined slot a model can be assigned to. */
export interface UseCaseSlotDef {
  id: string;
  label: string;
  description: string;
  requires: ModelCapability;
  /** Slot to inherit from when unassigned (e.g. automations → agent.chat). */
  fallback?: string;
}

/** POST /api/models/slots — create a user-defined use case. */
export interface CreateUseCaseSlotInput {
  label: string;
  description?: string;
  requires: ModelCapability;
  /** Another slot with the same capability to inherit from when unassigned. */
  fallback?: string;
}

/**
 * The slot list is data-driven: new use-cases appear in the Models hub by
 * adding a row here, not by new settings sections.
 */
export const USE_CASE_SLOTS: UseCaseSlotDef[] = [
  {
    id: "agent.chat",
    label: "Agent & Chat",
    description: "The built-in agent: chat turns, Studio, generated apps.",
    requires: "text.chat",
  },
  {
    id: "automations.chat",
    label: "Automations",
    description: "Scheduled and event-triggered agent runs.",
    requires: "text.chat",
    fallback: "agent.chat",
  },
  {
    id: "background.review",
    label: "Background review",
    description:
      "Post-turn learning loop: proposes pending memory and skill drafts (never auto-applies).",
    requires: "text.chat",
    fallback: "agent.chat",
  },
  {
    id: "voice.brain",
    label: "Voice brain",
    description: "The model that answers during voice conversations.",
    requires: "text.chat",
    fallback: "agent.chat",
  },
  {
    id: "voice.stt",
    label: "Speech-to-text",
    description: "Transcribes your voice. Applies when the voice server restarts.",
    requires: "speech.stt",
  },
  {
    id: "voice.tts",
    label: "Text-to-speech",
    description: "Speaks replies aloud. Applies when the voice server restarts.",
    requires: "speech.tts",
  },
  {
    id: "image.generate",
    label: "Image generation",
    description: "Creates images for the agent and apps.",
    requires: "image.generate",
  },
  {
    id: "music.generate",
    label: "Music generation",
    description: "Creates music and audio for the agent and apps.",
    requires: "music.generate",
  },
];

/** A slot with its current assignment, as served by GET /api/models. */
export interface UseCaseSlotState extends UseCaseSlotDef {
  source: UseCaseSlotSource;
  /** Registered model id, or null = unconfigured (uses fallback chain). */
  assigned: string | null;
  /**
   * The model the slot actually resolves to right now, after following the
   * fallback chain (assigned model, fallback slot, legacy settings).
   */
  effective: { modelId: string | null; name: string } | null;
  /** Enabled registered models eligible for this slot. */
  eligible: { id: string; name: string }[];
}

// ── Local engine ─────────────────────────────────────────────────────────────

/** The llama-server router the OS supervises (same port the Tauri app used). */
export const LOCAL_ENGINE_PORT = 4650;
export const LOCAL_ENGINE_BASE_URL = `http://127.0.0.1:${LOCAL_ENGINE_PORT}/v1`;

export type EnginePhase = "stopped" | "starting" | "running" | "error";

/** Per-GGUF-model state as reported by GET /api/models/engine. */
export interface EngineModelState {
  /** Main GGUF filename. */
  file: string;
  /** On-disk / download lifecycle. */
  state: "absent" | "downloading" | "downloaded" | "error";
  receivedBytes?: number;
  totalBytes?: number;
  error?: string;
  /** Router-side status once the engine is running ("loaded", "loading", …). */
  routerState?: string;
}

/** GET /api/models/engine — local engine + per-model download state. */
export interface EngineStatus {
  phase: EnginePhase;
  /** Human-readable detail for the error phase. */
  detail?: string;
  /** Absolute path of the GGUF store on this machine. */
  modelsDir: string;
  /**
   * True when a healthy llama-server router was found on the port but is
   * supervised by another process (e.g. the legacy Tauri model-manager) —
   * usable for inference, but not stoppable from here.
   */
  external?: boolean;
  /** Keyed by registered model id (llama-gguf manifests only). */
  models: Record<string, EngineModelState>;
}

// ── Seed manifests ───────────────────────────────────────────────────────────
// Absorbs PROVIDER_PRESETS (shared/types.ts) and the model-manager GGUF
// catalog (model-manager/src/catalog.ts) — those stay in place for legacy
// consumers until the migration retires them; this list is the source of
// truth for the registry.

export const MODEL_SEEDS: ModelManifest[] = [
  // Cloud presets
  {
    id: "openai.gpt-5.5",
    name: "GPT-5.5",
    description: "OpenAI's flagship — strong tool calling, fast.",
    capabilities: ["text.chat"],
    runtime: {
      kind: "openai-compatible",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.5",
      apiKeyRef: "openai",
    },
    meta: { provider: "openai", costTier: "paid" },
  },
  {
    id: "anthropic.claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    description: "Anthropic via the OpenAI-compatible endpoint — excellent agentic judgment.",
    capabilities: ["text.chat"],
    runtime: {
      kind: "openai-compatible",
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-sonnet-4-5",
      apiKeyRef: "anthropic",
    },
    meta: { provider: "anthropic", costTier: "paid" },
  },
  {
    id: "openrouter.claude-sonnet-4.5",
    name: "Claude Sonnet 4.5 (OpenRouter)",
    description: "One key, many models — routed through OpenRouter.",
    capabilities: ["text.chat"],
    runtime: {
      kind: "openai-compatible",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "anthropic/claude-sonnet-4.5",
      apiKeyRef: "openrouter",
    },
    meta: { provider: "openrouter", costTier: "paid" },
  },
  {
    id: "ollama.qwen3-32b",
    name: "Qwen3 32B (Ollama)",
    description: "A local Ollama daemon you run yourself.",
    capabilities: ["text.chat"],
    runtime: {
      kind: "openai-compatible",
      baseUrl: "http://localhost:11434/v1",
      model: "qwen3:32b",
    },
    meta: { provider: "ollama", costTier: "free" },
  },

  // Local GGUFs served by the OS-managed llama-server engine.
  // Selection rationale: models must handle OpenAI-style tool calling well;
  // rankings from the Apple-Silicon tool-calling benchmark
  // (lintware/tool-calling-benchmark).
  {
    id: "local.qwen3-1.7b",
    name: "Qwen3 1.7B",
    description:
      "Default local model. Best-in-class tool-calling judgment for its size (0.96 agent score); thinking disabled for speed. Light coding ability.",
    capabilities: ["text.chat"],
    runtime: {
      kind: "llama-gguf",
      file: "Qwen3-1.7B-Q4_K_M.gguf",
      url: "https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf",
      sizeBytes: 1_282_959_136,
      presetExtras: {
        // Qwen3 hybrid-thinking models: force non-thinking responses.
        "chat-template-kwargs": '{"enable_thinking": false}',
      },
    },
    meta: { provider: "local", speedTier: "fast", costTier: "free" },
  },
  {
    id: "local.lfm2-1.2b",
    name: "LFM2 1.2B",
    description:
      "Latency champion — Liquid AI state-space hybrid, near-instant responses. Tool-call formatting can be quirky; validate before trusting in Arco.",
    capabilities: ["text.chat"],
    runtime: {
      kind: "llama-gguf",
      file: "LFM2-1.2B-Q4_K_M.gguf",
      url: "https://huggingface.co/LiquidAI/LFM2-1.2B-GGUF/resolve/main/LFM2-1.2B-Q4_K_M.gguf",
      sizeBytes: 730_646_784,
    },
    meta: { provider: "local", speedTier: "fastest", experimental: true, costTier: "free" },
  },
  {
    id: "local.qwen3-4b-turbo",
    name: "Qwen3 4B Instruct (Turbo)",
    description:
      "Quality fallback with speculative decoding: a 0.6B draft model accelerates JSON/tool-call output up to ~3x. Downloads both GGUFs.",
    capabilities: ["text.chat"],
    runtime: {
      kind: "llama-gguf",
      file: "Qwen3-4B-Instruct-2507-Q4_K_M.gguf",
      url: "https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf",
      sizeBytes: 2_497_276_608,
      presetExtras: {
        // 2507 Instruct is non-thinking by design; the win here is the turbo pair.
        "model-draft": "@MODELS_DIR@/Qwen3-0.6B-Q8_0.gguf",
        "spec-draft-ngl": "99",
      },
      draft: {
        file: "Qwen3-0.6B-Q8_0.gguf",
        url: "https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf",
        sizeBytes: 639_447_264,
      },
    },
    meta: { provider: "local", speedTier: "balanced", costTier: "free" },
  },
  {
    id: "local.qwen3-30b-a3b",
    name: "Qwen3 30B A3B (MoE)",
    description:
      "Fast-and-smart ceiling: 30B mixture-of-experts with only 3B active params — near-4B speed, far better coding. ~18 GB download, needs ~20 GB RAM.",
    capabilities: ["text.chat"],
    runtime: {
      kind: "llama-gguf",
      file: "Qwen3-30B-A3B-Q4_K_M.gguf",
      url: "https://huggingface.co/unsloth/Qwen3-30B-A3B-GGUF/resolve/main/Qwen3-30B-A3B-Q4_K_M.gguf",
      sizeBytes: 18_556_686_336,
      presetExtras: {
        "chat-template-kwargs": '{"enable_thinking": false}',
      },
    },
    meta: { provider: "local", speedTier: "big", costTier: "free" },
  },

  // Voice engines (voice-server/voice.config.json defaults, made visible).
  {
    id: "voice.whisper-large-v3-turbo",
    name: "Whisper large-v3-turbo",
    description: "On-device transcription via MLX Whisper.",
    capabilities: ["speech.stt"],
    runtime: { kind: "voice-engine", engine: "whisper-mlx", model: "large-v3-turbo" },
    meta: { provider: "local", costTier: "free" },
  },
  {
    id: "voice.kokoro-af-heart",
    name: "Kokoro (af_heart)",
    description: "On-device neural TTS — the default Arco voice.",
    capabilities: ["speech.tts"],
    runtime: { kind: "voice-engine", engine: "kokoro", voice: "af_heart" },
    meta: { provider: "local", costTier: "free" },
  },
  {
    id: "voice.piper",
    name: "Piper",
    description: "Lightweight local TTS served over HTTP.",
    capabilities: ["speech.tts"],
    runtime: { kind: "voice-engine", engine: "piper", baseUrl: "http://localhost:5000" },
    meta: { provider: "local", costTier: "free" },
  },
];

/** Assignments seeded on first boot (agent.chat comes from legacy settings). */
export const DEFAULT_ASSIGNMENTS: Record<string, string> = {
  "voice.stt": "voice.whisper-large-v3-turbo",
  "voice.tts": "voice.kokoro-af-heart",
};
