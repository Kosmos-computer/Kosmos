import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactSecrets, redactSecretsDeep } from "./redactSecrets.js";

describe("redactSecrets", () => {
  it("redacts OpenAI-style API keys", () => {
    const s = redactSecrets("key=sk-proj-abcdefghijklmnopqrstuvwxyz012345");
    assert.equal(s.includes("sk-proj"), false);
    assert.match(s, /\[REDACTED\]/);
  });

  it("redacts Bearer tokens", () => {
    assert.equal(redactSecrets("Authorization: Bearer abc.def.ghi_jkl"), "Authorization: Bearer [REDACTED]");
  });

  it("redacts GitHub PATs", () => {
    const s = redactSecrets("token ghp_abcdefghijklmnopqrstuvwxyz0123456789");
    assert.equal(s.includes("ghp_"), false);
  });

  it("redacts Stripe secrets", () => {
    const s = redactSecrets("sk_live_51AbCdEfGhIjKlMnOpQrStUvWx");
    assert.match(s, /\[REDACTED\]/);
    assert.equal(s.includes("sk_live_51"), false);
  });

  it("redacts JSON apiKey fields", () => {
    const s = redactSecrets('{"apiKey":"super-secret-value","model":"gpt"}');
    assert.match(s, /"apiKey":"\[REDACTED\]"/);
    assert.match(s, /"model":"gpt"/);
  });

  it("leaves ordinary text alone", () => {
    assert.equal(redactSecrets("hello world schedule 0 9 * * *"), "hello world schedule 0 9 * * *");
  });
});

describe("redactSecretsDeep", () => {
  it("masks secret-named object fields", () => {
    const out = redactSecretsDeep({
      apiKey: "sk-abc",
      model: "gpt",
      nested: { refresh_token: "rt_xyz", ok: true },
    }) as Record<string, unknown>;
    assert.equal(out.apiKey, "[REDACTED]");
    assert.equal(out.model, "gpt");
    assert.equal((out.nested as Record<string, unknown>).refresh_token, "[REDACTED]");
    assert.equal((out.nested as Record<string, unknown>).ok, true);
  });
});
