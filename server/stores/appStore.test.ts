import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

let tempDir = "";

before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "arco-appstore-test-"));
  process.env.ARCO_DATA_DIR = tempDir;
  const { ensureDataDirs } = await import("../env.js");
  ensureDataDirs();
});

after(async () => {
  delete process.env.ARCO_DATA_DIR;
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("appStore", () => {
  it("normalizes titles for matching", async () => {
    const { normalizeAppTitle } = await import("./appStore.js");
    assert.equal(normalizeAppTitle("  Live   Clock "), "live clock");
    assert.equal(normalizeAppTitle("Live_Clock"), "live clock");
  });

  it("upserts create by normalized title instead of minting duplicates", async () => {
    const { appStore } = await import("./appStore.js");
    const first = await appStore.create({
      title: "Live Clock",
      content: "root = TextContent(\"v1\")",
      sessionId: "s1",
    });
    assert.equal(first.reused, false);

    const second = await appStore.create({
      title: "live  clock",
      content: "root = TextContent(\"v2\")",
      sessionId: "s2",
    });
    assert.equal(second.reused, true);
    assert.equal(second.id, first.id);
    assert.equal(second.content, "root = TextContent(\"v2\")");

    const listed = await appStore.list();
    assert.equal(listed.filter((a) => a.title.toLowerCase().includes("clock")).length, 1);
  });

  it("forceNew mints a separate app with the same title", async () => {
    const { appStore } = await import("./appStore.js");
    const first = await appStore.create({
      title: "Timer",
      content: "root = TextContent(\"a\")",
      sessionId: "s1",
    });
    const second = await appStore.create(
      {
        title: "Timer",
        content: "root = TextContent(\"b\")",
        sessionId: "s1",
      },
      { forceNew: true },
    );
    assert.equal(second.reused, false);
    assert.notEqual(second.id, first.id);
  });

  it("dedupeByTitle keeps newest and removes older siblings", async () => {
    const { appStore } = await import("./appStore.js");
    const older = await appStore.create(
      {
        title: "Notes Clone",
        content: "root = TextContent(\"old\")",
        sessionId: "s1",
      },
      { forceNew: true },
    );
    // Ensure a later updatedAt than `older`.
    await new Promise((r) => setTimeout(r, 5));
    const newer = await appStore.create(
      {
        title: "Notes Clone",
        content: "root = TextContent(\"new\")",
        sessionId: "s1",
      },
      { forceNew: true },
    );
    assert.notEqual(older.id, newer.id);

    const result = await appStore.dedupeByTitle();
    assert.ok(result.removed >= 1);
    assert.ok(result.removedIds.includes(older.id));
    assert.equal(await appStore.get(older.id), null);
    assert.ok(await appStore.get(newer.id));
  });
});
