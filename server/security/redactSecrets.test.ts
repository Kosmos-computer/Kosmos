import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactSecretsInText } from "./redactSecrets.js";

describe("redactSecretsInText", () => {
  it("strips LiteLLM key-echo phrases", () => {
    const raw =
      'Authentication Error, Invalid proxy server token passed. Received API Key = sk-abc123xyz7051, Key Hash (Token) =d8dc8e1f222a5396c889cc097db2150ff3514ae61cdb389e1d827806fd4e0b1c';
    const out = redactSecretsInText(raw);
    assert.equal(out.includes("sk-"), false);
    assert.equal(out.includes("Received API Key"), false);
    assert.equal(out.includes("d8dc8e1f"), false);
    assert.match(out, /\[redacted\]/);
  });

  it("strips bearer tokens", () => {
    const out = redactSecretsInText("upstream said Authorization: Bearer tok_live_abcdef012345");
    assert.equal(out.includes("tok_live"), false);
  });
});
