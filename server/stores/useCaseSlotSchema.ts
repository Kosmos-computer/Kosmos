/**
 * User-defined use-case slot validation — custom slots are persisted in
 * data/custom-use-case-slots.json and merged with the built-in list.
 */
import { z } from "zod";
import type { CreateUseCaseSlotInput } from "../../shared/models.js";

const capabilitySchema = z.enum([
  "text.chat",
  "text.embedding",
  "speech.stt",
  "speech.tts",
  "image.generate",
  "music.generate",
]);

export const createUseCaseSlotSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(80),
  description: z.string().trim().max(500).optional(),
  requires: capabilitySchema,
  fallback: z.string().min(1).optional(),
});

export function parseCreateUseCaseSlot(raw: unknown): CreateUseCaseSlotInput {
  return createUseCaseSlotSchema.parse(raw) as CreateUseCaseSlotInput;
}
