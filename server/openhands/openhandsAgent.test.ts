import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { translateOpenhandsEvent } from "./openhandsAgent.js";

function baseEvent(kind: string, extra: Record<string, unknown> = {}) {
  return { id: "e1", kind, timestamp: new Date().toISOString(), source: "agent", ...extra };
}

describe("translateOpenhandsEvent", () => {
  it("translates an agent MessageEvent into a text_delta", () => {
    const event = baseEvent("MessageEvent", {
      llm_message: { role: "assistant", content: [{ type: "text", text: "hello" }] },
    });
    assert.deepEqual(translateOpenhandsEvent(event), { type: "text_delta", delta: "hello" });
  });

  it("ignores a user-sourced MessageEvent", () => {
    const event = baseEvent("MessageEvent", {
      source: "user",
      llm_message: { role: "user", content: [{ type: "text", text: "hi" }] },
    });
    assert.equal(translateOpenhandsEvent(event), null);
  });

  it("translates an ActionEvent into tool_start", () => {
    const event = baseEvent("ActionEvent", {
      tool_call_id: "call1",
      tool_name: "bash",
      action: { command: "ls" },
    });
    assert.deepEqual(translateOpenhandsEvent(event), {
      type: "tool_start",
      callId: "call1",
      name: "bash",
      args: { command: "ls" },
    });
  });

  it("translates an ObservationEvent into tool_end", () => {
    const event = baseEvent("ObservationEvent", {
      tool_call_id: "call1",
      tool_name: "bash",
      observation: "file1\nfile2",
    });
    assert.deepEqual(translateOpenhandsEvent(event), {
      type: "tool_end",
      callId: "call1",
      name: "bash",
      result: "file1\nfile2",
    });
  });

  it("translates an AgentErrorEvent into error", () => {
    const event = baseEvent("AgentErrorEvent", { error: "tool crashed" });
    assert.deepEqual(translateOpenhandsEvent(event), { type: "error", message: "tool crashed" });
  });

  it("translates a ConversationErrorEvent into error", () => {
    const event = baseEvent("ConversationErrorEvent", { detail: "session lost" });
    assert.deepEqual(translateOpenhandsEvent(event), { type: "error", message: "session lost" });
  });

  it("returns null for unrecognized event kinds", () => {
    const event = baseEvent("ThinkEvent", { thought: "pondering" });
    assert.equal(translateOpenhandsEvent(event), null);
  });
});
