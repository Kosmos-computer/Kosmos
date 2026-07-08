import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Settings → MCP Servers — manage external tool providers. Each card shows
 * live status (running / connecting / error / disabled), the tools the
 * server exposes, a per-tool enable toggle (disabled tools are hidden from
 * the model), and a per-tool policy chip that writes `mcp:<id>#<tool>`
 * rules (default → auto → confirm → deny).
 */
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import type {
  AgentPolicyDecision,
  McpServerInfo,
  McpToolInfo,
  McpTransport,
} from "@shared/types";
import { MCP_PRESETS } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
  SettingsAlert,
  SettingsEmpty,
  SettingsFieldRow,
  SettingsLog,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsStatusDot,
  SettingsSubhead,
} from "../../components/patterns";
import { Button, Chip, Input } from "../../components/ui";

const STATUS_COLOR: Record<McpServerInfo["status"], string> = {
  running: "var(--arco-success)",
  connecting: "var(--arco-warning)",
  error: "var(--arco-danger, #e5484d)",
  stopped: "var(--arco-text-tertiary)",
};

function parseKeyValues(text: string): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function transportSummary(t: McpTransport): string {
  if (t.kind === "stdio") return `stdio · ${t.command} ${(t.args ?? []).join(" ")}`.trim();
  return `${t.kind} · ${t.url}`;
}

function ToolPolicyChip({
  ruleKey,
  rules,
  onChanged,
}: {
  ruleKey: string;
  rules: Record<string, AgentPolicyDecision>;
  onChanged: () => void;
}) {
  const current = rules[ruleKey];
  const cycle = async () => {
    const order: (AgentPolicyDecision | null)[] = ["auto", "confirm", "deny", null];
    const next = order[(order.indexOf(current ?? null) + 1) % order.length];
    await api.setAgentPolicyRule(ruleKey, next);
    onChanged();
  };
  return (
    <Chip active={Boolean(current)} onClick={() => void cycle()} title={i18n.t(I18nKey.APPS$SETTINGS_AGENT_POLICY_FOR_THIS_TOOL)}>
      {current ?? "default"}
    </Chip>
  );
}

function ToolRow({
  server,
  tool,
  rules,
  canManage,
  onChanged,
}: {
  server: McpServerInfo;
  tool: McpToolInfo;
  rules: Record<string, AgentPolicyDecision>;
  canManage: boolean;
  onChanged: () => void;
}) {
  const disabled = server.config.disabledTools?.includes(tool.name) ?? false;
  const toggle = async () => {
    const set = new Set(server.config.disabledTools ?? []);
    if (disabled) set.delete(tool.name);
    else set.add(tool.name);
    await api.updateMcpServer(server.config.id, { disabledTools: [...set] });
    onChanged();
  };
  return (
    <SettingsRow disabled={disabled}>
      <div className="arco-settings-tool-row">
        <code className="arco-code arco-code--nowrap">{tool.name}</code>
        <span className="arco-settings-tool-row__desc">
          {tool.readOnly ? "read · " : ""}
          {tool.description ?? ""}
        </span>
        {canManage && (
          <SettingsRowActions>
            <ToolPolicyChip
              ruleKey={`mcp:${server.config.id}#${tool.name}`}
              rules={rules}
              onChanged={onChanged}
            />
            <Chip active={!disabled} onClick={() => void toggle()} aria-pressed={!disabled}>
              {disabled ? "hidden" : "exposed"}
            </Chip>
          </SettingsRowActions>
        )}
      </div>
    </SettingsRow>
  );
}

