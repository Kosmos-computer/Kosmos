import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ChatMessage } from "../../shared/types.js";
import { sanitizeMessagesForLlm } from "./sanitizeMessages.js";

describe("sanitizeMessagesForLlm", () => {
  it("keeps a complete tool round followed by a final assistant reply", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "hi" },
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c1", name: "read_file", arguments: "{}" }],
      },
      { role: "tool", toolCallId: "c1", name: "read_file", content: "{}" },
      { role: "assistant", content: "done" },
    ];
    assert.deepEqual(sanitizeMessagesForLlm(messages), messages);
  });

  it("collapses consecutive user messages to the latest", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "old" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "original" },
      { role: "user", content: "edited" },
    ];
    assert.deepEqual(sanitizeMessagesForLlm(messages), [
      { role: "user", content: "old" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "edited" },
    ]);
  });

  it("drops incomplete assistant tool_calls and collapses the following user", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "hi" },
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c1", name: "read_file", arguments: "{}" }],
      },
      { role: "user", content: "again" },
    ];
    assert.deepEqual(sanitizeMessagesForLlm(messages), [
      { role: "user", content: "again" },
    ]);
  });

  it("strips a trailing tool round so a following user turn stays valid", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "hi" },
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c1", name: "read_file", arguments: "{}" }],
      },
      { role: "tool", toolCallId: "c1", name: "read_file", content: "{}" },
    ];
    assert.deepEqual(sanitizeMessagesForLlm(messages), [
      { role: "user", content: "hi" },
    ]);
  });

  it("drops orphan tool results", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "hi" },
      { role: "tool", toolCallId: "x", name: "read_file", content: "{}" },
      { role: "assistant", content: "ok" },
    ];
    assert.deepEqual(sanitizeMessagesForLlm(messages), [
      { role: "user", content: "hi" },
      { role: "assistant", content: "ok" },
    ]);
  });
});
