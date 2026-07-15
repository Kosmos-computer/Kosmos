#!/usr/bin/env node
/**
 * Kosmos Ops MCP — stdio server exposing folder, Docker, and Coolify tools.
 * Auto-seeded in production; also addable from Settings → MCP presets.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  coolifyCreateApp,
  createDirectory,
  dockerBuild,
  dockerComposeUp,
  getOpsStatus,
} from "../server/ops/deployOps.js";

const server = new Server({ name: "kosmos-ops", version: "0.1.0" }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: "ops_status",
    description: "Read-only ops health: Docker, Coolify mount, workspace root.",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
  },
  {
    name: "create_directory",
    description: "Create a folder in the workspace or Coolify apps directory.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative or absolute path" },
        base: { type: "string", enum: ["workspace", "coolify", "auto"], description: "Root for relative paths" },
      },
      required: ["path"],
    },
  },
  {
    name: "docker_build",
    description: "Build a Docker image from a context directory.",
    inputSchema: {
      type: "object",
      properties: {
        context: { type: "string" },
        tag: { type: "string" },
        dockerfile: { type: "string" },
      },
      required: ["context", "tag"],
    },
  },
  {
    name: "coolify_create_app",
    description: "Scaffold a new Coolify compose app folder (static or node template).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        image: { type: "string" },
        port: { type: "number" },
        domain: { type: "string" },
        template: { type: "string", enum: ["static", "node"] },
      },
      required: ["name"],
    },
  },
  {
    name: "docker_compose_up",
    description: "Run docker compose up -d in a directory with docker-compose.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        composeDir: { type: "string" },
        build: { type: "boolean" },
      },
      required: ["composeDir"],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    ...("readOnly" in t && t.readOnly ? { annotations: { readOnlyHint: true } } : {}),
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const args = (req.params.arguments ?? {}) as Record<string, unknown>;
    let result: unknown;
    switch (req.params.name) {
      case "ops_status":
        result = await getOpsStatus();
        break;
      case "create_directory":
        result = await createDirectory({
          path: String(args.path ?? ""),
          base: (args.base as "workspace" | "coolify" | "auto") ?? "auto",
        });
        break;
      case "docker_build":
        result = await dockerBuild({
          context: String(args.context ?? ""),
          tag: String(args.tag ?? ""),
          dockerfile: typeof args.dockerfile === "string" ? args.dockerfile : undefined,
        });
        break;
      case "coolify_create_app":
        result = await coolifyCreateApp({
          name: String(args.name ?? ""),
          image: typeof args.image === "string" ? args.image : undefined,
          port: typeof args.port === "number" ? args.port : undefined,
          domain: typeof args.domain === "string" ? args.domain : undefined,
          template: args.template === "node" ? "node" : "static",
        });
        break;
      case "docker_compose_up":
        result = await dockerComposeUp({
          composeDir: String(args.composeDir ?? ""),
          build: args.build === true,
        });
        break;
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
          isError: true,
        };
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
