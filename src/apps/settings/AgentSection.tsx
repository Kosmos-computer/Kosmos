/**
 * Settings → Agent permissions — the agent-side twin of the Apps section.
 * Policy rules decide whether the agent may call a tool automatically, must
 * ask first, or is blocked. Rules are keyed by tool source ("system",
 * "mcp:<serverId>", "app:<appId>"), optionally narrowed to one tool with
 * "#<toolName>". "Always allow/deny" answers from confirm cards land here
 * too, so this list is also where you undo them.
 *
 * Below the rules sits the audit trail: every privileged call the agent or
 * an app made, allowed or not — the "why did you move my meeting?" record.
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, ShieldOff, ShieldQuestion, Trash2 } from "lucide-react";
import type { AgentPolicyDecision, AuditEntry } from "@shared/types";
import { api } from "../../lib/api";

const DECISIONS: AgentPolicyDecision[] = ["auto", "confirm", "deny"];

const DECISION_ICON = {
  auto: ShieldCheck,
  confirm: ShieldQuestion,
  deny: ShieldOff,
} as const;

const DECISION_COLOR = {
  auto: "var(--arco-success)",
  confirm: "var(--arco-warning)",
  deny: "var(--arco-danger, #e5484d)",
} as const;

function describeCaller(caller: AuditEntry["caller"]): string {
  switch (caller.kind) {
    case "app":
      return caller.appId;
    case "agent":
      return "agent";
    case "external":
      return `external:${caller.clientId}`;
  }
}

export function AgentSection() {
  const [rules, setRules] = useState<Record<string, AgentPolicyDecision>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newDecision, setNewDecision] = useState<AgentPolicyDecision>("confirm");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [policy, entries] = await Promise.all([
        api.getAgentPolicy(),
        api.getAudit({ limit: 30 }),
      ]);
      setRules(policy.rules);
      setAudit(entries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent policy");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const cycle = async (key: string, current: AgentPolicyDecision) => {
    const next = DECISIONS[(DECISIONS.indexOf(current) + 1) % DECISIONS.length];
    const result = await api.setAgentPolicyRule(key, next);
    setRules(result.rules);
  };

  const remove = async (key: string) => {
    const result = await api.setAgentPolicyRule(key, null);
    setRules(result.rules);
  };

  const addRule = async () => {
    const key = newKey.trim();
    if (!key) return;
    const result = await api.setAgentPolicyRule(key, newDecision);
    setRules(result.rules);
    setNewKey("");
  };

  const ruleEntries = Object.entries(rules);

  return (
    <section className="arco-form">
      <strong>Agent permissions</strong>
      <span style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-sm)" }}>
        Rules decide whether the agent runs a tool automatically, asks first, or is blocked. Keys
        are a tool source (<code>system</code>, <code>mcp:&lt;server&gt;</code>,{" "}
        <code>app:&lt;id&gt;</code>) optionally narrowed with <code>#&lt;tool&gt;</code>. Without a
        rule, reads run automatically and writes ask.
      </span>

      {error && (
        <span style={{ color: "var(--arco-danger, #e5484d)", fontSize: "var(--arco-text-sm)" }}>
          {error}
        </span>
      )}

      {ruleEntries.length === 0 ? (
        <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-sm)" }}>
          No rules yet — defaults apply.
        </span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ruleEntries.map(([key, decision]) => {
            const Icon = DECISION_ICON[decision];
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={14} style={{ color: DECISION_COLOR[decision], flexShrink: 0 }} />
                <code style={{ flex: 1, fontSize: "var(--arco-text-sm)", wordBreak: "break-all" }}>
                  {key}
                </code>
                <button
                  className="arco-chip arco-chip--active"
                  onClick={() => void cycle(key, decision)}
                  title="Click to cycle auto → confirm → deny"
                >
                  {decision}
                </button>
                <button
                  className="arco-btn arco-btn--icon"
                  onClick={() => void remove(key)}
                  aria-label={`Remove rule ${key}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <label className="arco-label" htmlFor="agent-rule-key">
        Add rule
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="agent-rule-key"
          className="arco-input"
          style={{ flex: 1 }}
          placeholder="mcp:linear#create_issue"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addRule()}
        />
        <select
          className="arco-input"
          style={{ width: 110 }}
          value={newDecision}
          onChange={(e) => setNewDecision(e.target.value as AgentPolicyDecision)}
          aria-label="Rule decision"
        >
          {DECISIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          className="arco-btn arco-btn--primary"
          disabled={!newKey.trim()}
          onClick={() => void addRule()}
        >
          Add
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <strong style={{ fontSize: "var(--arco-text-sm)" }}>Recent activity</strong>
        <span style={{ flex: 1 }} />
        <button
          className="arco-btn arco-btn--icon"
          onClick={() => void refresh()}
          aria-label="Refresh activity"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      {audit.length === 0 ? (
        <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-sm)" }}>
          No privileged calls recorded yet.
        </span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {audit.map((entry, i) => (
            <div
              key={`${entry.ts}-${i}`}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                fontSize: "var(--arco-text-xs)",
              }}
            >
              <span style={{ color: "var(--arco-text-tertiary)", whiteSpace: "nowrap" }}>
                {new Date(entry.ts).toLocaleString()}
              </span>
              <span
                style={{
                  color: entry.allowed ? "var(--arco-success)" : "var(--arco-danger, #e5484d)",
                }}
              >
                {entry.allowed ? "allowed" : "denied"}
              </span>
              <code style={{ wordBreak: "break-all" }}>{entry.method}</code>
              <span style={{ color: "var(--arco-text-secondary)" }}>
                {describeCaller(entry.caller)}
              </span>
              {entry.detail && (
                <span
                  style={{
                    color: "var(--arco-text-tertiary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
