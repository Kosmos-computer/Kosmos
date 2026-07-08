#!/usr/bin/env node
/**
 * Set package versions and publish a desktop build to GitHub Releases.
 * Requires GH_TOKEN (or GITHUB_TOKEN) for electron-builder --publish always.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const version = process.env.DESKTOP_VERSION?.trim();

if (!version) {
  console.error("[desktop-release] DESKTOP_VERSION is required");
  process.exit(1);
}

function run(cmd, args, cwd = repoRoot) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`[desktop-release] syncing version ${version}`);
run("node", ["scripts/sync-desktop-version.mjs", "--set", version]);
run("node", ["scripts/verify-signing-config.mjs"], path.join(repoRoot, "apps/desktop"));

console.log(`[desktop-release] building Arco OS ${version}`);
run("npm", ["run", "generate"]);
run("npm", ["run", "build"]);
run("npm", ["run", "build", "-w", "@arco/desktop"]);
run("node", ["scripts/validate-packaging.mjs"], path.join(repoRoot, "apps/desktop"));
run("node", ["scripts/stage-packaging.mjs"], path.join(repoRoot, "apps/desktop"));
run("node", ["scripts/verify-packaging.mjs", "--staged", "--smoke"], path.join(repoRoot, "apps/desktop"));
run("npx", ["electron-builder", "--publish", "always"], path.join(repoRoot, "apps/desktop"));

console.log(`[desktop-release] published desktop-v${version}`);
