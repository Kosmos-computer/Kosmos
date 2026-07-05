/**
 * MCP server config store — the list of external tool servers the user has
 * added, persisted to data/mcp-servers.json. Lifecycle (connecting, retries,
 * status) lives in the supervisor; this file only owns the records.
 *
 * Env values and header values may carry secrets (API tokens), so reads for
 * the client go through mask(): values are replaced with a mask, and a
 * masked value echoed back on update is ignored rather than persisted —
 * the same convention as the LLM API key in settings.json.
 */
import fs from "node:fs";
import path from "node:path";
import type { McpServerConfig, McpTransport } from "../../shared/types.js";
import { dataDirs } from "../env.js";

const FILE = path.join(dataDirs.root, "mcp-servers.json");

const MASK = "••••••";

function load(): McpServerConfig[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as McpServerConfig[];
  } catch {
    return [];
  }
}

function save(list: McpServerConfig[]): void {
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), "utf-8");
}

/** name → url-safe slug that also satisfies the OpenAI tool-name charset. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "server"
  );
}

function maskRecord(values?: Record<string, string>): Record<string, string> | undefined {
  if (!values) return undefined;
  return Object.fromEntries(Object.keys(values).map((k) => [k, MASK]));
}

/**
 * Merge an incoming (possibly mask-echoed) secret map over the stored one:
 * masked values keep the stored secret, anything else replaces it.
 */
function unmaskRecord(
  incoming: Record<string, string> | undefined,
  stored: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!incoming) return undefined;
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = value === MASK && stored?.[key] ? stored[key] : value;
  }
  return merged;
}

function maskTransport(t: McpTransport): McpTransport {
  if (t.kind === "stdio") return { ...t, env: maskRecord(t.env) };
  return { ...t, headers: maskRecord(t.headers) };
}

function unmaskTransport(incoming: McpTransport, stored?: McpTransport): McpTransport {
  const sameKind = stored && stored.kind === incoming.kind ? stored : undefined;
  if (incoming.kind === "stdio") {
    return {
      ...incoming,
      env: unmaskRecord(incoming.env, sameKind?.kind === "stdio" ? sameKind.env : undefined),
    };
  }
  return {
    ...incoming,
    headers: unmaskRecord(
      incoming.headers,
      sameKind && sameKind.kind !== "stdio" ? sameKind.headers : undefined,
    ),
  };
}

export function maskConfig(cfg: McpServerConfig): McpServerConfig {
  return { ...cfg, transport: maskTransport(cfg.transport) };
}

export const mcpServerStore = {
  list(): McpServerConfig[] {
    return load();
  },

  get(id: string): McpServerConfig | undefined {
    return load().find((s) => s.id === id);
  },

  add(input: { name: string; transport: McpTransport }): McpServerConfig {
    const list = load();
    let id = slugify(input.name);
    // De-dupe slugs: "github", "github-2", …
    let n = 2;
    while (list.some((s) => s.id === id)) id = `${slugify(input.name)}-${n++}`;
    const cfg: McpServerConfig = {
      id,
      name: input.name,
      transport: input.transport,
      enabled: true,
      addedAt: new Date().toISOString(),
    };
    list.push(cfg);
    save(list);
    return cfg;
  },

  update(
    id: string,
    patch: Partial<Pick<McpServerConfig, "name" | "transport" | "enabled" | "disabledTools">>,
  ): McpServerConfig | undefined {
    const list = load();
    const cfg = list.find((s) => s.id === id);
    if (!cfg) return undefined;
    if (patch.name !== undefined) cfg.name = patch.name;
    if (patch.transport !== undefined) {
      cfg.transport = unmaskTransport(patch.transport, cfg.transport);
    }
    if (patch.enabled !== undefined) cfg.enabled = patch.enabled;
    if (patch.disabledTools !== undefined) cfg.disabledTools = patch.disabledTools;
    save(list);
    return cfg;
  },

  remove(id: string): void {
    save(load().filter((s) => s.id !== id));
  },
};
