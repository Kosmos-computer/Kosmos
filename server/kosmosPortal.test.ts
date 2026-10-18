/**
 * The portal catalog is a pure list: the engine, plus installed apps whose
 * pages live on this host. A disabled app and a remote URL stay off it.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPortalTargets, connectPortal, currentPortal, targetForApp } from "./kosmosPortal.js";

describe("targetForApp", () => {
  it("builds a same-origin page url for a bundle", () => {
    assert.deepEqual(targetForApp("core.game", "Game", true, { kind: "bundle", path: "game" }), {
      id: "core.game",
      kind: "app",
      label: "Game",
      url: "/apps/game/index.html",
    });
  });

  it("skips a disabled app, a remote url, and the engine id", () => {
    assert.equal(targetForApp("core.game", "Game", false, { kind: "bundle", path: "game" }), null);
    assert.equal(
      targetForApp("x", "X", true, { kind: "url", url: "https://example.com" }),
      null,
    );
    assert.equal(targetForApp("engine", "Engine", true, { kind: "bundle", path: "engine" }), null);
  });
});

describe("buildPortalTargets", () => {
  it("puts the engine first", () => {
    const targets = buildPortalTargets([
      { id: "core.game", name: "Game", enabled: true, entry: { kind: "bundle", path: "game" } },
    ]);
    assert.deepEqual(
      targets.map((t) => t.id),
      ["engine", "core.game"],
    );
  });
});

describe("connectPortal", () => {
  it("refuses an unknown id and keeps the engine selected", () => {
    assert.equal(connectPortal("no-such-app"), null);
    assert.equal(currentPortal().target.id, "engine");
  });
});
