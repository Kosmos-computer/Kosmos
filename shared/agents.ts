/**
 * Agent profile registry types — runtime subset for registry + channel bindings.
 *
 * Full safety/certification schema lives in docs/model-agent-profiles-plan.md;
 * this module ships the fields needed to list agents, thread principals into
 * memory/tools, and (Phase 2) bind Telegram peers to profiles.
 *
 * Principal convention (memory-plan §3):
 *   agent:builtin | agent:user:<slug> | agent:acp:<preset> | agent:channel:<id> | …
 */
import type { AgentKind } from "./types.js";
import type {
  AudienceProfile,
  CertificationProfile,
  SafetyProfile,
  TrustLevel,
} from "./profiles.js";
import { defaultCertification, defaultSafety } from "./profiles.js";

export const BUILTIN_AGENT_ID = "agent:builtin";

export type AgentProfileSource = "seed" | "user";

export type AgentPolicyLevel = "conservative" | "balanced" | "permissive";

export type AgentAvatarKind = "emoji" | "initials";

export interface AgentAvatar {
  kind: AgentAvatarKind;
  value: string;
  /** Token name (e.g. "accent") or hex. */
  color?: string;
}

export interface AgentRuntimeConfig {
  kind: AgentKind;
  acpPresetId?: string;
}

/**
 * Listable agent profile — how the agent behaves (identity, tools, memory
 * principal), not which files it edits (that's workspace/project).
 */
export interface AgentProfile {
  id: string;
  name: string;
  description?: string;
  tagline?: string;
  enabled: boolean;
  /** Memory / ACL principal — usually equals id. */
  principalId: string;
  runtime: AgentRuntimeConfig;
  /** Model-registry use-case slot (e.g. "agent.chat"). */
  modelSlot?: string;
  policyLevel?: AgentPolicyLevel;
  /**
   * Skill allowlist (OpenClaw replace semantics).
   * omit = all enabled skills; [] = none.
   */
  skills?: string[];
  /** Hermes-style denylist applied after allowlist. */
  skillsDisabled?: string[];
  avatar?: AgentAvatar;
  source: AgentProfileSource;
  /** Trust / safety labels (model-agent-profiles Phase 5). */
  trust?: TrustLevel;
  safety?: SafetyProfile;
  audience?: AudienceProfile;
  certification?: CertificationProfile;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentProfileInput {
  name: string;
  description?: string;
  tagline?: string;
  /** Clone policy/skills/runtime from this profile id (default builtin). */
  cloneFrom?: string;
  avatar?: AgentAvatar;
  runtime?: AgentRuntimeConfig;
  modelSlot?: string;
  policyLevel?: AgentPolicyLevel;
  skills?: string[];
  skillsDisabled?: string[];
  safety?: SafetyProfile;
}

export interface UpdateAgentProfileInput {
  name?: string;
  description?: string;
  tagline?: string;
  enabled?: boolean;
  avatar?: AgentAvatar;
  runtime?: AgentRuntimeConfig;
  modelSlot?: string;
  policyLevel?: AgentPolicyLevel;
  skills?: string[] | null;
  skillsDisabled?: string[] | null;
  safety?: SafetyProfile | null;
}

/** Validate / normalize a user-facing agent id slug. */
export function slugifyAgentName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "agent"
  );
}

export function userAgentId(slug: string): string {
  return `agent:user:${slug}`;
}

export function isValidAgentId(id: string): boolean {
  return /^agent:(builtin|user:[a-z0-9][a-z0-9_-]{0,63}|acp:[a-z0-9][a-z0-9_-]{0,63})$/.test(
    id,
  );
}

/** Default seed profile matching today's single-agent behavior. */
export function builtinAgentProfile(now = new Date().toISOString()): AgentProfile {
  return {
    id: BUILTIN_AGENT_ID,
    name: "Arco",
    tagline: "Default assistant for Chat and Studio",
    description:
      "The built-in agent loop with tool calling, skills, and OS integration. Uses the agent.chat model slot and your configured tool policy.",
    enabled: true,
    principalId: BUILTIN_AGENT_ID,
    runtime: { kind: "builtin" },
    modelSlot: "agent.chat",
    policyLevel: "balanced",
    avatar: { kind: "emoji", value: "✦", color: "accent" },
    source: "seed",
    trust: "builtin",
    safety: defaultSafety("standard"),
    audience: { age: "all" },
    certification: defaultCertification("unevaluated"),
    createdAt: now,
    updatedAt: now,
  };
}

/** Seed ACP preset profiles (Claude Code / Codex / Gemini) — disabled until chosen. */
export function acpPresetProfiles(now = new Date().toISOString()): AgentProfile[] {
  // Inline to avoid circular import with types.ts ACP_PRESETS at module init in some bundlers.
  const presets = [
    { id: "claude-code", label: "Claude Code", emoji: "◈" },
    { id: "codex", label: "Codex", emoji: "▣" },
    { id: "gemini", label: "Gemini CLI", emoji: "◇" },
  ] as const;
  return presets.map((p) => ({
    id: `agent:acp:${p.id}`,
    name: p.label,
    tagline: `ACP · ${p.label}`,
    description: `External ACP agent (${p.label}). Bind a Telegram peer or select in Chat to spawn this runtime.`,
    enabled: true,
    principalId: `agent:acp:${p.id}`,
    runtime: { kind: "acp" as const, acpPresetId: p.id },
    modelSlot: "agent.chat",
    policyLevel: "balanced" as const,
    avatar: { kind: "emoji" as const, value: p.emoji, color: "violet" },
    source: "seed" as const,
    trust: "community" as const,
    safety: defaultSafety("standard"),
    audience: { age: "all" as const },
    certification: defaultCertification("unevaluated"),
    createdAt: now,
    updatedAt: now,
  }));
}
