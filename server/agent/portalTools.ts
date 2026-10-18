/**
 * Agent tools for the Kosmos iframe.
 *
 * `portal_connect` aims the one stream window at the engine or at an
 * installed app. `portal_control` sends a protocol request only while the
 * window is on the engine; the iframe itself is only allowed to pull
 * screenshots, so sim writes go through here and stop for a confirmation
 * when someone is watching.
 */
import { requestConfirmation } from "./confirmations.js";
import { engineCall, engineQuery } from "../engine/session.js";
import { connectPortal, currentPortal } from "../kosmosPortal.js";
import type { AgentTool, ToolContext } from "./tools.js";

const READ = new Set(["query", "hash", "describe", "list_commands", "screenshot"]);

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

export const portalAgentTools: AgentTool[] = [
  {
    name: "portal_targets",
    description:
      "List what the Kosmos iframe can show: the engine frame stream, and installed apps on this computer. Includes which one is selected.",
    parameters: { type: "object", properties: {} },
    execute: async () => currentPortal(),
  },
  {
    name: "portal_connect",
    description:
      "Aim the Kosmos iframe at a target from portal_targets. `engine` streams frames from kosmos serve. An app id shows that app in the same iframe.",
    parameters: {
      type: "object",
      properties: { target: { type: "string", description: "A target id from portal_targets." } },
      required: ["target"],
    },
    execute: async (args) => {
      const view = connectPortal(String(args.target ?? ""));
      if (!view) return { error: "Unknown portal target. Call portal_targets." };
      return view;
    },
  },
  {
    name: "portal_control",
    description:
      "Drive the engine the iframe is streaming. request.t is a protocol request (step, load, input, query, screenshot, …). Refused when the iframe is showing an app instead of the engine. Writes are confirmed when someone is watching.",
    parameters: {
      type: "object",
      properties: { request: REQUEST },
      required: ["request"],
    },
    execute: async (args, ctx) => {
      const { target } = currentPortal();
      if (target.kind !== "engine") {
        return {
          error: `The iframe is showing ${target.label}. portal_connect to engine to drive the sim.`,
        };
      }
      const t = String((args.request as { t?: string } | undefined)?.t ?? "");
      if (!READ.has(t)) {
        const gate = await confirm(ctx, `portal_control ${t}`);
        if (gate) return gate;
        return engineCall(args);
      }
      if (t === "screenshot") return engineCall(args);
      return engineQuery(args);
    },
  },
];
