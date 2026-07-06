import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

let tempDir = "";

before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "arco-automation-test-"));
  process.env.ARCO_DATA_DIR = tempDir;
  const { ensureDataDirs } = await import("../env.js");
  ensureDataDirs();
});

after(async () => {
  delete process.env.ARCO_DATA_DIR;
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("automationStore", () => {
  it("creates schedule automations and paginates list", async () => {
    const { automationStore } = await import("../stores/automationStore.js");
    const created = await automationStore.create({
      name: "Test",
      schedule: "0 9 * * *",
      prompt: "Do the thing",
    });
    assert.equal(created.trigger.type, "schedule");
    assert.equal(created.schedule, "0 9 * * *");

    const list = await automationStore.list({ limit: 10, offset: 0 });
    assert.equal(list.total, 1);
    assert.equal(list.automations[0]?.id, created.id);
  });

  it("records paginated runs separately from automation doc", async () => {
    const { automationStore } = await import("../stores/automationStore.js");
    const { automations } = await automationStore.list({ limit: 1, offset: 0 });
    const automation = automations[0];
    assert.ok(automation);

    await automationStore.recordRun(automation.id, {
      id: "run-1",
      startedAt: new Date().toISOString(),
      status: "ok",
      summary: "done",
      sessionId: "session-1",
    });

    const runs = await automationStore.listRuns(automation.id, { limit: 10, offset: 0 });
    assert.equal(runs.total, 1);
    assert.equal(runs.runs[0]?.summary, "done");
  });

  it("creates event automations with webhook secret", async () => {
    const { automationStore } = await import("../stores/automationStore.js");
    const created = await automationStore.create({
      name: "PR watcher",
      prompt: "Review the PR",
      trigger: { type: "event", source: "github", on: "pull_request.opened" },
    });
    assert.equal(created.trigger.type, "event");
    assert.ok(created.webhookSecret);
  });
});
