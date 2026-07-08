#!/usr/bin/env node
/**
 * Exit 0 when desktop-relevant files changed since the latest desktop-v* tag.
 * Exit 1 when there is nothing new to ship (CI should skip the release job).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const pathsFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "desktop-release-paths.json");
const prefixes = JSON.parse(fs.readFileSync(pathsFile, "utf8"));

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

function changedFilesSince(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const out = execSync(`git diff --name-only ${range}`, {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  return out ? out.split("\n").filter(Boolean) : [];
}

function matchesPrefix(file, prefix) {
  if (prefix.endsWith("/")) return file.startsWith(prefix) || file === prefix.slice(0, -1);
  return file === prefix || file.startsWith(`${prefix}/`);
}

const lastTag = latestDesktopTag();
const changed = changedFilesSince(lastTag);
const relevant = changed.filter((file) => prefixes.some((prefix) => matchesPrefix(file, prefix)));

if (relevant.length === 0) {
  console.log(
    lastTag
      ? `[desktop-release] no desktop-relevant changes since ${lastTag}; skipping`
      : "[desktop-release] no tracked file changes; skipping",
  );
  process.exit(1);
}

console.log(`[desktop-release] ${relevant.length} desktop-relevant file(s) changed since ${lastTag ?? "initial commit"}`);
for (const file of relevant.slice(0, 20)) console.log(`  - ${file}`);
if (relevant.length > 20) console.log(`  … and ${relevant.length - 20} more`);
