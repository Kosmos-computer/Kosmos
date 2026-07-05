/**
 * MCP supervisor — owns the lifecycle of every configured server: connect on
 * boot, reconnect on edit, retry with backoff on crash, and report status to
 * the Settings panel. The runManager pattern grown up.
 *
 * Failure isolation is the design rule: a dead server never takes the agent
 * loop down — its tools simply drop out of the next assembly, and Settings
 * shows the error until a manual restart (or the backoff succeeds).
 */
import type { McpServerInfo, McpServerStatus, McpToolInfo } from "../../shared/types.js";
import { bus } from "../bus.js";
import { connectMcp, type McpConnection } from "./client.js";
import { maskConfig, mcpServerStore } from "./serverStore.js";

interface Entry {
  status: McpServerStatus;
  conn?: McpConnection;
  error?: string;
  /** Consecutive failed (re)connects — drives backoff, capped at MAX_RETRIES. */
  retries: number;
  retryTimer?: ReturnType<typeof setTimeout>;
}

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2_000;

const entries = new Map<string, Entry>();

function emitChanged(): void {
  bus.emit("mcp_changed");
}

function entry(id: string): Entry {
  let e = entries.get(id);
  if (!e) {
    e = { status: "stopped", retries: 0 };
    entries.set(id, e);
  }
  return e;
}

async function disconnect(id: string): Promise<void> {
  const e = entries.get(id);
  if (!e) return;
  if (e.retryTimer) clearTimeout(e.retryTimer);
  e.retryTimer = undefined;
  if (e.conn) {
    // onclose fires during an intentional close too — the "stopped" status
    // set below tells the handler not to schedule a reconnect.
    const conn = e.conn;
    e.conn = undefined;
    e.status = "stopped";
    await conn.close().catch(() => {});
  }
  e.status = "stopped";
  e.error = undefined;
  e.retries = 0;
}

async function connect(id: string): Promise<void> {
  const cfg = mcpServerStore.get(id);
  if (!cfg || !cfg.enabled) return;
  const e = entry(id);
  if (e.retryTimer) clearTimeout(e.retryTimer);
  e.status = "connecting";
  emitChanged();
  try {
    const conn = await connectMcp(cfg);
    e.conn = conn;
    e.status = "running";
    e.error = undefined;
    e.retries = 0;

    // Unexpected close (server crash) → backoff reconnect, unless we closed
    // it ourselves (status already flipped to "stopped" by disconnect()).
    conn.client.onclose = () => {
      if (e.status !== "running" || e.conn !== conn) return;
      e.conn = undefined;
      e.status = "error";
      e.error = "Connection closed unexpectedly";
      scheduleRetry(id);
      emitChanged();
    };
    emitChanged();
  } catch (err) {
    e.conn = undefined;
    e.status = "error";
    e.error = err instanceof Error ? err.message : "Connect failed";
    scheduleRetry(id);
    emitChanged();
  }
}

function scheduleRetry(id: string): void {
  const e = entry(id);
  if (e.retries >= MAX_RETRIES) return; // stay in error until manual restart
  e.retries += 1;
  const delay = BACKOFF_BASE_MS * 2 ** (e.retries - 1);
  e.retryTimer = setTimeout(() => void connect(id), delay);
}

export const mcpSupervisor = {
  /** Boot: connect every enabled server in parallel, failures isolated. */
  async start(): Promise<void> {
    await Promise.all(
      mcpServerStore
        .list()
        .filter((s) => s.enabled)
        .map((s) => connect(s.id)),
    );
  },

  /** Reconcile one server with its stored config (after add/edit/toggle). */
  async sync(id: string): Promise<void> {
    await disconnect(id);
    const cfg = mcpServerStore.get(id);
    if (cfg?.enabled) await connect(id);
    else emitChanged();
  },

  /** Manual restart — also resets the retry budget. */
  async restart(id: string): Promise<void> {
    await disconnect(id);
    await connect(id);
  },

  async remove(id: string): Promise<void> {
    await disconnect(id);
    entries.delete(id);
    emitChanged();
  },

  /** Live connections for the tool adapter (enabled + running only). */
  connections(): { id: string; conn: McpConnection }[] {
    const out: { id: string; conn: McpConnection }[] = [];
    for (const [id, e] of entries) {
      if (e.status === "running" && e.conn) out.push({ id, conn: e.conn });
    }
    return out;
  },

  /** Everything the Settings panel needs, config secrets masked. */
  list(): McpServerInfo[] {
    return mcpServerStore.list().map((cfg) => {
      const e = entries.get(cfg.id);
      const tools: McpToolInfo[] = e?.conn?.tools ?? [];
      return {
        config: maskConfig(cfg),
        status: e?.status ?? "stopped",
        ...(e?.error ? { error: e.error } : {}),
        tools,
      };
    });
  },
};
