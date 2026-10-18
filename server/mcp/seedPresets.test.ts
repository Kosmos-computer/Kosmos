/**
 * Plane is seeded from the environment once. A second boot must not
 * duplicate it or replace a record the user already edited.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

let tempDir = "";
const saved = { ...process.env };

before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "arco-mcp-seed-"));
  process.env.ARCO_DATA_DIR = tempDir;
});

after(async () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in saved)) delete process.env[key];
  }
  Object.assign(process.env, saved);
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("seedBridgeServers", () => {
  it("adds Plane when the URL and token are set, and only once", async () => {
    process.env.ARCO_PLANE_MCP_URL = "http://plane-mcp:8211/http/api-key/mcp";
    process.env.ARCO_PLANE_MCP_TOKEN = "test-token";
    process.env.ARCO_PLANE_MCP_WORKSPACE = "kosmos";
    const { seedBridgeServers } = await import("./seedPresets.js");
    const { mcpServerStore } = await import("./serverStore.js");
    assert.equal(seedBridgeServers().plane, true);
    assert.equal(seedBridgeServers().plane, false);
    const plane = mcpServerStore.get("plane");
    assert.ok(plane);
    assert.equal(plane.transport.kind, "http");
    if (plane.transport.kind !== "http") return;
    assert.equal(plane.transport.url, "http://plane-mcp:8211/http/api-key/mcp");
    assert.equal(plane.transport.headers?.Authorization, "Bearer test-token");
    assert.equal(plane.transport.headers?.["X-Workspace-Slug"], "kosmos");
  });

  it("does not add a second Plane when the token is missing", async () => {
    delete process.env.ARCO_PLANE_MCP_TOKEN;
    delete process.env.PLANE_PAT;
    const { seedBridgeServers } = await import("./seedPresets.js");
    const { mcpServerStore } = await import("./serverStore.js");
    const beforeCount = mcpServerStore.list().length;
    assert.equal(seedBridgeServers().plane, false);
    assert.equal(mcpServerStore.list().length, beforeCount);
  });
});
