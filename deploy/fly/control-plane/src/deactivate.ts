import type Stripe from "stripe";
import type { Config } from "./config.js";
import type { OrderRow, Store } from "./db.js";
import { destroyFlyApp, revokeGatewayKey, suspendFlyApp } from "./provision.js";

export type DeactivateMode = "suspend" | "destroy";

export interface DeactivateInput {
  appName: string;
  mode?: DeactivateMode;
  virtualKey?: string | null;
  stripeSubscriptionId?: string | null;
  /** When true, Stripe is already canceled (e.g. subscription.deleted webhook). */
  skipStripeCancel?: boolean;
}

export interface DeactivateResult {
  appName: string;
  mode: DeactivateMode;
  stripe: "canceled" | "skipped" | "failed" | "absent";
  litellm: "revoked" | "failed";
  fly: "destroyed" | "suspended" | "failed";
}

async function cancelStripeSubscription(
  stripe: Stripe | undefined,
  subscriptionId: string | null | undefined,
  skip: boolean | undefined,
): Promise<DeactivateResult["stripe"]> {
  if (skip) return "skipped";
  if (!subscriptionId) return "absent";
  if (!stripe) {
    console.warn(`stripe cancel skipped for ${subscriptionId}: no Stripe client`);
    return "failed";
  }
  try {
    const existing = await stripe.subscriptions.retrieve(subscriptionId);
    if (existing.status === "canceled") return "skipped";
    await stripe.subscriptions.cancel(subscriptionId);
    return "canceled";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`stripe cancel failed for ${subscriptionId}: ${message}`);
    return "failed";
  }
}

/**
 * Tear down a tenant across Stripe, LiteLLM, and Fly.
 * Always revokes the gateway key (alias = Fly app name).
 * - suspend: stop the Fly app (volume kept) — used for payment failures
 * - destroy: delete the Fly app — used for cancellations / admin teardown
 */
export async function deactivateTenant(
  config: Config,
  input: DeactivateInput,
  stripe?: Stripe,
): Promise<DeactivateResult> {
  const mode: DeactivateMode = input.mode ?? "destroy";
  const appName = input.appName;

  const stripeStatus = await cancelStripeSubscription(
    stripe,
    input.stripeSubscriptionId,
    input.skipStripeCancel,
  );

  let litellm: DeactivateResult["litellm"] = "revoked";
  try {
    await revokeGatewayKey(config, appName, input.virtualKey ?? undefined);
  } catch (err) {
    litellm = "failed";
    console.warn(`litellm revoke failed for ${appName}:`, err);
  }

  let fly: DeactivateResult["fly"] = mode === "destroy" ? "destroyed" : "suspended";
  try {
    if (mode === "destroy") destroyFlyApp(config, appName);
    else suspendFlyApp(config, appName);
  } catch (err) {
    fly = "failed";
    console.warn(`fly ${mode} failed for ${appName}:`, err);
  }

  console.log(
    `deactivate ${appName}: mode=${mode} stripe=${stripeStatus} litellm=${litellm} fly=${fly}`,
  );
  return { appName, mode, stripe: stripeStatus, litellm, fly };
}

/** Resolve an order from tenant name, app name, or subscription id. */
export function resolveOrderForDeactivate(
  store: Store,
  opts: { tenantName?: string; appName?: string; subscriptionId?: string },
): OrderRow | undefined {
  if (opts.subscriptionId) {
    const bySub = store.getBySubscriptionId(opts.subscriptionId);
    if (bySub) return bySub;
  }
  if (opts.appName) {
    const byApp = store.getByAppName(opts.appName);
    if (byApp) return byApp;
  }
  if (opts.tenantName) return store.getByTenantName(opts.tenantName.trim().toLowerCase());
  return undefined;
}

export async function deactivateOrder(
  config: Config,
  store: Store,
  order: OrderRow,
  opts: {
    mode?: DeactivateMode;
    skipStripeCancel?: boolean;
    stripe?: Stripe;
  } = {},
): Promise<DeactivateResult> {
  const mode = opts.mode ?? "destroy";
  const result = await deactivateTenant(
    config,
    {
      appName: order.app_name,
      mode,
      stripeSubscriptionId: order.stripe_subscription_id,
      skipStripeCancel: opts.skipStripeCancel,
    },
    opts.stripe,
  );
  if (mode === "destroy") store.removeOrder(order.stripe_session_id);
  else store.markSuspended(order.stripe_session_id);
  return result;
}
