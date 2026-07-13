/**
 * Polls agent-adjacent tool health for the menubar tray: desktop channel
 * (shell-events / cursor interactivity), voice, Cursor API, MCP, channels,
 * and automations. Lightweight local signals always refresh; remote probes
 * run on an interval and again whenever the dropdown opens.
 */
import { useCallback, useEffect, useState } from "react";
import type { AgentKind, ChannelInfo, McpServerInfo } from "@shared/types";
import { api } from "../lib/api";
import { voiceClient } from "../voice/VoiceClient";
import { useShellEventsStatus, type ShellEventsStatus } from "./shellEvents";

const POLL_MS = 10_000;

export type ToolTone = "online" | "offline" | "checking" | "idle";

export interface ToolStatusRow {
  id: string;
  name: string;
  detail: string;
  status: string;
  tone: ToolTone;
}

export interface ToolsStatusSnapshot {
  rows: ToolStatusRow[];
  /** Aggregate for the menubar trigger dot. */
  overall: ToolTone;
  loading: boolean;
  refresh: (opts?: { probeCursor?: boolean }) => Promise<void>;
}

function shellRow(shell: ShellEventsStatus): ToolStatusRow {
  if (shell === "connected") {
    return {
      id: "desktop-channel",
      name: "Desktop channel",
      detail: "shell-events · cursor tools & approvals",
      status: "Connected",
      tone: "online",
    };
  }
  if (shell === "connecting") {
    return {
      id: "desktop-channel",
      name: "Desktop channel",
      detail: "shell-events · cursor tools & approvals",
      status: "Connecting…",
      tone: "checking",
    };
  }
  return {
    id: "desktop-channel",
    name: "Desktop channel",
    detail: "shell-events · cursor tools & approvals",
    status: "Disconnected — voice runs headless",
    tone: "offline",
  };
}

function voiceRow(available: boolean, probing: boolean): ToolStatusRow {
  if (probing && !available) {
    return {
      id: "voice",
      name: "Voice",
      detail: "localhost:4630",
      status: "Checking…",
      tone: "checking",
    };
  }
  if (available) {
    const state = voiceClient.getState();
    return {
      id: "voice",
      name: "Voice",
      detail: "localhost:4630",
      status: state === "idle" ? "Ready" : `Active · ${state}`,
      tone: "online",
    };
  }
  return {
    id: "voice",
    name: "Voice",
    detail: "localhost:4630",
    status: "Offline",
    tone: "offline",
  };
}

function cursorRow(
  agent: AgentKind | null,
  connected: boolean | null,
  error: string | null,
  probing: boolean,
): ToolStatusRow {
  if (agent !== "cursor") {
    return {
      id: "cursor",
      name: "Cursor agent",
      detail: agent ? `Active agent: ${agent}` : "Agent runtime",
      status: "Not selected",
      tone: "idle",
    };
  }
  if (probing || connected === null) {
    return {
      id: "cursor",
      name: "Cursor agent",
      detail: "API key · cloud/local runtime",
      status: probing ? "Checking…" : "Open to verify",
      tone: probing ? "checking" : "idle",
    };
  }
  if (connected) {
    return {
      id: "cursor",
      name: "Cursor agent",
      detail: "API key · cloud/local runtime",
      status: "Connected",
      tone: "online",
    };
  }
  return {
    id: "cursor",
    name: "Cursor agent",
    detail: "API key · cloud/local runtime",
    status: error ?? "Not connected",
    tone: "offline",
  };
}

function mcpRow(servers: McpServerInfo[] | null, probing: boolean): ToolStatusRow {
  if (servers === null) {
    return {
      id: "mcp",
      name: "MCP servers",
      detail: "External tool processes",
      status: probing ? "Checking…" : "Unknown",
      tone: "checking",
    };
  }
  if (servers.length === 0) {
    return {
      id: "mcp",
      name: "MCP servers",
      detail: "External tool processes",
      status: "None configured",
      tone: "idle",
    };
  }
  const running = servers.filter((s) => s.status === "running").length;
  const errored = servers.filter((s) => s.status === "error").length;
  const connecting = servers.filter((s) => s.status === "connecting").length;
  if (errored > 0) {
    return {
      id: "mcp",
      name: "MCP servers",
      detail: `${servers.length} configured`,
      status: `${errored} error · ${running} running`,
      tone: "offline",
    };
  }
  if (connecting > 0 && running === 0) {
    return {
      id: "mcp",
      name: "MCP servers",
      detail: `${servers.length} configured`,
      status: "Connecting…",
      tone: "checking",
    };
  }
  return {
    id: "mcp",
    name: "MCP servers",
    detail: `${servers.length} configured`,
    status: `${running} running`,
    tone: running > 0 ? "online" : "idle",
  };
}

