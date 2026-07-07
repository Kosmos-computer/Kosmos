/**
 * Settings → Agent tools — the built-in agent's capabilities, each with an
 * on/off toggle and a policy chip. "Off" removes the tool from the model's
 * schema entirely (mirrors the MCP disabledTools pattern); the policy chip
 * writes `system#<tool>` rules for finer control (auto / confirm / deny).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentPolicyDecision, AgentToolInfo } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
  ListSearch,
  SettingsAlert,
  SettingsEmpty,
  SettingsGroupLabel,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";
import { Chip } from "../../components/ui";
import { matchesListSearch } from "../../lib/listSearch";

/** Group tools by what they let the agent do, so the list scans well. */
const TOOL_GROUPS: { label: string; match: (name: string) => boolean }[] = [
  { label: "Web", match: (n) => n === "web_search" || n === "http_fetch" },
  {
    label: "Desktop & apps",
    match: (n) =>
      ["os_ui", "ui_snapshot", "mouse_click", "type_text"].includes(n) ||
      n.startsWith("app_") ||
      n === "get_app" ||
      n === "list_apps",
  },
  {
    label: "Files & shell",
    match: (n) => ["exec", "read_file", "write_file", "list_files"].includes(n),
  },
  { label: "Data", match: (n) => n.startsWith("db_") },
  { label: "Automations", match: (n) => n.includes("automation") },
  { label: "Calendar", match: (n) => n.startsWith("calendar_") },
  { label: "Skills", match: (n) => n.includes("skill") },
];

function groupTools(tools: AgentToolInfo[]): { label: string; tools: AgentToolInfo[] }[] {
  const used = new Set<string>();
  const groups = TOOL_GROUPS.map((g) => {
    const members = tools.filter((t) => !used.has(t.name) && g.match(t.name));
    members.forEach((t) => used.add(t.name));
    return { label: g.label, tools: members };
  }).filter((g) => g.tools.length > 0);
  const rest = tools.filter((t) => !used.has(t.name));
  if (rest.length > 0) groups.push({ label: "Other", tools: rest });
  return groups;
}

/** Policy chip cycling default → auto → confirm → deny (system#<tool> rule). */
function PolicyChip({
  tool,
  rules,
  onChanged,
}: {
  tool: AgentToolInfo;
  rules: Record<string, AgentPolicyDecision>;
  onChanged: () => void;
}) {
  const ruleKey = `system#${tool.name}`;
  const current = rules[ruleKey];
  const cycle = async () => {
    const order: (AgentPolicyDecision | null)[] = ["auto", "confirm", "deny", null];
    const next = order[(order.indexOf(current ?? null) + 1) % order.length];
    await api.setAgentPolicyRule(ruleKey, next);
    onChanged();
  };
  return (
    <Chip active={Boolean(current)} onClick={() => void cycle()} title="Agent policy for this tool">
      {current ?? "default"}
    </Chip>
  );
}

function ToolRow({
  tool,
  rules,
  canManage,
  onToggle,
  onChanged,
}: {
  tool: AgentToolInfo;
  rules: Record<string, AgentPolicyDecision>;
  canManage: boolean;
  onToggle: (tool: AgentToolInfo) => void;
  onChanged: () => void;
}) {
  return (
    <SettingsRow disabled={!tool.enabled}>
      <div className="arco-settings-tool-row">
        <code className="arco-code arco-code--nowrap">{tool.name}</code>
        <span className="arco-settings-tool-row__desc" title={tool.description}>
          {tool.access === "read" ? "read · " : ""}
          {tool.description}
        </span>
        {canManage && (
          <SettingsRowActions>
            <PolicyChip tool={tool} rules={rules} onChanged={onChanged} />
            <Chip
              active={tool.enabled}
              onClick={() => onToggle(tool)}
              aria-pressed={tool.enabled}
              aria-label={`${tool.enabled ? "Disable" : "Enable"} ${tool.name}`}
            >
              {tool.enabled ? "on" : "off"}
            </Chip>
          </SettingsRowActions>
        )}
      </div>
    </SettingsRow>
  );
}

export function ToolsSection() {
  const canManage = useCan("settings:write");
  const [tools, setTools] = useState<AgentToolInfo[]>([]);
  const [rules, setRules] = useState<Record<string, AgentPolicyDecision>>({});
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [list, policy] = await Promise.all([
        api.listAgentTools(),
        canManage ? api.getAgentPolicy() : Promise.resolve({ rules: {} }),
      ]);
      setTools(list);
      setRules(policy.rules);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent tools");
    }
  }, [canManage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = async (tool: AgentToolInfo) => {
    const disabled = new Set(tools.filter((t) => !t.enabled).map((t) => t.name));
    if (tool.enabled) disabled.add(tool.name);
    else disabled.delete(tool.name);
    setTools((prev) => prev.map((t) => (t.name === tool.name ? { ...t, enabled: !t.enabled } : t)));
    try {
      await api.saveSettings({ disabledTools: [...disabled] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      void refresh();
    }
  };

  const enabledCount = tools.filter((t) => t.enabled).length;

  const filteredGroups = useMemo(() => {
    const groups = groupTools(tools);
    if (!searchQuery.trim()) return groups;
    return groups
      .map((group) => ({
        ...group,
        tools: group.tools.filter((tool) =>
          matchesListSearch(searchQuery, tool.name, tool.description, group.label, tool.access),
        ),
      }))
      .filter((group) => group.tools.length > 0);
  }, [tools, searchQuery]);

  return (
    <SettingsPage>
      <SettingsSection
        intro={`What the built-in agent is allowed to do (${enabledCount}/${tools.length} on). Switching a tool off hides it from the agent entirely; the policy chip keeps it available but controls approval.`}
      >
        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}
        {tools.length > 0 ? (
          <ListSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search agent tools"
            ariaLabel="Search agent tools"
          />
        ) : null}
        {filteredGroups.length === 0 && tools.length > 0 ? (
          <SettingsEmpty>No tools match your search.</SettingsEmpty>
        ) : null}
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <SettingsGroupLabel>{group.label}</SettingsGroupLabel>
            <SettingsStack>
              {group.tools.map((tool) => (
                <ToolRow
                  key={tool.name}
                  tool={tool}
                  rules={rules}
                  canManage={canManage}
                  onToggle={(t) => void toggle(t)}
                  onChanged={() => void refresh()}
                />
              ))}
            </SettingsStack>
          </div>
        ))}
      </SettingsSection>
    </SettingsPage>
  );
}
