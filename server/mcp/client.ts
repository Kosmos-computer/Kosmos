/**
 * MCP protocol client — a thin wrapper over the official SDK. One connect()
 * call per configured server: build the right transport, handshake, cache
 * the tools/list result. No hand-rolled JSON-RPC anywhere.
 *
 * stdio servers get their stderr piped to data/run-logs/mcp-<id>.log so a
 * misbehaving server can be diagnosed from Settings without touching a
 * terminal.
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { McpServerConfig, McpToolInfo } from "../../shared/types.js";
import { dataDirs } from "../env.js";

const LOG_DIR = path.join(dataDirs.root, "run-logs");

export function mcpLogFile(serverId: string): string {
  return path.join(LOG_DIR, `mcp-${serverId}.log`);
}

export interface McpConnection {
  client: Client;
  /** Cached tools/list result, refreshed on list_changed notifications. */
  tools: McpToolInfo[];
  /** Raw JSON Schemas per tool name — passed through to the LLM as-is. */
  schemas: Record<string, Record<string, unknown>>;
  close: () => Promise<void>;
}

function buildTransport(cfg: McpServerConfig) {
  const t = cfg.transport;
  if (t.kind === "stdio") {
    return new StdioClientTransport({
      command: t.command,
      args: t.args ?? [],
      // The SDK's default env is a safe allowlist (PATH, HOME…); user-provided
      // entries (API tokens) layer on top.
      env: { ...getDefaultEnvironment(), ...t.env },
      stderr: "pipe",
    });
  }
  if (t.kind === "http") {
    return new StreamableHTTPClientTransport(new URL(t.url), {
      requestInit: t.headers ? { headers: t.headers } : undefined,
    });
  }
  return new SSEClientTransport(new URL(t.url), {
    requestInit: t.headers ? { headers: t.headers } : undefined,
  });
}

async function listTools(client: Client): Promise<{
  tools: McpToolInfo[];
  schemas: Record<string, Record<string, unknown>>;
}> {
  const { tools } = await client.listTools();
  return {
    tools: tools.map((t) => ({
      name: t.name,
      ...(t.description ? { description: t.description } : {}),
      ...(t.annotations?.readOnlyHint ? { readOnly: true } : {}),
    })),
    schemas: Object.fromEntries(
      tools.map((t) => [t.name, (t.inputSchema ?? { type: "object" }) as Record<string, unknown>]),
    ),
  };
}

/** Connect, handshake, and cache the tool list. Throws on any failure. */
export async function connectMcp(cfg: McpServerConfig): Promise<McpConnection> {
  const transport = buildTransport(cfg);
  const client = new Client({ name: "arco", version: "0.1.0" });
  await client.connect(transport);

  // stdio stderr → per-server log file (append; created lazily).
  if (transport instanceof StdioClientTransport && transport.stderr) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const log = fs.createWriteStream(mcpLogFile(cfg.id), { flags: "a" });
    transport.stderr.pipe(log);
  }

  const connection: McpConnection = {
    client,
    ...(await listTools(client)),
    close: () => client.close(),
  };

  // Refresh the cached tool list when the server announces changes. Servers
  // without the capability simply never send this.
  client.fallbackNotificationHandler = async (notification) => {
    if (notification.method === "notifications/tools/list_changed") {
      try {
        const fresh = await listTools(client);
        connection.tools = fresh.tools;
        connection.schemas = fresh.schemas;
      } catch {
        // Keep the stale list; the next reconnect will straighten it out.
      }
    }
  };

  return connection;
}

/**
 * Flatten an MCP tool result's content parts into something the LLM can
 * read: text parts concatenated, structured content JSON-stringified,
 * media parts replaced with placeholders until the chat can render them.
 */
export function flattenContent(content: unknown): string {
  if (!Array.isArray(content)) return JSON.stringify(content ?? null);
  const parts = content.map((part: { type?: string; text?: string }) => {
    if (part.type === "text") return part.text ?? "";
    if (part.type === "image") return "[image omitted]";
    if (part.type === "audio") return "[audio omitted]";
    return JSON.stringify(part);
  });
  return parts.join("\n");
}
