/**
 * STUB: replace with useAgentsStore + GET /api/agents when agent registry ships.
 */
import { useCallback, useMemo, useState } from "react";
import { AGENTS_MOCK } from "./agentsMock";
import type { AgentAvatarConfig, AgentDetailTab, AgentProfile } from "./types";

const AVATAR_COLORS = ["accent", "violet", "teal", "blue", "amber", "green", "indigo", "rose"] as const;

const AVATAR_EMOJIS = ["✦", "◇", "⌘", "▶", "☀", "✉", "🔭", "🧠", "⚡", "🛠", "📎", "🎯"] as const;

export type AgentsViewModel = ReturnType<typeof useAgentsStub>;

export function useAgentsStub() {
  const [agents, setAgents] = useState<AgentProfile[]>(AGENTS_MOCK);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<AgentDetailTab>("profile");

  const selected = useMemo(
    () => agents.find((agent) => agent.id === selectedId) ?? null,
    [agents, selectedId],
  );

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setDetailTab("profile");
  }, []);

  const toggleEnabled = useCallback((id: string, enabled: boolean) => {
    setAgents((current) =>
      current.map((agent) =>
        agent.id === id
          ? {
              ...agent,
              enabled,
              status: enabled ? (agent.status === "offline" ? "idle" : agent.status) : "offline",
            }
          : agent,
      ),
    );
  }, []);

  const updateAgent = useCallback((id: string, patch: Partial<AgentProfile>) => {
    setAgents((current) =>
      current.map((agent) => (agent.id === id ? { ...agent, ...patch } : agent)),
    );
  }, []);

  const updateAvatar = useCallback((id: string, avatar: AgentAvatarConfig) => {
    updateAgent(id, { avatar });
  }, [updateAgent]);

  const toggleApprovedModel = useCallback((id: string, modelId: string) => {
    setAgents((current) =>
      current.map((agent) => {
        if (agent.id !== id) return agent;
        const has = agent.approvedModels.includes(modelId);
        const approvedModels = has
          ? agent.approvedModels.filter((m) => m !== modelId)
          : [...agent.approvedModels, modelId];
        return {
          ...agent,
          approvedModels,
          defaultModel:
            agent.defaultModel === modelId && has
              ? approvedModels[0]
              : agent.defaultModel ?? approvedModels[0],
        };
      }),
    );
  }, []);

  const setDefaultModel = useCallback((id: string, modelId: string) => {
    updateAgent(id, { defaultModel: modelId });
  }, [updateAgent]);

  const createAgent = useCallback((draft: Pick<AgentProfile, "name" | "tagline" | "description" | "avatar">) => {
    const slug = draft.name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24);
    const id = `agent:user:${slug || "new"}`;
    const agent: AgentProfile = {
      id,
      name: draft.name.trim(),
      tagline: draft.tagline.trim(),
      description: draft.description.trim(),
      principalId: id,
      runtime: "builtin",
      status: "idle",
      enabled: true,
      avatar: draft.avatar,
      source: "user",
      modelSlot: "agent.chat",
      approvedModels: ["openai.gpt-5.5"],
      defaultModel: "openai.gpt-5.5",
      memoryPrincipalId: id,
      memoryGrants: [{ kind: "write", scope: id }],
      memoryEntryCount: 0,
      documents: [],
      toolCount: 24,
      policyLevel: "balanced",
      skillGates: [],
      mcpServers: [],
      labels: ["custom", "unevaluated"],
      safetyLevel: "standard",
    };
    setAgents((current) => [agent, ...current]);
    setSelectedId(id);
    return agent;
  }, []);

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
  };
}
