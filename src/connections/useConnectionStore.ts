/**
 * STUB: client-side connected-account store (localStorage).
 * Phase 2 — server connectionStore + OAuth gateway mirroring channelStore.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ConnectionDomain,
  ServiceConnection,
  ServiceProviderId,
} from "@shared/serviceConnections";
import { presetById } from "@shared/serviceConnections";

const STORAGE_KEY = "arco-service-connections";

export interface ConnectServiceInput {
  domain: ConnectionDomain;
  provider: ServiceProviderId;
  instanceUrl?: string;
  accountHint?: string;
  /** Stub only — real OAuth/token vault lives server-side later. */
  token?: string;
}

interface ConnectionStore {
  connections: ServiceConnection[];
  addConnection: (input: ConnectServiceInput) => ServiceConnection;
  removeConnection: (id: string) => void;
  connectionsForDomain: (domain: ConnectionDomain) => ServiceConnection[];
  connectionByProvider: (domain: ConnectionDomain, provider: ServiceProviderId) => ServiceConnection | undefined;
}

function slugId(provider: ServiceProviderId, instanceUrl?: string): string {
  const host = instanceUrl?.replace(/^https?:\/\//, "").split("/")[0] ?? "default";
  return `conn_${provider}_${host.replace(/[^a-z0-9]+/gi, "-").slice(0, 24)}_${Date.now().toString(36)}`;
}

function buildLabel(provider: ServiceProviderId, accountHint?: string, instanceUrl?: string): string {
  const preset = presetById(provider);
  if (accountHint) return accountHint.includes("@") ? accountHint : `${accountHint} · ${preset.label}`;
  if (instanceUrl) return instanceUrl.replace(/^https?:\/\//, "");
  return preset.label;
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      connections: [],

      addConnection(input) {
        const preset = presetById(input.provider);
        if (preset.domain !== input.domain) {
          throw new Error(`Provider ${input.provider} is not valid for domain ${input.domain}`);
        }
        const connection: ServiceConnection = {
          id: slugId(input.provider, input.instanceUrl),
          domain: input.domain,
          provider: input.provider,
          label: buildLabel(input.provider, input.accountHint, input.instanceUrl),
          instanceUrl: input.instanceUrl?.trim() || undefined,
          accountHint: input.accountHint?.trim() || undefined,
          status: "connected",
          connectedAt: new Date().toISOString(),
        };
        set((state) => ({ connections: [...state.connections, connection] }));
        return connection;
      },

      removeConnection(id) {
        set((state) => ({ connections: state.connections.filter((c) => c.id !== id) }));
      },

      connectionsForDomain(domain) {
        return get().connections.filter((c) => c.domain === domain);
      },

      connectionByProvider(domain, provider) {
        return get().connections.find((c) => c.domain === domain && c.provider === provider);
      },
    }),
    { name: STORAGE_KEY },
  ),
);

export type ConnectionStoreViewModel = ReturnType<typeof useConnectionStore.getState>;