function ServerCard({
  server,
  rules,
  canManage,
  onChanged,
}: {
  server: McpServerInfo;
  rules: Record<string, AgentPolicyDecision>;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const cfg = server.config;

  const setEnabled = async (enabled: boolean) => {
    await api.updateMcpServer(cfg.id, { enabled });
    onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`Remove MCP server "${cfg.name}"? Its tools leave the agent.`)) return;
    await api.removeMcpServer(cfg.id);
    onChanged();
  };

  const restart = async () => {
    await api.restartMcpServer(cfg.id);
    onChanged();
  };

  const viewLog = async () => {
    if (log !== null) {
      setLog(null);
      return;
    }
    const result = await api.mcpServerLog(cfg.id);
    setLog(result.log || "(log is empty)");
  };

  return (
    <SettingsPanel disabled={!cfg.enabled}>
      <SettingsPanelHeader>
        <SettingsStatusDot
          color={STATUS_COLOR[cfg.enabled ? server.status : "stopped"]}
          label={`status: ${server.status}`}
        />
        <span className="arco-settings-panel__title">{cfg.name}</span>
        <span className="arco-settings-panel__meta">{transportSummary(cfg.transport)}</span>
        {canManage && (
          <SettingsRowActions>
            <Chip active={cfg.enabled} onClick={() => void setEnabled(!cfg.enabled)} aria-pressed={cfg.enabled}>
              {cfg.enabled ? "enabled" : "disabled"}
            </Chip>
            <Button size="icon" onClick={() => void restart()} aria-label={`Restart ${cfg.name}`} title={i18n.t(I18nKey.APPS$SETTINGS_RESTART)}>
              <RefreshCw size={13} />
            </Button>
            <Button size="icon" onClick={() => void remove()} aria-label={`Remove ${cfg.name}`}>
              <Trash2 size={13} />
            </Button>
          </SettingsRowActions>
        )}
      </SettingsPanelHeader>

      {server.error ? <SettingsAlert tone="error">{server.error}</SettingsAlert> : null}

      <SettingsRow>
        <Button className="arco-card__meta" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {server.tools.length}<T k={I18nKey.APPS$SETTINGS_TOOL} />{server.tools.length === 1 ? "" : "s"}
        </Button>
        {cfg.transport.kind === "stdio" && (
          <Button className="arco-card__meta" onClick={() => void viewLog()}>
            {log !== null ? "Hide log" : "View log"}
          </Button>
        )}
      </SettingsRow>

      {expanded && server.tools.length > 0 && (
        <SettingsPanelBody>
          {server.tools.map((tool) => (
            <ToolRow
              key={tool.name}
              server={server}
              tool={tool}
              rules={rules}
              canManage={canManage}
              onChanged={onChanged}
            />
          ))}
        </SettingsPanelBody>
      )}

      {log !== null && <SettingsLog>{log}</SettingsLog>}
    </SettingsPanel>
  );
}

