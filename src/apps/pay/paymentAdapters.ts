/**
 * STUB payment adapters — simulate provider APIs locally.
 * Replace each adapter body with real SDK calls (Stripe, PayPal, etc.).
 */
import type {
  ConnectPaymentInput,
  PaymentConnection,
  PaymentProviderAdapter,
  PaymentProviderId,
  PaymentTransaction,
  ProviderBalance,
  RequestPaymentInput,
  SendPaymentInput,
} from "@shared/payments";
import { PAYMENT_PROVIDER_META } from "@shared/payments";

const STUB_DELAY_MS = 420;

function delay(ms = STUB_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugConnectionId(provider: PaymentProviderId): string {
  return `pay_${provider}_${Date.now().toString(36)}`;
}

function buildConnection(input: ConnectPaymentInput): PaymentConnection {
  const meta = PAYMENT_PROVIDER_META[input.provider];
  const hint = input.accountHint?.trim();
  return {
    id: slugConnectionId(input.provider),
    provider: input.provider,
    label: hint ? `${hint} · ${meta.label}` : meta.label,
    accountHint: hint,
    status: "connected",
    connectedAt: new Date().toISOString(),
    metadata: input.metadata,
  };
}

function stubTransaction(
  input: SendPaymentInput | RequestPaymentInput,
  type: PaymentTransaction["type"],
  connection: PaymentConnection,
): PaymentTransaction {
  return {
    id: `tx_${Date.now().toString(36)}`,
    provider: connection.provider,
    type,
    amount: { cents: input.amountCents, currency: input.currency ?? "usd" },
    counterparty: input.counterparty,
    note: input.note,
    status: type === "request" ? "pending" : "completed",
    timestamp: new Date().toISOString(),
  };
}

function stubBalance(connection: PaymentConnection): ProviderBalance {
  const seed = connection.provider.length * 137;
  const base = 12000 + (seed % 80000);
  return {
    provider: connection.provider,
    available: { cents: base, currency: "usd" },
    pending: connection.provider === "zelle" ? { cents: 2500, currency: "usd" } : undefined,
  };
}

function createStubAdapter(id: PaymentProviderId): PaymentProviderAdapter {
  const meta = PAYMENT_PROVIDER_META[id];
  return {
    id,
    ...meta,
    async connect(input) {
      await delay();
      return buildConnection(input);
    },
    async send(input, connection) {
      await delay();
      return stubTransaction(input, "send", connection);
    },
    async request(input, connection) {
      await delay();
      return stubTransaction(input, "request", connection);
    },
    async getBalance(connection) {
      await delay(180);
      return stubBalance(connection);
    },
  };
}

export const PAYMENT_ADAPTERS: Record<PaymentProviderId, PaymentProviderAdapter> = {
  stripe: createStubAdapter("stripe"),
  venmo: createStubAdapter("venmo"),
  zelle: createStubAdapter("zelle"),
  paypal: createStubAdapter("paypal"),
  crypto: createStubAdapter("crypto"),
};

export function adapterFor(id: PaymentProviderId): PaymentProviderAdapter {
  return PAYMENT_ADAPTERS[id];
}

export const PAYMENT_PROVIDER_LIST = Object.values(PAYMENT_ADAPTERS);
