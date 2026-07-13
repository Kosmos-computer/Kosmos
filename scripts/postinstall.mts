#!/usr/bin/env tsx
/**
 * postinstall hook — on a fresh clone, run the lightweight part of setup so
 * `npm run dev` works immediately after npm install. Skips when CI is set or
 * when the install marker already exists and bundled apps are built.
 */
import { spawnSync } from "node:child_process";
import {
  REPO_ROOT,
  checkDocsAppBuild,
  checkGeneratedPrompts,
  isInstallMarkedComplete,
} from "./lib/installChecks.js";

if (process.env.CI || process.env.ARCO_SKIP_POSTINSTALL === "1") {
  process.exit(0);
}

const promptsOk = checkGeneratedPrompts().ok;
const docsOk = checkDocsAppBuild().ok;
const marked = isInstallMarkedComplete();

if (marked && promptsOk && docsOk) {
  process.exit(0);
}

const result = spawnSync("npm", ["run", "setup", "--", "--skip-npm"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 0);