export function McpServersSection() {
  const canManage = useCan("settings:write");
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [rules, setRules] = useState<Record<string, AgentPolicyDecision>>({});
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"stdio" | "http" | "sse">("stdio");
  const [command, setCommand] = useState("");
  const [url, setUrl] = useState("");
  const [secrets, setSecrets] = useState("");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, policy] = await Promise.all([
        api.listMcpServers(),
        canManage ? api.getAgentPolicy() : Promise.resolve({ rules: {} }),
      ]);
      setServers(list);
      setRules(policy.rules);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MCP servers");
    }
  }, [canManage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addPreset = async (presetId: string) => {
    const preset = MCP_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    if (servers.some((s) => s.config.id === preset.id)) {
      setError(`"${preset.label}" is already configured.`);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await api.addMcpServer({ name: preset.label, transport: preset.transport });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add preset");
    } finally {
      setAdding(false);
    }
  };

  const add = async () => {
    setAdding(true);
    setError(null);
    try {
      const keyValues = parseKeyValues(secrets);
      let transport: McpTransport;
      if (kind === "stdio") {
        const parts = command.trim().split(/\s+/);
        transport = {
          kind: "stdio",
          command: parts[0] ?? "",
          ...(parts.length > 1 ? { args: parts.slice(1) } : {}),
          ...(keyValues ? { env: keyValues } : {}),
        };
      } else {
        transport = { kind, url: url.trim(), ...(keyValues ? { headers: keyValues } : {}) };
      }
      await api.addMcpServer({ name: name.trim(), transport });
      setName("");
      setCommand("");
      setUrl("");
      setSecrets("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add server");
    } finally {
      setAdding(false);
    }
  };

  const canSubmit =
    name.trim().length > 0 && (kind === "stdio" ? command.trim().length > 0 : url.trim().length > 0);

  return (
    <SettingsPage>
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_EXTERNAL_TOOL_PROVIDERS_MODEL_CONTEXT_PROTOCOL_TOOLS_FRO)}>
        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

        {servers.length === 0 ? (
          <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_MCP_SERVERS_CONFIGURED} /></SettingsEmpty>
        ) : (
          <SettingsStack>
            {servers.map((server) => (
              <ServerCard
                key={server.config.id}
                server={server}
                rules={rules}
                canManage={canManage}
                onChanged={() => void refresh()}
              />
            ))}
          </SettingsStack>
        )}

        {canManage && MCP_PRESETS.length > 0 && (
          <>
            <SettingsSubhead>Quick add</SettingsSubhead>
            <SettingsRow>
              {MCP_PRESETS.map((preset) => (
                <Chip
                  key={preset.id}
                  active={servers.some((s) => s.config.id === preset.id)}
                  onClick={() => void addPreset(preset.id)}
                  title={preset.description}
                >
                  {preset.label}
                </Chip>
              ))}
            </SettingsRow>
          </>
        )}

        {canManage && (
          <>
            <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_ADD_SERVER} /></SettingsSubhead>
            <SettingsStack>
              <SettingsFieldRow label={i18n.t(I18nKey.APPS$SKILLS_NAME)} htmlFor="mcp-name">
                <Input
                  id="mcp-name"
                  width="auto"
                  placeholder={i18n.t(I18nKey.APPS$SETTINGS_NAME_E_G_FILESYSTEM)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <select
                  className="arco-input arco-input--compact"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as typeof kind)}
                  aria-label={i18n.t(I18nKey.APPS$SETTINGS_TRANSPORT_KIND)}
                >
                  <option value="stdio"><T k={I18nKey.APPS$SETTINGS_STDIO} /></option>
                  <option value="http"><T k={I18nKey.APPS$SETTINGS_HTTP} /></option>
                  <option value="sse"><T k={I18nKey.APPS$SETTINGS_SSE} /></option>
                </select>
              </SettingsFieldRow>
              <SettingsFieldRow label={kind === "stdio" ? "Command" : "URL"}>
                {kind === "stdio" ? (
                  <Input
                    width="auto"
                    placeholder={i18n.t(I18nKey.APPS$SETTINGS_NPX_Y_MODELCONTEXTPROTOCOL_SERVER_FILESYSTEM_TMP)}
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    aria-label={i18n.t(I18nKey.APPS$SETTINGS_COMMAND)}
                  />
                ) : (
                  <Input
                    width="auto"
                    placeholder="https://example.com/mcp"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    aria-label={i18n.t(I18nKey.APPS$SETTINGS_SERVER_URL)}
                  />
                )}
              </SettingsFieldRow>
              <SettingsFieldRow
                label={kind === "stdio" ? "Env vars" : "Headers"}
                hint="One KEY=VALUE per line"
              >
                <textarea
                  className="arco-input arco-settings-log"
                  rows={2}
                  placeholder={
                    kind === "stdio"
                      ? "API_TOKEN=…"
                      : "Authorization=Bearer …"
                  }
                  value={secrets}
                  onChange={(e) => setSecrets(e.target.value)}
                  aria-label={kind === "stdio" ? "Environment variables" : "Headers"}
                />
              </SettingsFieldRow>
              <SettingsFieldRow label=" ">
                <Button variant="primary" disabled={adding || !canSubmit} onClick={() => void add()}>
                  {adding ? "Connecting…" : "Add & connect"}
                </Button>
              </SettingsFieldRow>
            </SettingsStack>
          </>
        )}
      </SettingsSection>
    </SettingsPage>
  );
}
