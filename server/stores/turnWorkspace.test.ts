import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { projectStore } from "./projectStore.js";
import { getPrimaryRoot } from "./workspaceStore.js";
import {
  getTurnWorkspaceRoot,
  resolveRootForProject,
  withSessionWorkspace,
} from "./turnWorkspace.js";

describe("turnWorkspace", () => {
  it("resolveRootForProject falls back to sandbox for unknown ids", () => {
    const root = resolveRootForProject("does-not-exist");
    assert.ok(typeof root === "string" && root.length > 0);
  });

  it("withSessionWorkspace binds getTurnWorkspaceRoot for tagged sessions", async () => {
    assert.equal(getTurnWorkspaceRoot(), null);
    await withSessionWorkspace("proj-missing", async () => {
      const root = getTurnWorkspaceRoot();
      assert.ok(root);
      assert.equal(root, resolveRootForProject("proj-missing"));
    });
    assert.equal(getTurnWorkspaceRoot(), null);
  });

  it("withSessionWorkspace does not override when projectId is null", async () => {
    await withSessionWorkspace(null, async () => {
      assert.equal(getTurnWorkspaceRoot(), null);
    });
  });

  it("getPrimaryRoot prefers the turn workspace override", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arco-turn-ws-"));
    const project = projectStore.add(dir);
    try {
      const outside = getPrimaryRoot();
      assert.notEqual(outside, project.path);
      await withSessionWorkspace(project.id, async () => {
        assert.equal(getPrimaryRoot(), project.path);
      });
      assert.equal(getPrimaryRoot(), outside);
    } finally {
      projectStore.remove(project.id);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
