/**
 * Lightweight self-healing loop — restarts failed MCP servers and logs ops
 * health on a timer. Enabled with ARCO_SELF_HEAL=1 (auto-on when Coolify
 * ops mounts are present).
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { dataDirs } from "../env.js";
import { mcpSupervisor } from "../mcp/supervisor.js";
import { getOpsStatus } from "./deployOps.js";

const LOG = path.join(dataDirs.root, "ops-heal.log");
const INTERVAL_MS = Number(process.env.ARCO_SELF_HEAL_INTERVAL_MS ?? 5 * 60_000);

async function appendLog(line: string): Promise<void> {
  const stamp = new Date().toISOString();
  await fsp.appendFile(LOG, `[${stamp}] ${line}\n`).catch(() => {});
}

async function tick(): Promise<void> {
  const status = await getOpsStatus();
  const servers = mcpSupervisor.list();
  const unhealthy = servers.filter((s) => s.config.enabled && s.status === "error");

  if (unhealthy.length > 0) {
    await appendLog(`restarting ${unhealthy.length} MCP server(s): ${unhealthy.map((s) => s.config.id).join(", ")}`);
    for (const s of unhealthy) {
      await mcpSupervisor.restart(s.config.id).catch((err) => {
        void appendLog(`restart failed ${s.config.id}: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  if (!status.dockerAvailable && process.env.ARCO_COOLIFY_APPS_DIR) {
    await appendLog("warn: docker socket missing — build/deploy tools unavailable");
  }
}

export function startSelfHeal(): void {
  const auto = Boolean(process.env.ARCO_COOLIFY_APPS_DIR?.trim());
  if (process.env.ARCO_SELF_HEAL !== "1" && !auto) return;

  fs.mkdirSync(dataDirs.root, { recursive: true });
  void appendLog("self-heal started");
  void tick();
  setInterval(() => void tick(), INTERVAL_MS);
}
