import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  isOwnerOnlyMode,
  SECRET_FILE_MODE,
  writeSecureFile,
  writeSecureJson,
  writeSecureJsonAsync,
} from "./secureFs.js";

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arco-secure-fs-"));
  temps.push(dir);
  return dir;
}

describe("secureFs", () => {
  it("writes new JSON with owner-only mode", () => {
    const file = path.join(tempDir(), "secrets.json");
    writeSecureJson(file, { token: "sk-test" });
    const mode = fs.statSync(file).mode;
    assert.equal(isOwnerOnlyMode(mode), true, `expected 0o600, got ${mode.toString(8)}`);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf-8")), { token: "sk-test" });
  });

  it("chmods an existing world-readable file down to owner-only", () => {
    const file = path.join(tempDir(), "settings.json");
    fs.writeFileSync(file, '{"apiKey":"old"}', { mode: 0o644 });
    assert.notEqual((fs.statSync(file).mode & 0o777), SECRET_FILE_MODE);

    writeSecureJson(file, { apiKey: "new" });
    assert.equal(isOwnerOnlyMode(fs.statSync(file).mode), true);
    assert.equal(JSON.parse(fs.readFileSync(file, "utf-8")).apiKey, "new");
  });

  it("writeSecureFileAsync also enforces owner-only mode", async () => {
    const file = path.join(tempDir(), "automations.json");
    await writeSecureJsonAsync(file, { webhookSecret: "whsec_x" });
    assert.equal(isOwnerOnlyMode(fs.statSync(file).mode), true);
  });

  it("writeSecureFile creates nested directories", () => {
    const file = path.join(tempDir(), "nested", "a", "vault.json");
    writeSecureFile(file, "{}");
    assert.equal(fs.existsSync(file), true);
    assert.equal(isOwnerOnlyMode(fs.statSync(file).mode), true);
  });
});
