/**
 * STUB: persisted payment connections, balances, and activity feed.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ConnectPaymentInput,
  PaymentConnection,
  PaymentProviderId,
  PaymentTransaction,
  ProviderBalance,
  RequestPaymentInput,
  SendPaymentInput,
} from "@shared/payments";
import { connectProvider, fetchBalance, requestPayment, sendPayment } from "./paymentGateway";
import { PAY_RECIPIENTS, PAY_SEED_TRANSACTIONS } from "./payMock";

const STORAGE_KEY = "arco-pay-store";

interface PayStore {
  connections: PaymentConnection[];
  activeProviderId: PaymentProviderId;
  transactions: PaymentTransaction[];
  balances: Partial<Record<PaymentProviderId, ProviderBalance>>;
  busy: boolean;
  lastError: string | null;

  setActiveProvider: (id: PaymentProviderId) => void;
  connect: (input: ConnectPaymentInput) => Promise<PaymentConnection>;
  disconnect: (id: string) => void;
  refreshBalance: (provider?: PaymentProviderId) => Promise<void>;
  send: (input: SendPaymentInput) => Promise<PaymentTransaction | null>;
  request: (input: RequestPaymentInput) => Promise<PaymentTransaction | null>;
  connectionFor: (provider: PaymentProviderId) => PaymentConnection | undefined;
  connectedProviders: () => Set<PaymentProviderId>;
}

export const usePayStore = create<PayStore>()(
  persist(
    (set, get) => ({
      connections: [],
      activeProviderId: "venmo",
      transactions: PAY_SEED_TRANSACTIONS,
      balances: {},
      busy: false,
      lastError: null,

      setActiveProvider(id) {
        set({ activeProviderId: id, lastError: null });
      },

      connectionFor(provider) {
        return get().connections.find((c) => c.provider === provider && c.status === "connected");
      },

      connectedProviders() {
        return new Set(get().connections.filter((c) => c.status === "connected").map((c) => c.provider));
      },

      async connect(input) {
        set({ busy: true, lastError: null });
        try {
          const connection = await connectProvider(input);
          set((state) => ({
            connections: [...state.connections.filter((c) => c.provider !== input.provider), connection],
            activeProviderId: input.provider,
            busy: false,
          }));
          await get().refreshBalance(input.provider);
          return connection;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Connection failed";
          set({ busy: false, lastError: message });
          throw err;
        }
      },

      disconnect(id) {
        set((state) => {
          const connections = state.connections.filter((c) => c.id !== id);
          const balances = { ...state.balances };
          const removed = state.connections.find((c) => c.id === id);
          if (removed) delete balances[removed.provider];
          return { connections, balances };
        });
      },

      async refreshBalance(provider) {
        const target = provider ?? get().activeProviderId;
        const connection = get().connectionFor(target);
        if (!connection) return;
        set({ busy: true, lastError: null });
        try {
          const balance = await fetchBalance(connection);
          set((state) => ({
            balances: { ...state.balances, [target]: balance },
            busy: false,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Balance fetch failed";
          set({ busy: false, lastError: message });
        }
      },

      async send(input) {
        const connection = get().connectionFor(input.provider);
        if (!connection) {
          set({ lastError: "Connect a payment method first." });
          return null;
        }
        set({ busy: true, lastError: null });
        try {
          const tx = await sendPayment(input, connection);
          set((state) => ({
            transactions: [tx, ...state.transactions],
            busy: false,
          }));
          await get().refreshBalance(input.provider);
          return tx;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Payment failed";
          set({ busy: false, lastError: message });
          return null;
        }
      },

      async request(input) {
        const connection = get().connectionFor(input.provider);
        if (!connection) {
          set({ lastError: "Connect a payment method first." });
          return null;
        }
        set({ busy: true, lastError: null });
        try {
          const tx = await requestPayment(input, connection);
          set((state) => ({
            transactions: [tx, ...state.transactions],
            busy: false,
          }));
          return tx;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Request failed";
          set({ busy: false, lastError: message });
          return null;
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        connections: state.connections,
        activeProviderId: state.activeProviderId,
        transactions: state.transactions,
        balances: state.balances,
      }),
    },
  ),
);

export type PayViewModel = ReturnType<typeof usePayStub>;

/** STUB: replace with usePay when server gateway + OAuth land. */
export function usePayStub() {
  const store = usePayStore();
  const activeConnection = store.connectionFor(store.activeProviderId);
  const activeBalance = store.balances[store.activeProviderId];
  const connected = store.connectedProviders();

  const transactions = store.transactions.filter((tx) => tx.provider === store.activeProviderId);

  return {
    ...store,
    activeConnection,
    activeBalance,
    connected,
    transactions,
    recipients: PAY_RECIPIENTS,
  };
}
