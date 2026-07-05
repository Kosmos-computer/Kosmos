/**
 * Curated model catalog — speed-first picks for driving Arco's agent loop.
 *
 * Selection rationale (see plan): models must handle OpenAI-style tool calling
 * well. Rankings from the Apple-Silicon tool-calling benchmark (lintware/
 * tool-calling-benchmark): Qwen3-1.7B is the judgment champion, LFM2 the
 * latency champion, Qwen3-4B the quality fallback, Qwen3-30B-A3B the
 * "fast and smart" ceiling for 36 GB machines.
 */

export interface CatalogEntry {
  /** GGUF filename on disk — also the model id the router routes on. */
  file: string;
  label: string;
  description: string;
  /** Download source (Hugging Face resolve URL). */
  url: string;
  sizeBytes: number;
  speedTier: "fastest" | "fast" | "balanced" | "big";
  experimental?: boolean;
  /**
   * Extra preset keys for this model (INI `key = value` lines). Tuning flags
   * shared by all models live in the global [*] section — see presets.ts.
   */
  presetExtras?: Record<string, string>;
}

/** Draft model used for the speculative-decoding "turbo" pair. */
export const DRAFT_MODEL: CatalogEntry = {
  file: "Qwen3-0.6B-Q8_0.gguf",
  label: "Qwen3 0.6B (draft)",
  description:
    "Tiny draft model powering speculative decoding for Qwen3 4B Turbo. Not meant to be used alone.",
  url: "https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf",
  sizeBytes: 639_447_264,
  speedTier: "fastest",
};

export const CATALOG: CatalogEntry[] = [
  {
    file: "Qwen3-1.7B-Q4_K_M.gguf",
    label: "Qwen3 1.7B",
    description:
      "Default test model. Best-in-class tool-calling judgment for its size (0.96 agent score); thinking disabled for speed. Light coding ability.",
    url: "https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf",
    sizeBytes: 1_282_959_136,
    speedTier: "fast",
    presetExtras: {
      // Qwen3 hybrid-thinking models: force non-thinking responses.
      "chat-template-kwargs": '{"enable_thinking": false}',
    },
  },
  {
    file: "LFM2-1.2B-Q4_K_M.gguf",
    label: "LFM2 1.2B",
    description:
      "Latency champion — Liquid AI state-space hybrid, near-instant responses. Tool-call formatting can be quirky; validate before trusting in Arco.",
    url: "https://huggingface.co/LiquidAI/LFM2-1.2B-GGUF/resolve/main/LFM2-1.2B-Q4_K_M.gguf",
    sizeBytes: 730_646_784,
    speedTier: "fastest",
    experimental: true,
  },
  {
    file: "Qwen3-4B-Instruct-2507-Q4_K_M.gguf",
    label: "Qwen3 4B Instruct (Turbo)",
    description:
      "Quality fallback with speculative decoding: the 0.6B draft model accelerates JSON/tool-call output up to ~3x. Downloads both GGUFs.",
    url: "https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf",
    sizeBytes: 2_497_276_608,
    speedTier: "balanced",
    presetExtras: {
      // 2507 Instruct is non-thinking by design; the win here is the turbo pair.
      "model-draft": "@MODELS_DIR@/Qwen3-0.6B-Q8_0.gguf",
      "spec-draft-ngl": "99",
    },
  },
  {
    file: "Qwen3-30B-A3B-Q4_K_M.gguf",
    label: "Qwen3 30B A3B (MoE)",
    description:
      "Fast-and-smart ceiling: 30B mixture-of-experts with only 3B active params — near-4B speed, far better coding. ~18 GB download, needs ~20 GB RAM.",
    url: "https://huggingface.co/unsloth/Qwen3-30B-A3B-GGUF/resolve/main/Qwen3-30B-A3B-Q4_K_M.gguf",
    sizeBytes: 18_556_686_336,
    speedTier: "big",
    presetExtras: {
      "chat-template-kwargs": '{"enable_thinking": false}',
    },
  },
];

/** Catalog + draft, keyed by filename, for lookup from local file listings. */
export const ALL_KNOWN: Record<string, CatalogEntry> = Object.fromEntries(
  [...CATALOG, DRAFT_MODEL].map((e) => [e.file, e]),
);
