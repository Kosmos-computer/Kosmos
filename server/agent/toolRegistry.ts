/**
 * Dynamic tool registry — assembles the agent's tool list per turn instead of
 * from a compile-time array. Three sources feed it:
 *
 *   system  → the built-in agentTools[] (tools.ts), tagged and passed through
 *   mcp     → tools discovered from connected MCP servers (Phase B) — these
 *             register a contributor at module load
 *   app     → tools contributed by installed app manifests (Phase D)
 *
 * Contributors are callbacks rather than imports so this module never needs
 * to know about MCP or the app platform — they know about it. That also
 * keeps the import graph acyclic (loop → registry ← mcp/apps).
 *
 * The registry is also where agent policy is enforced: applyPolicy() runs
 * before every non-system tool call, resolving (source, tool) → auto /
 * confirm / deny and parking on the user when confirmation is required.
 */
import type { AgentEvent } from "../../shared/types.js";
import { loadSettings } from "../env.js";
import { appendAudit } from "../platform/grantStore.js";
import { requestConfirmation } from "./confirmations.js";
import type { LlmToolDef } from "./llm.js";
import { decide, policyStore, sourceKey, type ToolSource } from "./policyStore.js";
import { skillStore } from "../skills/skillStore.js";
import { agentTools, type AgentTool, type ToolContext } from "./tools.js";

export interface RegisteredTool extends AgentTool {
  source: ToolSource;
  /** Coarse read/write classification — drives the default policy for
   *  non-system sources (reads auto, writes confirm). */
  access: "read" | "write";
}

/** A source that contributes tools for the current turn (may hit the network,
 *  so failures degrade to "no tools from this source", never a failed turn). */
export type ToolContributor = (ctx: ToolContext) => Promise<RegisteredTool[]> | RegisteredTool[];

const contributors: ToolContributor[] = [];

export function registerToolContributor(fn: ToolContributor): void {
  contributors.push(fn);
}

/**
 * Built-in tools that mutate state. Informational for system tools (their
 * own gates decide when to confirm), but keeps the registry's metadata
 * honest for the Settings policy UI.
 */
const WRITE_SYSTEM_TOOLS = new Set([
  "app_create",
  "app_update",
  "exec",
  "write_file",
  "db_execute",
  "create_automation",
  "update_automation",
  "delete_automation",
  "calendar_create_event",
  "calendar_update_event",
  "calendar_delete_event",
  "os_ui",
  "mouse_click",
  "type_text",
]);

function systemTools(): RegisteredTool[] {
  // Settings-level kill switch (Settings → Agent tools): disabled tools are
  // removed from the model's schema entirely — same semantics as MCP
  // disabledTools, unlike a policy "deny" which fails at call time.
  const disabled = new Set(loadSettings().disabledTools ?? []);
  return agentTools
    .filter((tool) => !disabled.has(tool.name))
    .map((tool) => ({
      ...tool,
      source: { kind: "system" as const },
      access: WRITE_SYSTEM_TOOLS.has(tool.name) ? ("write" as const) : ("read" as const),
    }));
}

/** Catalog for the Settings UI: every built-in tool + its enabled state. */
export function describeSystemTools(): {
  name: string;
  description: string;
  access: "read" | "write";
  enabled: boolean;
}[] {
  const disabled = new Set(loadSettings().disabledTools ?? []);
  return agentTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    access: WRITE_SYSTEM_TOOLS.has(tool.name) ? "write" : "read",
    enabled: !disabled.has(tool.name),
  }));
}

/**
 * Skill gating — a skill can list tools that refuse to run until the skill
 * has been read this session. The instructional error is the point: the
 * model reads the skill and retries in one iteration, so heavyweight
 * authoring guides stay out of the base prompt without losing their teeth.
 */
