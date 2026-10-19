/**
 * The proxy's pure rules: one request type, loopback upstream, cookie parse.
 * The live socket is proved in the browser against `kosmos serve`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENGINE_UPSTREAM_TIMEOUT_MS, engineWsUrl, frameRequest, readCookie } from "./kosmosEngineProxy.js";

describe("frameRequest", () => {
  it("keeps a screenshot and forces inline delivery", () => {
    const out = frameRequest(JSON.stringify({
      t: "screenshot",
      id: 2,
      w: 640,
      h: 360,
      path: "/tmp/shot.png",
      camera: { p: [0, 2.6, 6], target: [0, 1, 0], fov: 45 },
    }));
    assert.ok(out);
    const msg = JSON.parse(out) as Record<string, unknown>;
    assert.equal(msg.t, "screenshot");
    assert.equal(msg.id, 2);
    assert.equal(msg.inline, true);
    assert.equal("path" in msg, false);
    assert.deepEqual(msg.camera, { p: [0, 2.6, 6], target: [0, 1, 0], fov: 45 });
  });

  it("drops every other protocol request", () => {
    for (const text of [
      '{"t":"load","scene":"/etc/passwd"}',
      '{"t":"step","ticks":1}',
      '{"t":"quit"}',
      '{"t":"command","name":"scene.set_component"}',
      "not json",
      "[]",
      "null",
    ]) {
      assert.equal(frameRequest(text), null, text);
    }
  });
});

describe("engineWsUrl", () => {
  it("accepts loopback and refuses a public host", () => {
    assert.equal(engineWsUrl("ws://127.0.0.1:5800"), "ws://127.0.0.1:5800/");
    assert.equal(engineWsUrl("ws://localhost:5800"), "ws://localhost:5800/");
    assert.throws(() => engineWsUrl("ws://example.com:5800"), /loopback/);
    assert.throws(() => engineWsUrl("http://127.0.0.1:5800"), /WebSocket/);
  });
});

describe("ENGINE_UPSTREAM_TIMEOUT_MS", () => {
  it("gives up quickly when the engine port hangs", () => {
    assert.equal(ENGINE_UPSTREAM_TIMEOUT_MS, 2000);
  });
});

describe("readCookie", () => {
  it("reads the named cookie", () => {
    assert.equal(readCookie("a=1; arco_session=abc; b=2", "arco_session"), "abc");
    assert.equal(readCookie(undefined, "arco_session"), undefined);
  });
});
