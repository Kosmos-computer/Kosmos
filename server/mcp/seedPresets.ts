/**
 * Seed default MCP servers (Kosmos Ops) when ops mode is enabled and none exist.
 */
import type { McpTransport } from "../../shared/types.js";
import { MCP_PRESETS } from "../../shared/types.js";
import { mcpServerStore } from "./serverStore.js";

export function kosmosOpsTransport(): McpTransport {
  return (
    MCP_PRESETS.find((p) => p.id === "kosmos-ops")?.transport ?? {
      kind: "stdio",
      command: "node",
      args: ["--import", "tsx/esm", "scripts/kosmos-ops-mcp.ts"],
    }
  );
}

/** Ensure Kosmos Ops MCP is registered — idempotent. Returns true if added. */
export function seedMcpPresets(): boolean {
  const enable =
    process.env.ARCO_OPS_ENABLED === "1" ||
    Boolean(process.env.ARCO_COOLIFY_APPS_DIR?.trim()) ||
    process.env.ARCO_SEED_OPS_MCP === "1";

  if (!enable) return false;

  const list = mcpServerStore.list();
  if (list.some((s) => s.id === "kosmos-ops")) return false;

  mcpServerStore.add({ name: "Kosmos Ops", transport: kosmosOpsTransport() });
  return true;
}
