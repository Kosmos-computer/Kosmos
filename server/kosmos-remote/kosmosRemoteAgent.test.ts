import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSseLines } from "./kosmosRemoteAgent.js";

describe("parseSseLines", () => {
  it("parses a single data line into an AgentEvent", () => {
    const events = parseSseLines(['data: {"type":"text_delta","delta":"hi"}']);
    assert.deepEqual(events, [{ type: "text_delta", delta: "hi" }]);
  });

  it("parses multiple data lines in order", () => {
    const events = parseSseLines([
      'data: {"type":"session","sessionId":"s1"}',
      'data: {"type":"text_delta","delta":"a"}',
      'data: {"type":"text_delta","delta":"b"}',
    ]);
    assert.deepEqual(events, [
      { type: "session", sessionId: "s1" },
      { type: "text_delta", delta: "a" },
      { type: "text_delta", delta: "b" },
    ]);
  });

  it("ignores non-data lines and blank data payloads", () => {
    const events = parseSseLines(["", "event: ping", "data:", 'data: {"type":"done"}']);
    assert.deepEqual(events, [{ type: "done" }]);
  });

  it("skips malformed JSON without throwing", () => {
    const events = parseSseLines(["data: {not json", 'data: {"type":"done"}']);
    assert.deepEqual(events, [{ type: "done" }]);
  });

  it("returns an empty array for no data lines", () => {
    assert.deepEqual(parseSseLines([]), []);
  });
});
