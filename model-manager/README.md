# Arco Models

Local AI model manager for Arco OS. A Tauri desktop app that supervises
`llama-server` (llama.cpp) in **router mode** and exposes one OpenAI-compatible
endpoint — `http://127.0.0.1:4650/v1` — that Arco's agent talks to.

## What it does

- **Download / delete** curated GGUF models (speed-first picks with reliable
  tool calling: Qwen3 1.7B default, LFM2 1.2B latency champion, Qwen3 4B
  Instruct with speculative decoding, Qwen3 30B A3B MoE ceiling).
- **Run / stop** models through the router's `/models/load` + `/models/unload`
  API. Up to 2 models stay resident (LRU eviction); requests route on the
  `model` field.
- **Speed tuning baked in** via a generated `presets.ini`: full Metal offload,
  Flash Attention, q8_0 KV cache, 32k context (Arco's system prompt alone is
  ~19k tokens), thinking mode disabled on Qwen3, and a Qwen3-0.6B draft model
  paired with the 4B for speculative decoding.
- **Test bench**: one-click completion with llama-server's own timings —
  decode tokens/sec and prompt-eval TTFT.
- **Use in Arco**: writes `data/settings.json` (provider `local`) so the OS
  immediately targets the selected model.

## Prerequisites

- `llama-server` ≥ b9430 with router mode — `brew install llama.cpp`
- Rust toolchain (for `tauri dev`)

## Run

```sh
npm run models        # from the repo root, or:
npm run dev -w model-manager
```

Click **Start engine**, download a model, **Run** it, then **Use in Arco**.
Restart the engine after downloading new models so the router rescans the
models directory.

## Layout

- `src/` — React UI (catalog, engine bar, test bench, logs)
- `src/lib/presets.ts` — the tuned llama-server launch profile
- `src/catalog.ts` — curated model list + per-model preset extras
- `src-tauri/src/main.rs` — engine supervision, HF downloads, router API proxy
- Data lives in `~/Library/Application Support/arco-models/` (models + presets)
