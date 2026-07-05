/**
 * MCP → agent tool adapter. Registers a contributor with the dynamic tool
 * registry: every connected server's tools join the agent's tool list for
 * the turn, namespaced mcp__<serverId>__<tool> (OpenAI tool names forbid
 * dots; the double-underscore convention matches what Claude-family hosts
 * emit, so models have priors for it).
 *
 * Access classification follows the MCP readOnlyHint annotation — it's only
 * a hint, so tools without it are treated as writes, which means the policy
 * layer confirms them by default. Importing this module (server/index.ts
 * does) is what wires MCP into the agent.
 */
import { registerToolContributor, type RegisteredTool } from "../agent/toolRegistry.js";
import { flattenContent } from "./client.js";
import { mcpServerStore } from "./serverStore.js";
import { mcpSupervisor } from "./supervisor.js";

/** MCP tool names may contain characters OpenAI's charset rejects. */
function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

registerToolContributor(() => {
  const tools: RegisteredTool[] = [];
  for (const { id, conn } of mcpSupervisor.connections()) {
    const cfg = mcpServerStore.get(id);
    if (!cfg) continue;
    const disabled = new Set(cfg.disabledTools ?? []);
    for (const t of conn.tools) {
      if (disabled.has(t.name)) continue;
      tools.push({
        name: `mcp__${id}__${sanitize(t.name)}`.slice(0, 64),
        description: `[${cfg.name}] ${t.description ?? t.name}`,
        parameters: conn.schemas[t.name] ?? { type: "object", properties: {} },
        source: { kind: "mcp", serverId: id },
        access: t.readOnly ? "read" : "write",
        execute: async (args) => {
          const result = await conn.client.callTool({ name: t.name, arguments: args });
          // Two-channel split (Joplin): isError is an LLM-visible failure it
          // can recover from; a transport throw is caught by the loop and
          // reported generically.
          if (result.isError) return { error: flattenContent(result.content) };
          return flattenContent(result.content);
        },
      });
    }
  }
  return tools;
});
