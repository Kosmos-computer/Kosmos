/**
 * Settings → MCP Servers — manage external tool providers. Each card shows
 * live status (running / connecting / error / disabled), the tools the
 * server exposes, a per-tool enable toggle (disabled tools are hidden from
 * the model), and a per-tool policy chip that writes `mcp:<id>#<tool>`
 * rules (default → auto → confirm → deny).
 *
 * The add form supports both transports: a stdio command (e.g.
 * `npx -y @modelcontextprotocol/server-filesystem /tmp`) or an http/sse URL.
 * Env vars and headers accept KEY=VALUE lines; values come back masked.
 */
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import type {
  AgentPolicyDecision,
  McpServerInfo,
  McpToolInfo,
  McpTransport,
} from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";

const STATUS_COLOR: Record<McpServerInfo["status"], string> = {
  running: "var(--arco-success)",
  connecting: "var(--arco-warning)",
  error: "var(--arco-danger, #e5484d)",
  stopped: "var(--arco-text-tertiary)",
};

/** Parse "KEY=VALUE" lines into a record (used for env vars and headers). */
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

/** Policy chip for one MCP tool: default → auto → confirm → deny → default. */
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
    <button
      className={`arco-chip ${current ? "arco-chip--active" : ""}`}
      onClick={() => void cycle()}
      title="Agent policy for this tool (default: reads auto, writes confirm)"
    >
      {current ?? "default"}
    </button>
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
    <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: disabled ? 0.55 : 1 }}>
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
      >
        {tool.readOnly ? "read · " : ""}
        {tool.description ?? ""}
      </span>
      {canManage && (
        <>
          <ToolPolicyChip
            ruleKey={`mcp:${server.config.id}#${tool.name}`}
            rules={rules}
            onChanged={onChanged}
          />
          <button
            className={`arco-chip ${disabled ? "" : "arco-chip--active"}`}
            onClick={() => void toggle()}
            aria-pressed={!disabled}
          >
            {disabled ? "hidden" : "exposed"}
          </button>
        </>
      )}
    </div>
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        border: "1px solid var(--arco-border)",
        borderRadius: "var(--arco-radius-md, 8px)",
        opacity: cfg.enabled ? 1 : 0.6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          aria-label={`status: ${server.status}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: STATUS_COLOR[cfg.enabled ? server.status : "stopped"],
            flexShrink: 0,
          }}
        />
        <strong style={{ fontSize: "var(--arco-text-md)" }}>{cfg.name}</strong>
        <span
          style={{
            color: "var(--arco-text-tertiary)",
            fontSize: "var(--arco-text-xs)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {transportSummary(cfg.transport)}
        </span>
        <span style={{ flex: 1 }} />
        {canManage && (
          <>
            <button
              className={`arco-chip ${cfg.enabled ? "arco-chip--active" : ""}`}
              onClick={() => void setEnabled(!cfg.enabled)}
              aria-pressed={cfg.enabled}
            >
              {cfg.enabled ? "enabled" : "disabled"}
            </button>
            <button
              className="arco-btn arco-btn--icon"
              onClick={() => void restart()}
              aria-label={`Restart ${cfg.name}`}
              title="Restart"
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="arco-btn arco-btn--icon"
              onClick={() => void remove()}
              aria-label={`Remove ${cfg.name}`}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>

      {server.error && (
        <span style={{ color: "var(--arco-danger, #e5484d)", fontSize: "var(--arco-text-sm)" }}>
          {server.error}
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="arco-btn"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          style={{ fontSize: "var(--arco-text-xs)" }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {server.tools.length} tool{server.tools.length === 1 ? "" : "s"}
        </button>
        {cfg.transport.kind === "stdio" && (
          <button className="arco-btn" style={{ fontSize: "var(--arco-text-xs)" }} onClick={() => void viewLog()}>
            {log !== null ? "Hide log" : "View log"}
          </button>
        )}
      </div>

      {expanded && server.tools.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
        </div>
      )}

      {log !== null && (
        <pre
          style={{
            fontSize: "var(--arco-text-xs)",
            fontFamily: "var(--arco-font-mono)",
            background: "var(--arco-bg-sunk)",
            padding: 8,
            borderRadius: "var(--arco-radius-s, 4px)",
            maxHeight: 200,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {log}
        </pre>
      )}
    </div>
  );
}

export function McpServersSection() {
  const canManage = useCan("settings:write");
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [rules, setRules] = useState<Record<string, AgentPolicyDecision>>({});
  const [error, setError] = useState<string | null>(null);

  // Add form
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

  const add = async () => {
    setAdding(true);
    setError(null);
    try {
      const keyValues = parseKeyValues(secrets);
      let transport: McpTransport;
      if (kind === "stdio") {
        // First token is the command, the rest are args — matches how users
        // paste "npx -y @modelcontextprotocol/server-filesystem /tmp".
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
    <section className="arco-form">
      <strong>MCP servers</strong>
      <span style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-sm)" }}>
        External tool providers (Model Context Protocol). Tools from running servers join the
        agent; writes ask for approval unless you set a policy rule.
      </span>

      {error && (
        <span style={{ color: "var(--arco-danger, #e5484d)", fontSize: "var(--arco-text-sm)" }}>
          {error}
        </span>
      )}

      {servers.length === 0 ? (
        <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-sm)" }}>
          No MCP servers configured.
        </span>
      ) : (
        servers.map((server) => (
          <ServerCard
            key={server.config.id}
            server={server}
            rules={rules}
            canManage={canManage}
            onChanged={() => void refresh()}
          />
        ))
      )}

      {canManage && (
        <>
          <label className="arco-label" htmlFor="mcp-name">
            Add server
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="mcp-name"
              className="arco-input"
              style={{ flex: 1 }}
              placeholder="Name (e.g. Filesystem)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="arco-input"
              style={{ width: 100 }}
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              aria-label="Transport kind"
            >
              <option value="stdio">stdio</option>
              <option value="http">http</option>
              <option value="sse">sse</option>
            </select>
          </div>
          {kind === "stdio" ? (
            <input
              className="arco-input"
              placeholder="npx -y @modelcontextprotocol/server-filesystem /tmp"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              aria-label="Command"
            />
          ) : (
            <input
              className="arco-input"
              placeholder="https://example.com/mcp"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-label="Server URL"
            />
          )}
          <textarea
            className="arco-input"
            rows={2}
            placeholder={
              kind === "stdio" ? "Env vars, one per line: API_TOKEN=…" : "Headers, one per line: Authorization=Bearer …"
            }
            value={secrets}
            onChange={(e) => setSecrets(e.target.value)}
            aria-label={kind === "stdio" ? "Environment variables" : "Headers"}
            style={{ fontFamily: "var(--arco-font-mono)", fontSize: "var(--arco-text-xs)" }}
          />
          <div>
            <button
              className="arco-btn arco-btn--primary"
              disabled={adding || !canSubmit}
              onClick={() => void add()}
            >
              {adding ? "Connecting…" : "Add & connect"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