function applySkillGates(tools: RegisteredTool[], ctx: ToolContext): RegisteredTool[] {
  const unread = skillStore.gatingSkillsUnread(ctx.sessionId);
  if (unread.length === 0) return tools;
  return tools.map((tool) => {
    const gate = unread.find((s) => s.gates.includes(tool.name));
    if (!gate) return tool;
    return {
      ...tool,
      // Re-check at execution time, not assembly time: read_skill earlier in
      // the same turn must unlock the tool for the calls that follow it.
      execute: async (args, execCtx) => {
        if (!skillStore.wasRead(execCtx.sessionId, gate.id)) {
          return {
            error:
              `Read skill "${gate.id}" first (read_skill) — it documents how to use ` +
              `${tool.name} correctly. Then retry this call.`,
          };
        }
        return tool.execute(args, execCtx);
      },
    };
  });
}

/** Build the full tool list for one agent turn. */
export async function assembleTools(ctx: ToolContext): Promise<RegisteredTool[]> {
  const contributed = await Promise.all(
    contributors.map(async (fn) => {
      try {
        return await fn(ctx);
      } catch {
        return [];
      }
    }),
  );
  const tools = [...systemTools(), ...contributed.flat()];

  // Last writer loses on name collisions: system tools win, then earlier
  // contributors. Contributors are expected to namespace (mcp__server__tool),
  // so a collision here is a bug being contained, not a feature.
  const seen = new Set<string>();
  const deduped = tools.filter((t) => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });
  return applySkillGates(deduped, ctx);
}

export function toLlmDefs(tools: RegisteredTool[]): LlmToolDef[] {
  return tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
}

/** Compact one tool call into the line the confirm card shows the user. */
function describeCall(tool: RegisteredTool, args: Record<string, unknown>): string {
  let rendered = "";
  try {
    rendered = JSON.stringify(args);
  } catch {
    rendered = "…";
  }
  if (rendered.length > 300) rendered = rendered.slice(0, 300) + "…";
  return `${tool.name}(${rendered})`;
}

/**
 * Enforce agent policy for one tool call. Returns null to proceed, or an
 * error string to hand the LLM instead of executing. Confirmation answers
 * can persist: "always" writes a policy rule, "session" allows the tool for
 * the rest of this chat session.
 */
export async function applyPolicy(
  tool: RegisteredTool,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string | null> {
  // System tools keep their internal gates unless an explicit rule overrides.
  const caller = { kind: "agent" as const, sessionId: ctx.sessionId };
  let decision = decide(tool.source, tool.name, tool.access, ctx.sessionId);
  if (tool.source.kind === "system" && decision === "auto") return null;

  // Headless runs can't answer a confirm card — degrade to deny, mirroring
  // risky-exec semantics.
  if (decision === "confirm" && !ctx.interactive) decision = "deny";

  if (decision === "deny") {
    appendAudit({
      caller,
      method: `tool:${tool.name}`,
      detail: sourceKey(tool.source),
      allowed: false,
    });
    return "Denied by agent policy. Do not retry this tool; tell the user it is blocked and ask how to proceed.";
  }

  if (decision === "confirm") {
    const { confirmId, verdict } = requestConfirmation();
    const emit: (event: AgentEvent) => void = ctx.emit;
    emit({
      type: "confirm_required",
      confirmId,
      command: describeCall(tool, args),
      options: ["once", "session", "always", "deny"],
    });
    const answer = await verdict;
    emit({ type: "confirm_resolved", confirmId, approved: answer.approved });

    const toolKey = `${sourceKey(tool.source)}#${tool.name}`;
    if (answer.remember === "always") {
      policyStore.set(toolKey, answer.approved ? "auto" : "deny");
    } else if (answer.remember === "session" && answer.approved) {
      policyStore.allowForSession(ctx.sessionId, toolKey);
    }

    if (!answer.approved) {
      appendAudit({
        caller,
        method: `tool:${tool.name}`,
        detail: sourceKey(tool.source),
        allowed: false,
      });
      return "User denied this action. Do not retry it; ask what they'd like instead.";
    }
  }

  appendAudit({
    caller,
    method: `tool:${tool.name}`,
    detail: sourceKey(tool.source),
    allowed: true,
  });
  return null;
}
