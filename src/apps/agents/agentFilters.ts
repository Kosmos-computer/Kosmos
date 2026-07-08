import type { AgentProfile, AgentRuntimeFilter, AgentStatusFilter } from "./types";

export function runtimeLabel(runtime: AgentProfile["runtime"]): string {
  switch (runtime) {
    case "builtin":
      return "Built-in";
    case "acp":
      return "ACP";
    case "cursor":
      return "Cursor";
    case "automation":
      return "Automation";
    case "channel":
      return "Channel";
  }
}

export function statusLabel(status: AgentProfile["status"]): string {
  switch (status) {
    case "active":
      return "Active";
    case "idle":
      return "Idle";
    case "running":
      return "Running";
    case "offline":
      return "Offline";
  }
}

export function filterAgents(
  agents: AgentProfile[],
  search: string,
  runtimeFilter: AgentRuntimeFilter,
  statusFilter: AgentStatusFilter,
): AgentProfile[] {
  const query = search.trim().toLowerCase();

  return agents.filter((agent) => {
    if (runtimeFilter !== "all" && agent.runtime !== runtimeFilter) return false;

    if (statusFilter === "enabled" && !agent.enabled) return false;
    if (statusFilter === "disabled" && agent.enabled) return false;
    if (statusFilter === "running" && agent.status !== "running") return false;

    if (!query) return true;

    const haystack = [
      agent.name,
      agent.tagline,
      agent.description,
      agent.id,
      runtimeLabel(agent.runtime),
      ...agent.labels,
      ...agent.approvedModels,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
