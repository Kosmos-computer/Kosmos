import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  creditsInsufficientMessage,
  isCreditsInsufficientError,
} from "./creditsError.js";

describe("isCreditsInsufficientError", () => {
  it("detects LiteLLM budget errors", () => {
    assert.equal(isCreditsInsufficientError("Budget has been exceeded"), true);
    assert.equal(isCreditsInsufficientError("User key budget exceeded"), true);
    assert.equal(isCreditsInsufficientError("Insufficient credits"), true);
  });

  it("ignores unrelated errors", () => {
    assert.equal(isCreditsInsufficientError("Connection timeout"), false);
    assert.equal(isCreditsInsufficientError("json.exception.parse_error"), false);
  });
});

describe("creditsInsufficientMessage", () => {
  it("returns a user-facing message", () => {
    assert.match(creditsInsufficientMessage(), /credits/i);
  });
});
