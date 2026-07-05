/**
 * Settings → Agent tools — the built-in agent's capabilities, each with an
 * on/off toggle and a policy chip. "Off" removes the tool from the model's
 * schema entirely (mirrors the MCP disabledTools pattern); the policy chip
 * writes `system#<tool>` rules for finer control (auto / confirm / deny).
 */
import { useCallback, useEffect, useState } from "react";
import type { AgentPolicyDecision, AgentToolInfo } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";

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
    <button
      className={`arco-chip ${current ? "arco-chip--active" : ""}`}
      onClick={() => void cycle()}
      title="Agent policy for this tool (default: the tool's own built-in gates)"
    >
      {current ?? "default"}
    </button>
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
    <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: tool.enabled ? 1 : 0.55 }}>
      <code style={{ fontSize: "var(--arco-text-sm)", flexShrink: 0 }}>{tool.name}</code>
      <span
        style={{
          flex: 1,
          color: "var(--arco-text-tertiary)",
          fontSize: "var(--arco-text-xs)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={tool.description}
      >
        {tool.access === "read" ? "read · " : ""}
        {tool.description}
      </span>
      {canManage && (
        <>
          <PolicyChip tool={tool} rules={rules} onChanged={onChanged} />
          <button
            className={`arco-chip ${tool.enabled ? "arco-chip--active" : ""}`}
            onClick={() => onToggle(tool)}
            aria-pressed={tool.enabled}
            aria-label={`${tool.enabled ? "Disable" : "Enable"} ${tool.name}`}
          >
            {tool.enabled ? "on" : "off"}
          </button>
        </>
      )}
    </div>
  );
}

export function ToolsSection() {
  const canManage = useCan("settings:write");
  const [tools, setTools] = useState<AgentToolInfo[]>([]);
  const [rules, setRules] = useState<Record<string, AgentPolicyDecision>>({});
  const [error, setError] = useState<string | null>(null);

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
    // Optimistic flip; saveSettings patches only disabledTools so the rest
    // of the settings (API key etc.) are untouched.
    setTools((prev) => prev.map((t) => (t.name === tool.name ? { ...t, enabled: !t.enabled } : t)));
    try {
      await api.saveSettings({ disabledTools: [...disabled] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      void refresh();
    }
  };

  const enabledCount = tools.filter((t) => t.enabled).length;

  return (
    <section className="arco-form">
      <strong>Agent tools</strong>
      <span style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-sm)" }}>
        What the built-in agent is allowed to do ({enabledCount}/{tools.length} on). Switching a
        tool off hides it from the agent entirely; the policy chip instead keeps it available but
        controls approval (auto-run, confirm first, or deny).
      </span>

      {error && (
        <span style={{ color: "var(--arco-danger, #e5484d)", fontSize: "var(--arco-text-sm)" }}>
          {error}
        </span>
      )}

      {groupTools(tools).map((group) => (
        <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              color: "var(--arco-text-tertiary)",
              fontSize: "var(--arco-text-xs)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {group.label}
          </span>
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
        </div>
      ))}
    </section>
  );
}
