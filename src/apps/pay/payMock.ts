import type { PaymentCounterparty, PaymentProviderId, PaymentTransaction } from "@shared/payments";

export interface PayRecipient extends PaymentCounterparty {
  id: string;
  recent?: boolean;
}

export const PAY_RECIPIENTS: PayRecipient[] = [
  { id: "r1", name: "Alex Rivera", handle: "@alexr", recent: true },
  { id: "r2", name: "Jordan Kim", handle: "jordan@mail.com", recent: true },
  { id: "r3", name: "Sam Patel", handle: "@samp", recent: true },
  { id: "r4", name: "Taylor Brooks", handle: "+1 555 0142" },
  { id: "r5", name: "Casey Nguyen", handle: "casey.nguyen@example.com" },
  { id: "r6", name: "Morgan Lee", handle: "@morganl" },
];

export const PAY_SEED_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: "tx_seed_1",
    provider: "venmo",
    type: "receive",
    amount: { cents: 4200, currency: "usd" },
    counterparty: { name: "Alex Rivera", handle: "@alexr" },
    note: "Dinner split 🍕",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "tx_seed_2",
    provider: "venmo",
    type: "send",
    amount: { cents: 1500, currency: "usd" },
    counterparty: { name: "Jordan Kim", handle: "jordan@mail.com" },
    note: "Coffee",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "tx_seed_3",
    provider: "zelle",
    type: "receive",
    amount: { cents: 8500, currency: "usd" },
    counterparty: { name: "Sam Patel", handle: "@samp" },
    note: "Rent share",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: "tx_seed_4",
    provider: "stripe",
    type: "deposit",
    amount: { cents: 25000, currency: "usd" },
    counterparty: { name: "Freelance client", handle: "invoice #1042" },
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "tx_seed_5",
    provider: "paypal",
    type: "request",
    amount: { cents: 3200, currency: "usd" },
    counterparty: { name: "Taylor Brooks", handle: "+1 555 0142" },
    note: "Concert tickets",
    status: "pending",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: "tx_seed_6",
    provider: "crypto",
    type: "receive",
    amount: { cents: 12500, currency: "usd" },
    counterparty: { name: "0x7a3…f2c", handle: "USDC on Base" },
    note: "NFT sale",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
];

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function transactionVerb(type: PaymentTransaction["type"]): string {
  switch (type) {
    case "send":
      return "paid";
    case "receive":
      return "received";
    case "request":
      return "requested";
    case "deposit":
      return "deposited";
    case "withdraw":
      return "withdrew";
  }
}

export function transactionSign(type: PaymentTransaction["type"]): "+" | "-" | "" {
  if (type === "receive" || type === "deposit") return "+";
  if (type === "send" || type === "withdraw") return "-";
  return "";
}

export const ALL_PROVIDERS: PaymentProviderId[] = ["venmo", "stripe", "zelle", "paypal", "crypto"];
