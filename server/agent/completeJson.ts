/**
 * Non-streaming LLM helper for post-turn jobs (memory extract, background
 * review). Reuses the same OpenAI-compatible client as streamTurn.
 */
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import type { Settings } from "../../shared/types.js";
import { recordUsage } from "../stores/usageStore.js";
import {
  creditsInsufficientMessage,
  isCreditsInsufficientError,
} from "./creditsError.js";

const MAX_COMPLETION_TOKENS = 2048;

export interface CompleteJsonOptions {
  settings: Settings;
  system: string;
  user: string;
  signal?: AbortSignal;
}

/**
 * One-shot completion expecting a JSON object in the reply. Strips markdown
 * fences if the model wraps them. Returns null on parse failure or empty.
 */
export async function completeJson<T = unknown>(
  opts: CompleteJsonOptions,
): Promise<T | null> {
  if (opts.settings.provider === "mock") {
    return null;
  }

  const client = new OpenAI({
    apiKey: opts.settings.apiKey || "missing",
    baseURL: opts.settings.baseUrl,
  });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  try {
    const completion = await client.chat.completions.create(
      {
        model: opts.settings.model,
        messages,
        max_tokens: MAX_COMPLETION_TOKENS,
        temperature: 0.2,
        response_format: { type: "json_object" },
      },
      { signal: opts.signal },
    );

    const usage = completion.usage;
    if (usage) {
      recordUsage({
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      });
    }

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) return null;
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isCreditsInsufficientError(message)) {
      console.warn(`[arco] background LLM: ${creditsInsufficientMessage()}`);
    } else {
      console.warn(`[arco] background LLM failed:`, message);
    }
    return null;
  }
}
