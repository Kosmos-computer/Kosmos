#!/usr/bin/env node
/**
 * Sync apps/desktop/VERSION into package.json files that define the shipped app version.
 *
 * Usage:
 *   node scripts/sync-desktop-version.mjs           # read VERSION, update package.json files
 *   node scripts/sync-desktop-version.mjs --set 0.2.0  # write VERSION then sync
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const versionFile = path.join(repoRoot, "apps/desktop/VERSION");
const targets = [
  path.join(repoRoot, "package.json"),
  path.join(repoRoot, "apps/desktop/package.json"),
];

function parseVersion(value) {
  const version = value.trim();
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid semver: ${value}`);
  }
  return version;
}

function readVersionFile() {
  return parseVersion(fs.readFileSync(versionFile, "utf8"));
}

function writeVersionFile(version) {
  fs.writeFileSync(versionFile, `${version}\n`, "utf8");
}

function setPackageVersion(filePath, version) {
  const pkg = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (pkg.version === version) return false;
  pkg.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  return true;
}

const setArg = process.argv.find((arg) => arg.startsWith("--set="))?.slice("--set=".length)
  ?? (process.argv.includes("--set") ? process.argv[process.argv.indexOf("--set") + 1] : null);

const version = setArg ? parseVersion(setArg) : readVersionFile();
if (setArg) writeVersionFile(version);

let changed = setArg ? true : false;
for (const target of targets) {
  if (setPackageVersion(target, version)) changed = true;
}

console.log(`[version] desktop version ${version}${changed ? " (synced)" : " (already in sync)"}`);
