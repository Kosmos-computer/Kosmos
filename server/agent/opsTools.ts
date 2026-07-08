/**
 * Deploy/ops agent tools — same surface as kosmos-ops MCP for the builtin loop.
 */
import type { AgentTool } from "./tools.js"; // type-only — no runtime cycle with tools.ts
import {
  coolifyCreateApp,
  createDirectory,
  dockerBuild,
  dockerComposeUp,
  getOpsStatus,
} from "../ops/deployOps.js";

export const opsAgentTools: AgentTool[] = [
  {
    name: "ops_status",
    description: "Check ops health: Docker socket, Coolify mount, workspace root, bubblewrap.",
    parameters: { type: "object", properties: {} },
    execute: async () => getOpsStatus(),
  },
  {
    name: "create_directory",
    description:
      "Create a folder in the workspace or Coolify apps tree. Use base=coolify for new deployable apps under the mounted Coolify applications directory.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative or absolute directory path" },
        base: {
          type: "string",
          enum: ["workspace", "coolify", "auto"],
          description: "Root for relative paths (default auto)",
        },
      },
      required: ["path"],
    },
    execute: async (args) =>
      createDirectory({
        path: String(args.path ?? ""),
        base: (args.base as "workspace" | "coolify" | "auto") ?? "auto",
      }),
  },
  {
    name: "docker_build",
    description: "Build a Docker image. Requires /var/run/docker.sock mounted on the server.",
    parameters: {
      type: "object",
      properties: {
        context: { type: "string", description: "Build context path (relative to workspace or absolute)" },
        tag: { type: "string", description: "Image tag, e.g. myapp:latest" },
        dockerfile: { type: "string", description: "Optional Dockerfile path relative to context" },
      },
      required: ["context", "tag"],
    },
    execute: async (args) =>
      dockerBuild({
        context: String(args.context ?? ""),
        tag: String(args.tag ?? ""),
        dockerfile: typeof args.dockerfile === "string" ? args.dockerfile : undefined,
      }),
  },
  {
    name: "coolify_create_app",
    description:
      "Scaffold a new Coolify app folder with Dockerfile + docker-compose.yaml. Requires ARCO_COOLIFY_APPS_DIR mount.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Human-readable app name" },
        image: { type: "string", description: "Docker image tag (default: <slug>:latest)" },
        port: { type: "number", description: "Container port (default 8080)" },
        domain: { type: "string", description: "Optional Traefik host, e.g. app.example.com" },
        template: { type: "string", enum: ["static", "node"], description: "Starter template" },
      },
      required: ["name"],
    },
    execute: async (args) =>
      coolifyCreateApp({
        name: String(args.name ?? ""),
        image: typeof args.image === "string" ? args.image : undefined,
        port: typeof args.port === "number" ? args.port : undefined,
        domain: typeof args.domain === "string" ? args.domain : undefined,
        template: args.template === "node" ? "node" : "static",
      }),
  },
  {
    name: "docker_compose_up",
    description: "Deploy with docker compose up -d in a directory containing docker-compose.yaml.",
    parameters: {
      type: "object",
      properties: {
        composeDir: { type: "string", description: "Directory with docker-compose.yaml" },
        build: { type: "boolean", description: "Pass --build" },
      },
      required: ["composeDir"],
    },
    execute: async (args) =>
      dockerComposeUp({
        composeDir: String(args.composeDir ?? ""),
        build: args.build === true,
      }),
  },
];
