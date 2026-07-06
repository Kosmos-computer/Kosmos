/**
 * Payment gateway — provider-agnostic types and adapter contract.
 *
 * Real wiring: each adapter talks to Stripe Connect, PayPal REST, Plaid (Zelle
 * bank rails), Venmo/PayPal P2P, or a crypto wallet SDK. The gateway routes
 * send/request/balance calls to the active connected provider.
 */

export type PaymentProviderId = "stripe" | "venmo" | "zelle" | "paypal" | "crypto";

export type PaymentConnectionStatus = "connected" | "pending" | "error";

export type TransactionType = "send" | "receive" | "request" | "deposit" | "withdraw";

export type TransactionStatus = "pending" | "completed" | "failed" | "cancelled";

export interface PaymentConnection {
  id: string;
  provider: PaymentProviderId;
  /** Display label, e.g. "Personal · Venmo" */
  label: string;
  accountHint?: string;
  status: PaymentConnectionStatus;
  connectedAt: string;
  /** Provider-specific stub fields (Stripe acct id, wallet address, etc.) */
  metadata?: Record<string, string>;
}

export interface MoneyAmount {
  cents: number;
  currency: string;
}

export interface PaymentCounterparty {
  name: string;
  handle: string;
  avatarSeed?: string;
}

export interface PaymentTransaction {
  id: string;
  provider: PaymentProviderId;
  type: TransactionType;
  amount: MoneyAmount;
  counterparty: PaymentCounterparty;
  note?: string;
  status: TransactionStatus;
  timestamp: string;
}

export interface ProviderBalance {
  provider: PaymentProviderId;
  available: MoneyAmount;
  pending?: MoneyAmount;
}

export interface SendPaymentInput {
  provider: PaymentProviderId;
  amountCents: number;
  currency?: string;
  counterparty: PaymentCounterparty;
  note?: string;
}

export interface RequestPaymentInput {
  provider: PaymentProviderId;
  amountCents: number;
  currency?: string;
  counterparty: PaymentCounterparty;
  note?: string;
}

export interface ConnectPaymentInput {
  provider: PaymentProviderId;
  accountHint?: string;
  metadata?: Record<string, string>;
}

/** Adapter contract — one implementation per provider in paymentAdapters.ts */
export interface PaymentProviderAdapter {
  id: PaymentProviderId;
  label: string;
  hint: string;
  accent: string;
  initials: string;
  /** OAuth redirect vs API key vs wallet address */
  connectMode: "oauth" | "api_key" | "account_link" | "wallet";
  /** Fields shown in ConnectPaymentModal */
  connectFields: PaymentConnectField[];
  connect(input: ConnectPaymentInput): Promise<PaymentConnection>;
  send(input: SendPaymentInput, connection: PaymentConnection): Promise<PaymentTransaction>;
  request(input: RequestPaymentInput, connection: PaymentConnection): Promise<PaymentTransaction>;
  getBalance(connection: PaymentConnection): Promise<ProviderBalance>;
}

export type PaymentConnectFieldType = "text" | "password" | "email" | "phone";

export interface PaymentConnectField {
  key: string;
  label: string;
  type: PaymentConnectFieldType;
  placeholder?: string;
  required?: boolean;
}

export const PAYMENT_PROVIDER_META: Record<
  PaymentProviderId,
  Pick<PaymentProviderAdapter, "label" | "hint" | "accent" | "initials" | "connectMode" | "connectFields">
> = {
  stripe: {
    label: "Stripe",
    hint: "Cards, ACH, and Connect payouts via Stripe API keys or OAuth.",
    accent: "#635bff",
    initials: "St",
    connectMode: "api_key",
    connectFields: [
      { key: "publishableKey", label: "Publishable key", type: "text", placeholder: "pk_live_…", required: true },
      { key: "secretKey", label: "Secret key", type: "password", placeholder: "sk_live_…", required: true },
    ],
  },
  venmo: {
    label: "Venmo",
    hint: "P2P payments through PayPal's Venmo API (OAuth in production).",
    accent: "#008cff",
    initials: "Ve",
    connectMode: "oauth",
    connectFields: [{ key: "username", label: "Venmo username", type: "text", placeholder: "@username", required: true }],
  },
  zelle: {
    label: "Zelle",
    hint: "Bank-to-bank transfers via enrolled email or phone (Plaid / bank link).",
    accent: "#6d1ed4",
    initials: "Ze",
    connectMode: "account_link",
    connectFields: [
      { key: "email", label: "Enrolled email", type: "email", placeholder: "you@bank.com", required: true },
      { key: "phone", label: "Enrolled phone", type: "phone", placeholder: "+1 555 0100" },
    ],
  },
  paypal: {
    label: "PayPal",
    hint: "Send, request, and checkout with PayPal REST / Braintree.",
    accent: "#0070ba",
    initials: "PP",
    connectMode: "oauth",
    connectFields: [{ key: "email", label: "PayPal email", type: "email", placeholder: "you@example.com", required: true }],
  },
  crypto: {
    label: "Crypto",
    hint: "USDC / ETH on-chain — wallet connect or custodial API.",
    accent: "#f7931a",
    initials: "₿",
    connectMode: "wallet",
    connectFields: [
      { key: "walletAddress", label: "Wallet address", type: "text", placeholder: "0x… or bc1…", required: true },
      { key: "network", label: "Network", type: "text", placeholder: "ethereum, base, bitcoin" },
    ],
  },
};

export function providerMeta(id: PaymentProviderId) {
  return PAYMENT_PROVIDER_META[id];
}

export function formatMoney(amount: MoneyAmount): string {
  const value = amount.cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: amount.currency.toUpperCase(),
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}
