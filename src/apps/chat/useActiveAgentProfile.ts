/**
 * Active agent profile for Chat/Studio composer — Hermes-style profile chip.
 * Preference persisted in localStorage; list comes from /api/agents and
 * refreshes when the Agents app mutates the registry.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentProfile } from "@shared/agents";
import { BUILTIN_AGENT_ID } from "@shared/agents";
import type { MenuItem } from "../../components/Menu";
import { api } from "../../lib/api";
import { onAgentsChanged } from "../agents/agentsBus";
import { openShellWindow } from "../../os/shellNavigation";
import { systemAppTitle } from "../../os/systemAppTitles";

const STORAGE_KEY = "arco.activeAgentProfileId";

export function useActiveAgentProfile() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [profileId, setProfileIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || BUILTIN_AGENT_ID;
    } catch {
      return BUILTIN_AGENT_ID;
    }
  });

  const reload = useCallback(() => {
    void api
      .listAgents()
      .then((data) => {
        const enabled = data.agents.filter((a) => a.enabled);
        const list = enabled.length > 0 ? enabled : data.agents;
        setAgents(list);
        setProfileIdState((current) => {
          if (list.some((a) => a.id === current)) return current;
          const next = data.defaultProfileId || BUILTIN_AGENT_ID;
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {
            /* ignore */
          }
          return next;
        });
      })
      .catch(() => {
        /* keep builtin fallback */
      });
  }, []);

  useEffect(() => {
    reload();
    return onAgentsChanged(reload);
  }, [reload]);

  const setProfileId = useCallback((id: string) => {
    setProfileIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const active = useMemo(
    () => agents.find((a) => a.id === profileId) ?? agents.find((a) => a.id === BUILTIN_AGENT_ID),
    [agents, profileId],
  );

  const agentLabel = active?.name ?? "Arco";

  const agentItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = agents.map((a) => ({
      id: a.id,
      label: a.name,
      checked: a.id === profileId,
      onSelect: () => setProfileId(a.id),
    }));
    items.push({
      id: "_manage",
      label: "Manage agents…",
      separatorAbove: true,
      onSelect: () =>
        openShellWindow({ type: "system", app: "agents" }, systemAppTitle("agents")),
    });
    return items;
  }, [agents, profileId, setProfileId]);

  return { profileId, setProfileId, agentLabel, agentItems, agents, active };
}
