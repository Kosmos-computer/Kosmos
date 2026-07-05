/**
 * Agent policy store — may the agent call this tool, and does it need the
 * user's approval first?
 *
 * This is the agent-side twin of the app grant store: apps have grants
 * ("may this app do X on the user's behalf"), the agent has policy rules
 * ("may the agent use this tool, auto or with confirmation"). Both write the
 * same audit log.
 *
 * Rule keys are `<sourceKey>` or `<sourceKey>#<toolName>`, e.g.
 *   "mcp:linear"                — every tool from the linear MCP server
 *   "mcp:linear#create_issue"   — one specific tool
 *   "app:core.calendar"         — an installed app's contributed tools
 *   "system#exec"               — a built-in tool
 * The most specific rule wins. Absent any rule, the defaults follow the
 * Joplin posture: reads run automatically, writes ask — except system tools,
 * which keep their own internal gates (risky-exec confirmation, write-intent
 * confirmation) and therefore default to auto here.
 */
import fs from "node:fs";
import path from "node:path";
import { dataDirs } from "../env.js";

export type PolicyDecision = "auto" | "confirm" | "deny";

/** Where a tool came from — the unit policy rules attach to. */
export type ToolSource =
  | { kind: "system" }
  | { kind: "mcp"; serverId: string }
  | { kind: "app"; appId: string };

export function sourceKey(source: ToolSource): string {
  switch (source.kind) {
    case "system":
      return "system";
    case "mcp":
      return `mcp:${source.serverId}`;
    case "app":
      return `app:${source.appId}`;
  }
}

const FILE = path.join(dataDirs.root, "agent-policy.json");

interface PolicyFile {
  rules: Record<string, PolicyDecision>;
}

function load(): PolicyFile {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as PolicyFile;
  } catch {
    return { rules: {} };
  }
}

function save(file: PolicyFile): void {
  fs.writeFileSync(FILE, JSON.stringify(file, null, 2), "utf-8");
}

/**
 * "Allow for this session" answers live here, in memory — they intentionally
 * do not survive a server restart (a persisted session allowance is just a
 * weaker "always").
 */
const sessionAllows = new Map<string, Set<string>>();

export const policyStore = {
  rules(): Record<string, PolicyDecision> {
    return load().rules;
  },

  set(key: string, decision: PolicyDecision): void {
    const file = load();
    file.rules[key] = decision;
    save(file);
  },

  remove(key: string): void {
    const file = load();
    delete file.rules[key];
    save(file);
  },

  allowForSession(sessionId: string, toolKey: string): void {
    const set = sessionAllows.get(sessionId) ?? new Set<string>();
    set.add(toolKey);
    sessionAllows.set(sessionId, set);
  },

  sessionAllowed(sessionId: string, toolKey: string): boolean {
    return sessionAllows.get(sessionId)?.has(toolKey) ?? false;
  },
};

/**
 * Resolve the effective decision for one tool call. Most-specific rule wins;
 * session allowances count as auto; built-in defaults close the gap.
 */
export function decide(
  source: ToolSource,
  toolName: string,
  access: "read" | "write",
  sessionId: string,
): PolicyDecision {
  const key = sourceKey(source);
  const toolKey = `${key}#${toolName}`;
  if (policyStore.sessionAllowed(sessionId, toolKey)) return "auto";

  const rules = load().rules;
  const rule = rules[toolKey] ?? rules[key];
  if (rule) return rule;

  // System tools carry their own gates (see tools.ts: isRiskyCommand,
  // agentInvokeIntent) — the policy layer only intervenes on explicit rules.
  if (source.kind === "system") return "auto";
  return access === "read" ? "auto" : "confirm";
}