function channelsRow(channels: ChannelInfo[] | null, probing: boolean): ToolStatusRow {
  if (channels === null) {
    return {
      id: "channels",
      name: "Channels",
      detail: "Telegram and messaging bridges",
      status: probing ? "Checking…" : "Unknown",
      tone: "checking",
    };
  }
  if (channels.length === 0) {
    return {
      id: "channels",
      name: "Channels",
      detail: "Telegram and messaging bridges",
      status: "None configured",
      tone: "idle",
    };
  }
  const running = channels.filter((c) => c.status === "running").length;
  const errored = channels.filter((c) => c.status === "error").length;
  if (errored > 0) {
    return {
      id: "channels",
      name: "Channels",
      detail: `${channels.length} configured`,
      status: `${errored} error · ${running} running`,
      tone: "offline",
    };
  }
  return {
    id: "channels",
    name: "Channels",
    detail: `${channels.length} configured`,
    status: `${running} running`,
    tone: running > 0 ? "online" : "idle",
  };
}

function automationsRow(ok: boolean | null, probing: boolean): ToolStatusRow {
  if (ok === null) {
    return {
      id: "automations",
      name: "Automations",
      detail: "Scheduler health",
      status: probing ? "Checking…" : "Unknown",
      tone: "checking",
    };
  }
  return {
    id: "automations",
    name: "Automations",
    detail: "Scheduler health",
    status: ok ? "Healthy" : "Error",
    tone: ok ? "online" : "offline",
  };
}

function overallTone(rows: ToolStatusRow[]): ToolTone {
  if (rows.some((r) => r.tone === "offline")) return "offline";
  if (rows.some((r) => r.tone === "checking")) return "checking";
  if (rows.some((r) => r.tone === "online")) return "online";
  return "idle";
}

export function useToolsStatus(open: boolean): ToolsStatusSnapshot {
  const localShell = useShellEventsStatus();
  const [serverShellClients, setServerShellClients] = useState<number | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voiceProbing, setVoiceProbing] = useState(true);
  const [agent, setAgent] = useState<AgentKind | null>(null);
  const [cursorConnected, setCursorConnected] = useState<boolean | null>(null);
  const [cursorError, setCursorError] = useState<string | null>(null);
  const [cursorProbing, setCursorProbing] = useState(false);
  const [mcp, setMcp] = useState<McpServerInfo[] | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[] | null>(null);
  const [automationsOk, setAutomationsOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (opts: { probeCursor?: boolean } = {}) => {
    setVoiceProbing(true);
    const voiceOk = await voiceClient.checkHealth();
    setVoiceAvailable(voiceOk);
    setVoiceProbing(false);

    try {
      const shell = await api.shellStatus();
      setServerShellClients(shell.clients);
    } catch {
      setServerShellClients(null);
    }

    let nextAgent: AgentKind | null = null;
    try {
      const settings = await api.getSettings();
      nextAgent = settings.agent;
      setAgent(settings.agent);
    } catch {
      setAgent(null);
    }

    // Cursor API probe is relatively expensive — only when the tray is open
    // (or the caller asks) and Cursor is the active agent runtime.
    if (opts.probeCursor && nextAgent === "cursor") {
      setCursorProbing(true);
      try {
        const result = await api.testCursorConnection();
        setCursorConnected(result.connected);
        setCursorError(result.error ?? null);
      } catch (err) {
        setCursorConnected(false);
        setCursorError(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setCursorProbing(false);
      }
    } else if (nextAgent !== "cursor") {
      setCursorConnected(null);
      setCursorError(null);
      setCursorProbing(false);
    }

    try {
      setMcp(await api.listMcpServers());
    } catch {
      setMcp(null);
    }

    try {
      setChannels(await api.listChannels());
    } catch {
      setChannels(null);
    }

    try {
      const health = await api.automationHealth();
      setAutomationsOk(health.status === "ok");
    } catch {
      setAutomationsOk(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh({ probeCursor: false });
    const id = window.setInterval(() => void refresh({ probeCursor: false }), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (open) void refresh({ probeCursor: true });
  }, [open, refresh]);

  // Prefer the server's client count — that's what voice uses for interactive.
  // Fall back to the local EventSource readyState when the probe fails.
  const shell: ShellEventsStatus =
    serverShellClients !== null
      ? serverShellClients > 0
        ? "connected"
        : localShell === "connecting"
          ? "connecting"
          : "disconnected"
      : localShell;

  const rows: ToolStatusRow[] = [
    shellRow(shell),
    voiceRow(voiceAvailable, voiceProbing),
    cursorRow(agent, cursorConnected, cursorError, cursorProbing),
    mcpRow(mcp, loading),
    channelsRow(channels, loading),
    automationsRow(automationsOk, loading),
  ];

  return {
    rows,
    overall: overallTone(rows),
    loading,
    refresh,
  };
}

export function toolToneDotClass(tone: ToolTone): string {
  if (tone === "online") return "arco-menubar__status-dot arco-menubar__status-dot--online";
  if (tone === "offline") return "arco-menubar__status-dot arco-menubar__status-dot--offline";
  return "arco-menubar__status-dot";
}
