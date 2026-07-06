/**
 * Payment gateway — routes operations to the correct provider adapter.
 * Server-side twin: server/payments/gateway.ts (future).
 */
import type {
  ConnectPaymentInput,
  PaymentConnection,
  PaymentProviderId,
  PaymentTransaction,
  ProviderBalance,
  RequestPaymentInput,
  SendPaymentInput,
} from "@shared/payments";
import { adapterFor } from "./paymentAdapters";

export async function connectProvider(input: ConnectPaymentInput): Promise<PaymentConnection> {
  return adapterFor(input.provider).connect(input);
}

export async function sendPayment(
  input: SendPaymentInput,
  connection: PaymentConnection,
): Promise<PaymentTransaction> {
  return adapterFor(input.provider).send(input, connection);
}

export async function requestPayment(
  input: RequestPaymentInput,
  connection: PaymentConnection,
): Promise<PaymentTransaction> {
  return adapterFor(input.provider).request(input, connection);
}

export async function fetchBalance(connection: PaymentConnection): Promise<ProviderBalance> {
  return adapterFor(connection.provider).getBalance(connection);
}

export function providerLabel(id: PaymentProviderId): string {
  return adapterFor(id).label;
}
