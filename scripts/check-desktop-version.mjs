#!/usr/bin/env node
/**
 * Verify desktop version tracking is consistent across VERSION, package.json, and git tags.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const versionFile = path.join(repoRoot, "apps/desktop/VERSION");
const targets = [
  path.join(repoRoot, "package.json"),
  path.join(repoRoot, "apps/desktop/package.json"),
];

function readVersionFile() {
  return fs.readFileSync(versionFile, "utf8").trim();
}

function readPackageVersion(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")).version;
}

function latestDesktopTag() {
  try {
    const out = execSync('git tag -l "desktop-v*" --sort=-v:refname', {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    return out.split("\n").find(Boolean) ?? null;
  } catch {
    return null;
  }
}

const version = readVersionFile();
const errors = [];

for (const target of targets) {
  const pkgVersion = readPackageVersion(target);
  if (pkgVersion !== version) {
    errors.push(`${path.relative(repoRoot, target)} is ${pkgVersion}, expected ${version} from apps/desktop/VERSION`);
  }
}

const lastTag = latestDesktopTag();
if (lastTag) {
  const tagVersion = lastTag.replace(/^desktop-v/, "");
  if (tagVersion !== version) {
    console.warn(
      `[version] note: latest release tag ${lastTag} differs from apps/desktop/VERSION (${version}). ` +
        "This is expected until CI commits the post-release bump.",
    );
  }
}

if (errors.length > 0) {
  console.error("[version] desktop version mismatch:");
  for (const error of errors) console.error(`  - ${error}`);
  console.error("[version] run: npm run version:sync");
  process.exit(1);
}

console.log(`[version] ok — desktop ${version}`);
