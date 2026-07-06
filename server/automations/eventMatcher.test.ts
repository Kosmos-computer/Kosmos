import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventTriggerMatches, verifyWebhookSecret } from "./eventMatcher.js";

describe("eventMatcher", () => {
  it("matches github pull_request.opened", () => {
    const ok = eventTriggerMatches(
      { type: "event", source: "github", on: "pull_request.opened" },
      {
        headers: { "x-github-event": "pull_request" },
        body: { action: "opened" },
      },
    );
    assert.equal(ok, true);
  });

  it("skips non-matching github events", () => {
    const ok = eventTriggerMatches(
      { type: "event", source: "github", on: "pull_request.opened" },
      {
        headers: { "x-github-event": "pull_request" },
        body: { action: "closed" },
      },
    );
    assert.equal(ok, false);
  });

  it("verifies webhook secret header", () => {
    assert.equal(
      verifyWebhookSecret("secret123", { "x-arco-webhook-signature": "secret123" }, "{}"),
      true,
    );
    assert.equal(
      verifyWebhookSecret("secret123", { "x-arco-webhook-signature": "wrong" }, "{}"),
      false,
    );
  });
});
