import type { BentoItem } from "./types";

export type BentoConnectionStatus = "connected" | "polling" | "static" | "idle";
export type BentoConnectionType = "store" | "api" | "external" | "static";

export interface BentoConnection {
  id: string;
  label: string;
  type: BentoConnectionType;
  endpoint?: string;
  status: BentoConnectionStatus;
  description: string;
  /** Whether the user can toggle this connection (stub — wired later). */
  editable: boolean;
}

const LIVE_CONNECTIONS: Record<string, Omit<BentoConnection, "id">> = {
  apps: {
    label: "OS app registry",
    type: "store",
    status: "connected",
    description: "Counts generated, web, and installed apps from the shell store.",
    editable: false,
  },
  sessions: {
    label: "Sessions API",
    type: "api",
    endpoint: "/api/sessions",
    status: "polling",
    description: "Polls session list every 30 seconds.",
    editable: true,
  },
  automations: {
    label: "Automations API",
    type: "api",
    endpoint: "/api/automations",
    status: "polling",
    description: "Polls automation list every 30 seconds.",
    editable: true,
  },
  agent: {
    label: "Agent runtime",
    type: "store",
    status: "connected",
    description: "Reflects agent busy/idle state from the OS store.",
    editable: false,
  },
  clock: {
    label: "System clock",
    type: "static",
    status: "connected",
    description: "Local time updated every second.",
    editable: false,
  },
};

/** Resolve data connections for a bento widget instance. */
export function getWidgetConnections(item: BentoItem): BentoConnection[] {
  const connections: BentoConnection[] = [];

  if (item.content.liveKey) {
    const live = LIVE_CONNECTIONS[item.content.liveKey];
    if (live) {
      connections.push({ id: item.content.liveKey, ...live });
    }
  }

  if (item.content.kind === "weather") {
    connections.push({
      id: "open-meteo",
      label: "Open-Meteo",
      type: "external",
      endpoint: "https://api.open-meteo.com",
      status: "polling",
      description: "Live weather forecast — refreshes every 5 minutes.",
      editable: true,
    });
  }

  if (item.content.kind === "list" || item.content.kind === "insight") {
    connections.push({
      id: "static-content",
      label: "Static content",
      type: "static",
      status: "static",
      description: "Widget body is defined in layout JSON — no live feed.",
      editable: false,
    });
  }

  if (connections.length === 0) {
    connections.push({
      id: "none",
      label: "No connections",
      type: "static",
      status: "idle",
      description: "This widget does not subscribe to live data.",
      editable: false,
    });
  }

  return connections;
}
