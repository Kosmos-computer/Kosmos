/**
 * Agent profile UI types — mirrors planned `shared/agents.ts` / AgentProfile
 * from docs/model-agent-profiles-plan.md. STUB phase: satisfied by mock data.
 */

export type AgentRuntimeKind =
  | "builtin"
  | "acp"
  | "cursor"
  | "openhands"
  | "kosmos"
  | "automation"
  | "channel";

export type AgentStatus = "active" | "idle" | "running" | "offline";

export type AgentSource = "seed" | "user" | "automation" | "channel";

export type AgentPolicyLevel = "conservative" | "balanced" | "permissive";

export type AgentSafetyLevel = "restricted" | "standard" | "elevated";

export type AgentDetailTab = "profile" | "models" | "memory" | "documents" | "access";

export interface AgentAvatarConfig {
  kind: "emoji" | "initials" | "face-rig";
  value: string;
  /** Token name or hex for avatar background. */
  color?: string;
}

export interface AgentDocument {
  id: string;
  name: string;
  path: string;
  description?: string;
  preview?: string;
}

export interface AgentMemoryGrant {
  kind: string;
  scope: string;
  description?: string;
}

/** Listable agent profile for the Agents manager surface. */
export interface AgentProfile {
  id: string;
  name: string;
  tagline: string;
  description: string;
  principalId: string;
  runtime: AgentRuntimeKind;
  acpPresetId?: string;
  status: AgentStatus;
  enabled: boolean;
  avatar: AgentAvatarConfig;
  source: AgentSource;

  modelSlot?: string;
  approvedModels: string[];
  defaultModel?: string;

  memoryPrincipalId: string;
  memoryGrants: AgentMemoryGrant[];
  memoryEntryCount: number;

  documents: AgentDocument[];

  toolCount: number;
  policyLevel: AgentPolicyLevel;
  skillGates: string[];
  mcpServers: string[];

  labels: string[];
  safetyLevel: AgentSafetyLevel;
}

export type AgentRuntimeFilter = "all" | AgentRuntimeKind;

export type AgentStatusFilter = "all" | "enabled" | "disabled" | "running";
