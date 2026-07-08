import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
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
import {
  SettingsAlert,
  SettingsDivider,
  SettingsEmpty,
  SettingsFieldRow,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { Button, Chip, Input } from "../../components/ui";

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
    <SettingsPage>
      <SettingsSection
        intro={
          <><T k={I18nKey.APPS$SETTINGS_RULES_DECIDE_WHETHER_THE_AGENT_RUNS_A_TOOL_AUTOMATICALLY} /><code><T k={I18nKey.APPS$SETTINGS_SYSTEM} /></code>, <code><T k={I18nKey.APPS$SETTINGS_MCP_LT_SERVER_GT} /></code>, <code><T k={I18nKey.APPS$SETTINGS_APP_LT_ID_GT} /></code><T k={I18nKey.APPS$SETTINGS_OPTIONALLY_NARROWED_WITH} /><code><T k={I18nKey.APPS$SETTINGS_LT_TOOL_GT} /></code><T k={I18nKey.APPS$SETTINGS_WITHOUT_A_RULE_READS_RUN_AUTOMATICALLY_AND_WRITES_ASK} /></>
        }
      >
        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

        {ruleEntries.length === 0 ? (
          <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_RULES_YET_DEFAULTS_APPLY} /></SettingsEmpty>
        ) : (
          <SettingsStack>
            {ruleEntries.map(([key, decision]) => {
              const Icon = DECISION_ICON[decision];
              return (
                <SettingsRow key={key}>
                  <Icon size={14} style={{ color: DECISION_COLOR[decision], flexShrink: 0 }} />
                  <code className="arco-code arco-settings-tool-row__desc">{key}</code>
                  <SettingsRowActions>
                    <Chip active onClick={() => void cycle(key, decision)} title={i18n.t(I18nKey.APPS$SETTINGS_CLICK_TO_CYCLE_AUTO_CONFIRM_DENY)}>
                      {decision}
                    </Chip>
                    <Button size="icon" onClick={() => void remove(key)} aria-label={`Remove rule ${key}`}>
                      <Trash2 size={13} />
                    </Button>
                  </SettingsRowActions>
                </SettingsRow>
              );
            })}
          </SettingsStack>
        )}

        <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_ADD_RULE} /></SettingsSubhead>
        <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_KEY)} htmlFor="agent-rule-key">
          <Input
            id="agent-rule-key"
            width="auto"
            placeholder={i18n.t(I18nKey.APPS$SETTINGS_MCP_LINEAR_CREATE_ISSUE)}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addRule()}
          />
          <select
            className="arco-input arco-input--compact"
            value={newDecision}
            onChange={(e) => setNewDecision(e.target.value as AgentPolicyDecision)}
            aria-label={i18n.t(I18nKey.APPS$SETTINGS_RULE_DECISION)}
          >
            {DECISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <Button variant="primary" disabled={!newKey.trim()} onClick={() => void addRule()}><T k={I18nKey.COMMON$ADD} /></Button>
        </SettingsFieldRow>

        <SettingsDivider />

        <SettingsRow>
          <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_RECENT_ACTIVITY} /></SettingsSubhead>
          <SettingsRowActions>
            <Button size="icon" onClick={() => void refresh()} aria-label={i18n.t(I18nKey.APPS$SETTINGS_REFRESH_ACTIVITY)}>
              <RefreshCw size={13} />
            </Button>
          </SettingsRowActions>
        </SettingsRow>

        {audit.length === 0 ? (
          <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_PRIVILEGED_CALLS_RECORDED_YET} /></SettingsEmpty>
        ) : (
          <SettingsStack>
            {audit.map((entry, i) => (
              <div key={`${entry.ts}-${i}`} className="arco-settings-audit-row">
                <span className="arco-settings-audit-time">{new Date(entry.ts).toLocaleString()}</span>
                <span style={{ color: entry.allowed ? "var(--arco-success)" : "var(--arco-danger, #e5484d)" }}>
                  {entry.allowed ? "allowed" : "denied"}
                </span>
                <code className="arco-code">{entry.method}</code>
                <span className="arco-settings-panel__meta">{describeCaller(entry.caller)}</span>
                {entry.detail ? <span className="arco-settings-audit-detail">{entry.detail}</span> : null}
              </div>
            ))}
          </SettingsStack>
        )}
      </SettingsSection>
    </SettingsPage>
  );
}
