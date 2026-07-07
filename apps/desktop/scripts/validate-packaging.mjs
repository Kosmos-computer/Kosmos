#!/usr/bin/env node
/**
 * Fail the electron-builder run when required release artifacts are missing.
 * Run from repo root via: node apps/desktop/scripts/validate-packaging.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const required = [
  { id: "ui", path: "dist/index.html", hint: "Run npm run build from the repo root." },
  { id: "docs", path: "apps/docs/dist/index.html", hint: "Run npm run build:apps (included in npm run build)." },
  { id: "app_prompt", path: "server/generated/app-prompt.md", hint: "Run npm run generate (or npm run setup)." },
  { id: "chat_prompt", path: "server/generated/chat-prompt.md", hint: "Run npm run generate (or npm run setup)." },
];

const missing = required.filter(({ path: relativePath }) => !fs.existsSync(path.join(repoRoot, relativePath)));

if (missing.length === 0) {
  console.log("✓ Desktop packaging prerequisites present");
  process.exit(0);
}

console.error("Desktop packaging validation failed. Missing required artifacts:\n");
for (const item of missing) {
  console.error(`  • ${item.path}`);
  console.error(`    ${item.hint}\n`);
}
console.error("Build a release with: npm run dist:desktop");
process.exit(1);
