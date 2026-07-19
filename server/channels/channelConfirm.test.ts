import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseApproveCommand } from "./channelConfirm.js";

describe("parseApproveCommand", () => {
  it("parses approve with short code", () => {
    assert.deepEqual(parseApproveCommand("/approve AB12CD"), {
      approved: true,
      code: "AB12CD",
    });
  });

  it("parses deny with uuid", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    assert.deepEqual(parseApproveCommand(`/deny ${id}`), {
      approved: false,
      code: id,
    });
  });

  it("ignores normal chat", () => {
    assert.equal(parseApproveCommand("please approve the draft"), null);
  });
});
