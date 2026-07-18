/**
 * Live agent registry hook — replaces useAgentsStub.
 * Maps shared AgentProfile → UI AgentProfile shape used by AgentsApp.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentProfile as ApiProfile, CreateAgentProfileInput } from "@shared/agents";
import { api } from "../../lib/api";
import { notifyAgentsChanged } from "./agentsBus";
import type { AgentAvatarConfig, AgentDetailTab, AgentProfile } from "./types";

const AVATAR_COLORS = ["accent", "violet", "teal", "blue", "amber", "green", "indigo", "rose"] as const;
const AVATAR_EMOJIS = ["✦", "◇", "⌘", "▶", "☀", "✉", "🔭", "🧠", "⚡", "🛠", "📎", "🎯"] as const;

function toUiProfile(p: ApiProfile, busyIds: Set<string>): AgentProfile {
  const runtime =
    p.runtime.kind === "builtin" ||
    p.runtime.kind === "acp" ||
    p.runtime.kind === "cursor" ||
    p.runtime.kind === "openhands" ||
    p.runtime.kind === "kosmos"
      ? (p.runtime.kind as AgentProfile["runtime"])
      : "builtin";
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline ?? "",
    description: p.description ?? "",
    principalId: p.principalId,
    runtime,
    acpPresetId: p.runtime.acpPresetId,
    status: !p.enabled ? "offline" : busyIds.has(p.id) ? "running" : "idle",
    enabled: p.enabled,
    avatar: p.avatar
      ? { kind: p.avatar.kind, value: p.avatar.value, color: p.avatar.color }
      : { kind: "emoji", value: "✦", color: "accent" },
    source: p.source === "seed" ? "seed" : "user",
    modelSlot: p.modelSlot,
    approvedModels: [],
    defaultModel: undefined,
    memoryPrincipalId: p.principalId,
    memoryGrants: [],
    memoryEntryCount: 0,
    documents: [],
    toolCount: 0,
    policyLevel: p.policyLevel ?? "balanced",
    skillGates: p.skills ?? [],
    mcpServers: [],
    labels: [
      ...(p.source === "seed" ? ["seed"] : ["custom"]),
      ...(p.runtime.kind === "acp" ? ["acp"] : []),
      ...(p.certification?.status && p.certification.status !== "unevaluated"
        ? [p.certification.status]
        : []),
    ],
    safetyLevel: p.safety?.level ?? "standard",
  };
}

export type AgentsViewModel = ReturnType<typeof useAgents>;

export function useAgents() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [defaultProfileId, setDefaultProfileId] = useState<string>("agent:builtin");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<AgentDetailTab>("profile");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.listAgents();
      const busy = new Set(data.busyProfileIds ?? []);
      setAgents(data.agents.map((p) => toUiProfile(p, busy)));
      setDefaultProfileId(data.defaultProfileId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAndNotify = useCallback(async () => {
    await refresh();
    notifyAgentsChanged();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => void refresh(), 4_000);
    return () => clearInterval(tick);
  }, [refresh]);

  const selected = useMemo(
    () => agents.find((agent) => agent.id === selectedId) ?? null,
    [agents, selectedId],
  );

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setDetailTab("profile");
  }, []);

  const toggleEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await api.updateAgent(id, { enabled });
        await refreshAndNotify();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update agent");
      }
    },
    [refreshAndNotify],
  );

  const updateAgent = useCallback(
    async (id: string, patch: Partial<AgentProfile>) => {
      try {
        await api.updateAgent(id, {
          name: patch.name,
          description: patch.description,
          tagline: patch.tagline,
          enabled: patch.enabled,
          avatar: patch.avatar
            ? { kind: patch.avatar.kind === "face-rig" ? "emoji" : patch.avatar.kind, value: patch.avatar.value, color: patch.avatar.color }
            : undefined,
          policyLevel: patch.policyLevel,
          modelSlot: patch.modelSlot,
          runtime:
            patch.runtime != null
              ? {
                  kind: patch.runtime === "automation" || patch.runtime === "channel" ? "builtin" : patch.runtime,
                  acpPresetId: patch.acpPresetId,
                }
              : undefined,
          safety: patch.safetyLevel ? { level: patch.safetyLevel } : undefined,
        });
        await refreshAndNotify();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update agent");
      }
    },
    [refreshAndNotify],
  );

  const updateAvatar = useCallback(
    (id: string, avatar: AgentAvatarConfig) => {
      void updateAgent(id, { avatar });
    },
    [updateAgent],
  );

  const toggleApprovedModel = useCallback((_id: string, _modelId: string) => {
    // Model allowlists land with profiles plan Phase 2 UI — registry stores modelSlot only for now.
  }, []);

  const setDefaultModel = useCallback((_id: string, _modelId: string) => {}, []);

  const createAgent = useCallback(
    async (draft: Pick<AgentProfile, "name" | "tagline" | "description" | "avatar">) => {
      const input: CreateAgentProfileInput = {
        name: draft.name,
        tagline: draft.tagline,
        description: draft.description,
        avatar:
          draft.avatar.kind === "face-rig"
            ? { kind: "emoji", value: draft.avatar.value, color: draft.avatar.color }
            : { kind: draft.avatar.kind, value: draft.avatar.value, color: draft.avatar.color },
      };
      const created = await api.createAgent(input);
      await refreshAndNotify();
      setSelectedId(created.id);
      return toUiProfile(created, new Set());
    },
    [refreshAndNotify],
  );

  return {
    agents,
    selected,
    selectedId,
    detailTab,
    select,
    setDetailTab,
    toggleEnabled,
    updateAgent,
    updateAvatar,
    toggleApprovedModel,
    setDefaultModel,
    createAgent,
    avatarColors: AVATAR_COLORS,
    avatarEmojis: AVATAR_EMOJIS,
    defaultProfileId,
    loading,
    error,
    refresh,
  };
}
