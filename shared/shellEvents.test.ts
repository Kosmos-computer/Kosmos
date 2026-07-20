import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseShellEventPayload } from "./shellEvents.js";

describe("parseShellEventPayload", () => {
  it("parses envelopes with sessionId", () => {
    const parsed = parseShellEventPayload({
      sessionId: "sess-1",
      event: { type: "file_changed", path: "a.ts", before: null, after: "x" },
    });
    assert.ok(parsed);
    assert.equal(parsed.sessionId, "sess-1");
    assert.equal(parsed.event.type, "file_changed");
  });

  it("parses legacy bare AgentEvents as unscoped", () => {
    const parsed = parseShellEventPayload({ type: "apps_changed" });
    assert.ok(parsed);
    assert.equal(parsed.sessionId, null);
    assert.equal(parsed.event.type, "apps_changed");
  });

  it("ignores ping keep-alives", () => {
    assert.equal(parseShellEventPayload({ type: "ping" }), null);
  });
});
