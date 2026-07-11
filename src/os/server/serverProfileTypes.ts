/** Saved Arco backend the mobile shell connects to. */
export type ServerProfileKind = "cloud" | "home" | "local-linux" | "custom";

export interface ServerProfile {
  id: string;
  name: string;
  /** Normalized origin, e.g. https://kosmos.example.com */
  url: string;
  kind: ServerProfileKind;
  lastUsedAt?: number;
}

export interface DiscoveredServer {
  url: string;
  label: string;
  needsSetup: boolean;
  source: "scan" | "tailscale-hint" | "linux-bridge";
}

export interface ServerProfileSnapshot {
  profiles: ServerProfile[];
  activeId: string | null;
  /** Last /24 subnet used for LAN scans, e.g. 10.0.0 */
  scanSubnet: string | null;
}
