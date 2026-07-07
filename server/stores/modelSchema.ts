/**
 * Model manifest validation — every registration path (seed list, URL,
 * custom-endpoint form) funnels through here, like app manifests through
 * server/platform/manifestSchema.ts.
 */
import { z } from "zod";
import type { ModelManifest } from "../../shared/models.js";

const ggufFileSchema = z.object({
  file: z.string().regex(/^[^/\\]+\.gguf$/i, "file must be a bare .gguf filename"),
  url: z.string().url(),
  sizeBytes: z.number().int().positive(),
});

const runtimeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("openai-compatible"),
    baseUrl: z.string().url(),
    model: z.string().min(1),
    apiKeyRef: z.string().min(1).optional(),
  }),
  ggufFileSchema.extend({
    kind: z.literal("llama-gguf"),
    presetExtras: z.record(z.string(), z.string()).optional(),
    draft: ggufFileSchema.optional(),
  }),
  z.object({
    kind: z.literal("voice-engine"),
    engine: z.enum(["whisper-mlx", "faster-whisper", "kokoro", "piper"]),
    model: z.string().min(1).optional(),
    voice: z.string().min(1).optional(),
    baseUrl: z.string().url().optional(),
  }),
]);

export const modelManifestSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(\.[a-z0-9][a-z0-9._-]*)+$/, "id must be dot-namespaced, e.g. openai.gpt-5.5"),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  capabilities: z
    .array(
      z.enum(["text.chat", "text.embedding", "speech.stt", "speech.tts", "image.generate", "music.generate"]),
    )
    .min(1),
  runtime: runtimeSchema,
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export function parseModelManifest(raw: unknown): ModelManifest {
  return modelManifestSchema.parse(raw) as ModelManifest;
}
