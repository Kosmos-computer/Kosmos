/**
 * The session decides attach vs spawn without starting a real engine.
 * Probes and process launch are injected.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  closeEngine,
  engineQuery,
  isReadRequest,
  openEngine,
  resetEngineForTests,
  setEngineHooks,
  type EngineHooks,
} from "./session.js";

const saved = { ...process.env };

afterEach(() => {
  resetEngineForTests();
  for (const key of Object.keys(process.env)) {
    if (!(key in saved)) delete process.env[key];
  }
  Object.assign(process.env, saved);
});

function hooks(partial: Partial<EngineHooks> & { listening?: boolean }): EngineHooks & { starts: string[][] } {
  const starts: string[][] = [];
  let listening = partial.listening ?? false;
  const api: EngineHooks & { starts: string[][] } = {
    starts,
    probe: async () => listening,
    start: (command, args) => {
      starts.push([command, ...args]);
      listening = true;
      return {
        pid: 42,
        kill: () => {
          listening = false;
        },
      };
    },
    // kosmos-mcp stays missing so a test open does not write the MCP store.
    lookup: (bin) => (bin === "kosmos-mcp" ? null : `/bin/${bin}`),
    ...partial,
  };
  return api;
}

describe("engine session", () => {
  it("treats query and hash as reads and step as a call", () => {
    assert.equal(isReadRequest("query"), true);
    assert.equal(isReadRequest("hash"), true);
    assert.equal(isReadRequest("step"), false);
  });

  it("attaches when the port is already open and does not spawn", async () => {
    const h = hooks({ listening: true });
    setEngineHooks(h);
    process.env.KOSMOS_ENGINE_WINDOW = "0";
    const status = await openEngine();
    assert.equal(status.listening, true);
    assert.equal(status.owned, false);
    assert.equal(h.starts.length, 0);
    const closed = await closeEngine();
    assert.equal(closed.stopped, false);
  });

  it("starts the game window when a display and kosmos-app exist", async () => {
    const h = hooks({ listening: false });
    setEngineHooks(h);
    process.env.KOSMOS_ENGINE_WINDOW = "1";
    process.env.KOSMOS_ENGINE_PORT = "5800";
    delete process.env.KOSMOS_ENGINE_URL;
    const status = await openEngine();
    assert.equal(status.listening, true);
    assert.equal(status.owned, true);
    assert.equal(status.window, true);
    assert.deepEqual(h.starts[0], ["/bin/kosmos-app", "--serve-port", "5800"]);
    const closed = await closeEngine();
    assert.equal(closed.stopped, true);
  });

  it("starts kosmos serve when there is no display", async () => {
    const h = hooks({ listening: false });
    setEngineHooks(h);
    process.env.KOSMOS_ENGINE_WINDOW = "0";
    process.env.KOSMOS_ENGINE_SCENE = "tests/scenes/box-drop.scene.json";
    const status = await openEngine();
    assert.match(status.windowNote ?? "", /headless/);
    assert.deepEqual(h.starts[0]?.slice(1), [
      "serve",
      "--port",
      "5800",
      "--scene",
      "tests/scenes/box-drop.scene.json",
    ]);
  });

  it("refuses to spawn when the binaries are missing", async () => {
    const h = hooks({ listening: false, lookup: () => null });
    setEngineHooks(h);
    process.env.KOSMOS_ENGINE_WINDOW = "0";
    const status = await openEngine();
    assert.match(status.error ?? "", /not on PATH/);
    assert.equal(h.starts.length, 0);
  });

  it("does not spawn when KOSMOS_ENGINE_SPAWN=0", async () => {
    const h = hooks({ listening: false });
    setEngineHooks(h);
    process.env.KOSMOS_ENGINE_SPAWN = "0";
    const status = await openEngine();
    assert.match(status.error ?? "", /nothing is listening/);
    assert.equal(h.starts.length, 0);
  });

  it("rejects a step sent through engine.query", async () => {
    setEngineHooks(hooks({ listening: true }));
    await assert.rejects(() => engineQuery({ request: { t: "step", ticks: 1 } }), /engine.call/);
  });
});
