/**
 * Arco as an MCP server — the outward protocol edge. External agents
 * (Claude Desktop, another Arco, any MCP host) POST /mcp with a scoped
 * bearer token and get Arco's capability intents as tools:
 * calendar.events.list → calendar_events_list, and so on.
 *
 * Design rules carried over from the plan:
 * - Tools are capability intents, not REST wrappers — the same intent
 *   dispatch the agent and apps use, provider-agnostic.
 * - Same HTTP service, no second port (Joplin), stateless JSON responses:
 *   each POST builds a short-lived SDK server + transport pair.
 * - Every call audits as caller {kind:"external", clientId}; read-scoped
 *   tokens never even see write tools in tools/list.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CONTRACTS, intentMeta, intentSchema } from "../../shared/capabilities/index.js";
import { invokeIntent } from "../capabilities/registry.js";
import { appendAudit } from "../platform/grantStore.js";
import { externalClients } from "../platform/externalClients.js";

interface ExternalIdentity {
  id: string;
  name: string;
  scope: "read" | "readwrite";
}

/** "calendar.events.list" → "calendar_events_list" (MCP tool-name charset). */
function toolName(intentId: string): string {
  return intentId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function intentsForScope(scope: ExternalIdentity["scope"]): { intentId: string; access: string }[] {
  const out: { intentId: string; access: string }[] = [];
  for (const intents of Object.values(CONTRACTS)) {
    for (const [intentId, access] of Object.entries(intents)) {
      if (scope === "read" && access !== "read") continue;
      out.push({ intentId, access });
    }
  }
  return out;
}

/** Build a one-shot MCP server exposing the client's intent surface. */
function buildServer(client: ExternalIdentity): Server {
  const server = new Server(
    { name: "arco-os", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  const exposed = intentsForScope(client.scope);
  const byToolName = new Map(exposed.map((e) => [toolName(e.intentId), e]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: exposed.map(({ intentId, access }) => {
      const meta = intentMeta(intentId);
      return {
        name: toolName(intentId),
        description: `${access === "read" ? "Read" : "Write"} intent ${intentId} on contract ${meta?.contractId ?? "?"} — dispatches to whatever app currently provides it.`,
        inputSchema: intentSchema(intentId),
        ...(access === "read" ? { annotations: { readOnlyHint: true } } : {}),
      };
    }),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const entry = byToolName.get(request.params.name);
    if (!entry) {
      appendAudit({
        caller: { kind: "external", clientId: client.id },
        method: `tool:${request.params.name}`,
        allowed: false,
      });
      return {
        content: [{ type: "text", text: `Unknown or out-of-scope tool: ${request.params.name}` }],
        isError: true,
      };
    }
    appendAudit({
      caller: { kind: "external", clientId: client.id },
      method: `intent.invoke:${entry.intentId}`,
      detail: client.name,
      allowed: true,
    });
    try {
      const result = await invokeIntent(
        entry.intentId,
        (request.params.arguments ?? {}) as Record<string, unknown>,
      );
      return { content: [{ type: "text", text: JSON.stringify(result ?? null) }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: err instanceof Error ? err.message : "Intent failed" }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Handle one POST /mcp exchange. Stateless: a fresh server + transport per
 * request (no session ids), JSON responses instead of an SSE stream — the
 * simplest shape that every MCP client speaks.
 */
export async function handleOutwardMcp(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  body: unknown,
  bearerToken: string,
): Promise<void> {
  const client = externalClients.authenticate(bearerToken);
  if (!client) {
    outgoing.writeHead(401, { "Content-Type": "application/json" }).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: external access is disabled or the token is invalid" },
        id: null,
      }),
    );
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = buildServer(client);
  outgoing.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(incoming, outgoing, body);
}
