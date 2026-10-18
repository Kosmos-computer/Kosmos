/**
 * Chat tools for the engine session.
 *
 * Names stay short (`engine_open`) so the model does not have to discover
 * an app-contributed alias. Writes that change the sim go through
 * engine_call and, when someone is watching, stop for a confirmation.
 * Opening the window does not: that is the action the user just asked for.
 */
import { requestConfirmation } from "./confirmations.js";
import {
  bridgeStatus,
  closeEngine,
  engineCall,
  engineQuery,
  engineStatus,
  openEngine,
} from "../engine/session.js";
import type { AgentTool, ToolContext } from "./tools.js";

const REQUEST = {
  type: "object",
  description: "A kosmos protocol request object. Include t.",
  properties: { t: { type: "string" } },
  required: ["t"],
  additionalProperties: true,
};

async function confirm(ctx: ToolContext, command: string): Promise<{ error: string } | null> {
  if (!ctx.interactive) {
    return { error: `${command} needs someone watching the chat. Skipped.` };
  }
  if ((ctx.approvalMode ?? "smart") !== "smart") return null;
  const { confirmId, verdict } = requestConfirmation(ctx.signal);
  ctx.emit({ type: "confirm_required", confirmId, command });
  const { approved } = await verdict;
  ctx.emit({ type: "confirm_resolved", confirmId, approved });
  if (!approved) return { error: `Declined: ${command}` };
  return null;
}

export const engineAgentTools: AgentTool[] = [
  {
    name: "bridge_status",
    description:
      "What this chat can reach: the engine port, OpenHands (OPENHANDS_HOST), Plane (ARCO_PLANE_MCP_URL), and GitHub. Tokens are not included.",
    parameters: { type: "object", properties: {} },
    execute: async () => bridgeStatus(),
  },
  {
    name: "engine_status",
    description: "Whether a kosmos engine protocol port is listening, and if this session started it.",
    parameters: { type: "object", properties: {} },
    execute: async () => engineStatus(),
  },
  {
    name: "engine_open",
    description:
      "Open the game. Attaches to a running engine, or starts kosmos-app --serve-port when a display exists, or kosmos serve on a headless host.",
    parameters: { type: "object", properties: {} },
    execute: async () => openEngine(),
  },
  {
    name: "engine_close",
    description: "Stop the engine process this chat started. A server that was already running is left up.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) => {
      const gate = await confirm(ctx, "engine_close");
      if (gate) return gate;
      return closeEngine();
    },
  },
  {
    name: "engine_query",
    description: "Read the engine. request.t must be query, hash, describe, or list_commands.",
    parameters: {
      type: "object",
      properties: { request: REQUEST },
      required: ["request"],
    },
    execute: async (args) => engineQuery(args),
  },
  {
    name: "engine_call",
    description:
      "Send any other protocol request (step, load, command, input, …). Confirmed when someone is watching.",
    parameters: {
      type: "object",
      properties: { request: REQUEST },
      required: ["request"],
    },
    execute: async (args, ctx) => {
      const t = String((args.request as { t?: string } | undefined)?.t ?? "call");
      const gate = await confirm(ctx, `engine_call ${t}`);
      if (gate) return gate;
      return engineCall(args);
    },
  },
];
