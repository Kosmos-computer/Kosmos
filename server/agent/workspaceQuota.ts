/**
 * Sandbox workspace disk quota — ARCO_WORKSPACE_QUOTA_MB, default 512.
 *
 * Applies only when the agent's active root is the sandbox workspace
 * (dataDirs.workspace): that's the hosted-instance case, where exec/file
 * tools share a small per-tenant volume. When a user opens a real project
 * folder on desktop the quota is deliberately inert — their repo can be any
 * size. The volume itself is the physical backstop; this keeps the agent
 * from filling it and taking sessions/SQLite down with it.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { dataDirs } from "../env.js";
import { getActiveRoot } from "../stores/workspaceStore.js";

const DEFAULT_QUOTA_MB = 512;
const CACHE_MS = 15_000;

let cache: { at: number; bytes: number } | null = null;

export function quotaLimitBytes(): number {
  const raw = Number(process.env.ARCO_WORKSPACE_QUOTA_MB ?? DEFAULT_QUOTA_MB);
  const mb = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_QUOTA_MB;
  return mb * 1024 * 1024;
}

export function quotaApplies(): boolean {
  return getActiveRoot() === dataDirs.workspace;
}

/** Drop the cached size after anything that may have written files. */
export function invalidateWorkspaceUsage(): void {
  cache = null;
}

export async function workspaceUsageBytes(): Promise<number> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.bytes;
  let bytes = 0;
  const stack = [dataDirs.workspace];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) stack.push(full);
      else {
        const stat = await fs.stat(full).catch(() => null);
        if (stat) bytes += stat.size;
      }
    }
  }
  cache = { at: Date.now(), bytes };
  return bytes;
}

const toMb = (bytes: number) => Math.round(bytes / (1024 * 1024));

/**
 * Gate a pending write of `incomingBytes`. Returns an error message the tool
 * can hand straight back to the LLM (which relays it to the user).
 */
export async function checkWorkspaceQuota(
  incomingBytes = 0,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!quotaApplies()) return { ok: true };
  const used = await workspaceUsageBytes();
  const limit = quotaLimitBytes();
  if (used + incomingBytes <= limit) return { ok: true };
  return {
    ok: false,
    error:
      `Workspace disk quota exceeded: ${toMb(used)}MB used of ${toMb(limit)}MB ` +
      `(write of ${toMb(incomingBytes)}MB refused). Delete files from the ` +
      `workspace to free space.`,
  };
}
