/**
 * Resolve turn kind / ACP command without importing heavy agent backends
 * (those live in turnRunner.ts for pickTurnRunner).
 */
import type { AgentKind } from "../../shared/types.js";
import { ACP_PRESETS } from "../../shared/types.js";
import type { AgentProfile } from "../../shared/agents.js";
import { loadSettings } from "../env.js";

/** Resolve ACP spawn command from profile preset, then Settings fallback. */
export function resolveAcpCommand(profile?: AgentProfile | null): string {
  const presetId = profile?.runtime.acpPresetId;
  if (presetId) {
    const preset = ACP_PRESETS.find((p) => p.id === presetId);
    if (preset?.command) return preset.command;
  }
  return loadSettings().acpCommand;
}

/**
 * Effective runtime kind for a turn: the selected agent profile's runtime
 * wins (including builtin). Settings.agent is only the fallback when no
 * profile is attached to the turn.
 */
export function resolveTurnKind(profile?: AgentProfile | null): AgentKind {
  const fromProfile = profile?.runtime.kind;
  if (fromProfile) return fromProfile;
  return loadSettings().agent;
}
