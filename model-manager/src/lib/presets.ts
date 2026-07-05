/**
 * Builds the llama-server presets.ini — the speed-tuning heart of the app.
 *
 * Global section applies the Apple Silicon fast path to every model:
 *   - full Metal offload (n-gpu-layers 99)
 *   - Metal Flash Attention (prereq for KV quantization)
 *   - q8_0 KV cache (≈half the cache memory, negligible quality loss)
 *   - 32k context — Arco's system prompt alone is ~19k tokens, and the agent
 *     transcript grows every tool iteration
 * Per-model sections add model-specific keys (thinking off, draft pairing).
 */
import { CATALOG, DRAFT_MODEL, type CatalogEntry } from "../catalog";

const GLOBAL_TUNING: Record<string, string> = {
  "n-gpu-layers": "99",
  "flash-attn": "on",
  "cache-type-k": "q8_0",
  "cache-type-v": "q8_0",
  c: "32768",
};

function iniSection(name: string, entries: Record<string, string>): string {
  const body = Object.entries(entries)
    .map(([k, v]) => `${k} = ${v}`)
    .join("\n");
  return `[${name}]\n${body}\n`;
}

/**
 * Presets reference downloaded files only: llama-server refuses to start a
 * model whose GGUF (or draft GGUF) is missing, so sections are emitted per
 * locally-present file.
 */
export function buildPresetIni(localFiles: string[], modelsDir: string): string {
  const present = new Set(localFiles);
  const sections: string[] = ["version = 1\n", iniSection("*", GLOBAL_TUNING)];

  for (const entry of CATALOG) {
    if (!present.has(entry.file) || !entry.presetExtras) continue;
    const extras: Record<string, string> = {};
    for (const [k, v] of Object.entries(entry.presetExtras)) {
      const resolved = v.replace("@MODELS_DIR@", modelsDir);
      // Skip the turbo pairing when the draft model isn't downloaded yet.
      if (k === "model-draft" && !present.has(DRAFT_MODEL.file)) continue;
      extras[k] = resolved;
    }
    if (Object.keys(extras).length > 0) {
      sections.push(iniSection(modelId(entry), extras));
    }
  }
  return sections.join("\n");
}

/** The router names models from --models-dir by filename (without extension). */
export function modelId(entry: CatalogEntry | { file: string }): string {
  return entry.file.replace(/\.gguf$/, "");
}
