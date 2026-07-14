import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";
import { createEntryGate } from "./entryGate.js";

const KEY = "0123456789abcdef0123456789abcdef";

function testApp() {
  const app = new Hono();
  app.use("*", createEntryGate({ key: KEY, secureCookies: true }));
  app.get("/api/private", (c) => c.json({ secret: true }));
  return app;
}

describe("entry gate", () => {
  it("blocks platform routes before the magic URL is visited", async () => {
    const response = await testApp().request("/api/private");

    assert.equal(response.status, 403);
    assert.match(await response.text(), /Private Kosmos/);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });

  it("sets an HttpOnly cookie without exposing the URL key", async () => {
    const app = testApp();
    const entryResponse = await app.request(`/entry/${KEY}`);

    assert.equal(entryResponse.status, 303);
    assert.equal(entryResponse.headers.get("location"), "/");
    const cookie = entryResponse.headers.get("set-cookie") ?? "";
    assert.match(cookie, /^kosmos_entry=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, new RegExp(KEY));

    const response = await app.request("/api/private", {
      headers: { Cookie: cookie.split(";", 1)[0] },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { secret: true });
  });

  it("does not issue a cookie for the wrong URL", async () => {
    const response = await testApp().request(`/entry/${"f".repeat(32)}`);

    assert.equal(response.status, 403);
    assert.equal(response.headers.get("set-cookie"), null);
  });

  it("keeps the health probe available without platform access", async () => {
    const response = await testApp().request("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });

  it("rejects weak configured keys at startup", () => {
    assert.throws(() => createEntryGate({ key: "too-short" }), /at least 32 characters/);
  });
});
