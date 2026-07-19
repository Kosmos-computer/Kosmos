/**
 * Providers (OpenRouter et al.) reject transcripts that break the chat
 * schema — consecutive user turns, orphan tool results, or assistant
 * tool_calls without matching tool messages. Edit / regenerate / truncate
 * can leave those shapes behind; sanitize before every LLM call.
 */
import type { ChatMessage } from "../../shared/types.js";

/** Drop a trailing assistant+tool round that never got a final assistant reply. */
function dropTrailingToolRound(messages: ChatMessage[]): void {
  while (messages.length > 0 && messages[messages.length - 1]?.role === "tool") {
    while (messages.length > 0 && messages[messages.length - 1]?.role === "tool") {
      messages.pop();
    }
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && (last.toolCalls?.length ?? 0) > 0) {
      messages.pop();
    } else {
      break;
    }
  }
}

/**
 * Return a provider-safe copy of `messages`. Does not mutate the input.
 */
export function sanitizeMessagesForLlm(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  let i = 0;

  while (i < messages.length) {
    const m = messages[i]!;

    if (m.role === "user") {
      if (!m.content.trim()) {
        i += 1;
        continue;
      }
      // A bare tool round cannot be followed by a user message.
      dropTrailingToolRound(out);
      if (out.length > 0 && out[out.length - 1]?.role === "user") {
        out[out.length - 1] = m;
      } else {
        out.push(m);
      }
      i += 1;
      continue;
    }

    if (m.role === "assistant") {
      const toolCalls = m.toolCalls ?? [];
      if (toolCalls.length === 0) {
        if (!m.content.trim()) {
          i += 1;
          continue;
        }
        out.push(m);
        i += 1;
        continue;
      }

      const needed = new Set(toolCalls.map((tc) => tc.id));
      const tools: Extract<ChatMessage, { role: "tool" }>[] = [];
      let j = i + 1;
      while (j < messages.length && messages[j]?.role === "tool") {
        const toolMsg = messages[j];
        if (toolMsg?.role === "tool") {
          tools.push(toolMsg);
          needed.delete(toolMsg.toolCallId);
        }
        j += 1;
      }

      if (needed.size > 0) {
        // Incomplete tool round — skip assistant + any partial results.
        i = j;
        continue;
      }

      out.push(m);
      out.push(...tools);
      i = j;
      continue;
    }

    // Orphan tool result (no preceding assistant tool_calls).
    i += 1;
  }

  // History that ends mid-tool-round is fine to display, but the next
  // completion appends a user message — strip so that stays valid.
  dropTrailingToolRound(out);
  return out;
}
