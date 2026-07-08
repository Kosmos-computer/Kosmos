#!/usr/bin/env node
/**
 * Compute the next desktop release version from git tags (desktop-v*).
 *
 * Usage:
 *   node next-desktop-version.mjs            # patch bump (default)
 *   node next-desktop-version.mjs --bump minor
 *   node next-desktop-version.mjs --print-tag
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const desktopPkgPath = path.join(repoRoot, "apps/desktop/package.json");

function readPackageVersion() {
  return JSON.parse(fs.readFileSync(desktopPkgPath, "utf8")).version;
}

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid semver: ${value}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatVersion(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
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

function bump(version, kind) {
  const parts = parseVersion(version);
  if (kind === "major") {
    parts.major += 1;
    parts.minor = 0;
    parts.patch = 0;
  } else if (kind === "minor") {
    parts.minor += 1;
    parts.patch = 0;
  } else {
    parts.patch += 1;
  }
  return formatVersion(parts);
}

const args = process.argv.slice(2);
const bumpFlag = args.find((arg) => arg.startsWith("--bump="))?.slice("--bump=".length)
  ?? (args.includes("--bump") ? args[args.indexOf("--bump") + 1] : "patch");
const bumpKind = ["patch", "minor", "major"].includes(bumpFlag) ? bumpFlag : "patch";
const printTagOnly = args.includes("--print-tag");

const lastTag = latestDesktopTag();
const baseVersion = lastTag ? lastTag.replace(/^desktop-v/, "") : readPackageVersion();
const nextVersion = bump(baseVersion, bumpKind);
const tag = `desktop-v${nextVersion}`;

if (printTagOnly) {
  process.stdout.write(tag);
} else {
  process.stdout.write(`${nextVersion}\n`);
}
