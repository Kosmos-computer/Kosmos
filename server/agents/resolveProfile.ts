/**
 * Resolve which agent profile owns a turn.
 * Interactive chat uses an explicit id / session stamp; channels use peer bindings.
 */
import type { AgentProfile } from "../../shared/agents.js";
import { BUILTIN_AGENT_ID } from "../../shared/agents.js";
import { agentStore } from "./agentStore.js";

export function resolveProfileForTurn(opts: {
  profileId?: string | null;
  sessionProfileId?: string | null;
}): AgentProfile {
  return agentStore.resolve(opts.profileId ?? opts.sessionProfileId ?? BUILTIN_AGENT_ID);
}

/**
 * OpenClaw-style peer → agent resolution for messaging channels.
 *
 * Order: peer.profileId (if set + enabled) → registry default → builtin.
 */
export function resolveChannelProfile(opts: {
  peerProfileId?: string | null;
}): AgentProfile {
  if (opts.peerProfileId) {
    const hit = agentStore.get(opts.peerProfileId);
    if (hit?.enabled) return hit;
  }
  return agentStore.getDefault();
}
