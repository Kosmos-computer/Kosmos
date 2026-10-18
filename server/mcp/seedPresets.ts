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
  seedBridgeServers();
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

/**
 * Plane's MCP server, when the host has told us where it is.
 * The token stays in the environment (ARCO_PLANE_MCP_TOKEN or PLANE_PAT)
 * and is copied into the MCP record the same way other MCP headers are.
 * A second boot does not overwrite a record that is already there.
 */
export function seedBridgeServers(): { plane: boolean } {
  const url = process.env.ARCO_PLANE_MCP_URL?.trim();
  const token = process.env.ARCO_PLANE_MCP_TOKEN?.trim() || process.env.PLANE_PAT?.trim();
  const workspace = process.env.ARCO_PLANE_MCP_WORKSPACE?.trim() || "kosmos";
  if (!url || !token) return { plane: false };
  if (mcpServerStore.list().some((s) => s.id === "plane" || s.name === "Plane")) {
    return { plane: false };
  }
  mcpServerStore.add({
    name: "Plane",
    transport: {
      kind: "http",
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Workspace-Slug": workspace,
      },
    },
  });
  return { plane: true };
}
