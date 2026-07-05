/**
 * Run manager — long-running processes (dev servers, watchers) that the
 * one-shot exec tool can't host. Each run spawns detached in its own process
 * group inside the active project root, logs to a file, and is killable by
 * group id so child processes (vite, node, python) die with it.
 *
 * State is in-memory: dev servers shouldn't outlive the Arco server, and a
 * restart orphans nothing thanks to detached process groups being killed on
 * stop only. (If Arco crashes, `lsof -ti :PORT | xargs kill` remains the
 * escape hatch — same as any terminal.)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { RunEntry } from "../shared/types.js";
import { dataDirs } from "./env.js";
import { getActiveRoot } from "./stores/projectStore.js";

const LOG_DIR = path.join(dataDirs.root, "run-logs");

interface ManagedRun extends Omit<RunEntry, "alive"> {
  logFile: string;
}

const runs = new Map<string, ManagedRun>();

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function startRun(command: string, cwd?: string): RunEntry {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const id = crypto.randomUUID();
  const logFile = path.join(LOG_DIR, `${id}.log`);
  const log = fs.openSync(logFile, "a");

  // detached puts the child in its own group so stopRun can kill the whole
  // tree (shell + whatever it spawned) with one negative-pid signal.
  const child = spawn(command, {
    shell: true,
    cwd: cwd ?? getActiveRoot(),
    detached: true,
    stdio: ["ignore", log, log],
    env: process.env,
  });
  child.unref();

  const entry: ManagedRun = {
    id,
    command,
    pid: child.pid ?? -1,
    startedAt: new Date().toISOString(),
    logFile,
  };
  runs.set(id, entry);
  return { ...entry, alive: true };
}

export function listRuns(): RunEntry[] {
  return [...runs.values()].map((r) => ({ ...r, alive: isAlive(r.pid) }));
}

export function stopRun(id: string): boolean {
  const run = runs.get(id);
  if (!run) return false;
  try {
    process.kill(-run.pid, "SIGTERM");
  } catch {
    // Already dead — fall through to cleanup.
  }
  runs.delete(id);
  return true;
}

/** Last chunk of a run's log — enough to see startup output or a crash. */
export function runLog(id: string, maxBytes = 8_000): string {
  const run = runs.get(id);
  if (!run) return "";
  try {
    const content = fs.readFileSync(run.logFile, "utf-8");
    return content.slice(-maxBytes);
  } catch {
    return "";
  }
}
