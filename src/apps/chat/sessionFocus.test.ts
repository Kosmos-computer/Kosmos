import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mayFallbackActivityToActiveSession,
  shouldActivateOnSessionEvent,
} from "./sessionFocus.js";

const DRAFT = "__draft__";

describe("shouldActivateOnSessionEvent", () => {
  it("activates when the user is still on the stream owner", () => {
    assert.equal(
      shouldActivateOnSessionEvent({
        streamOwnerKey: "sess-a",
        activeKey: "sess-a",
        draftKey: DRAFT,
      }),
      true,
    );
  });

  it("activates when still on draft at session-event time", () => {
    assert.equal(
      shouldActivateOnSessionEvent({
        streamOwnerKey: DRAFT,
        activeKey: DRAFT,
        draftKey: DRAFT,
      }),
      true,
    );
  });

  it("does not steal focus after the user switched away (cloud race)", () => {
    assert.equal(
      shouldActivateOnSessionEvent({
        streamOwnerKey: "sess-a",
        activeKey: "sess-b",
        draftKey: DRAFT,
      }),
      false,
    );
  });

  it("does not steal focus when draft stream finishes after New chat", () => {
    assert.equal(
      shouldActivateOnSessionEvent({
        streamOwnerKey: DRAFT,
        activeKey: "sess-new",
        draftKey: DRAFT,
      }),
      false,
    );
  });
});

describe("mayFallbackActivityToActiveSession", () => {
  it("requires an explicit session key", () => {
    assert.equal(mayFallbackActivityToActiveSession(null), false);
    assert.equal(mayFallbackActivityToActiveSession(undefined), false);
    assert.equal(mayFallbackActivityToActiveSession(""), false);
    assert.equal(mayFallbackActivityToActiveSession("sess-a"), true);
  });
});
