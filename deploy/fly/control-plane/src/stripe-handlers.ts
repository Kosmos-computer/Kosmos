import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { Config } from "./config.js";
import { deactivateOrder, deactivateTenant, resolveOrderForDeactivate } from "./deactivate.js";
import type { Store } from "./db.js";
import { provisionTenant } from "./provision.js";

const TENANT_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED = new Set([
  "demo",
  "gateway",
  "template",
  "control",
  "control-plane",
  "www",
  "api",
  "admin",
  "litellm",
  "postgres",
  "db",
]);

export function validateTenantName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  if (!TENANT_RE.test(normalized)) {
    return "Name must be 3–30 lowercase letters, digits, or dashes.";
  }
  if (RESERVED.has(normalized)) return "That name is reserved.";
  return null;
}

/** Names only block reuse once checkout paid / provisioning started. */
function tenantNameBlocksCheckout(status: string): boolean {
  return status === "ready" || status === "provisioning" || status === "suspended";
}

export async function createCheckoutSession(
  stripe: Stripe,
  config: Config,
  store: Store,
  input: { tenantName: string; email: string; returnTo?: string | null },
): Promise<Stripe.Checkout.Session> {
  const tenantName = input.tenantName.trim().toLowerCase();
  const validationError = validateTenantName(tenantName);
  if (validationError) throw new Error(validationError);

  const existing = store.getByTenantName(tenantName);
  if (existing) {
    if (tenantNameBlocksCheckout(existing.status)) {
      throw new Error("That instance name is already taken.");
    }
    // Abandoned / failed checkout — free the name so the user can retry.
    try {
      await stripe.checkout.sessions.expire(existing.stripe_session_id);
    } catch {
      // Session may already be expired or completed.
    }
    store.removeOrder(existing.stripe_session_id);
  }

  const appName = `${config.tenantPrefix}-${tenantName}`;
  const orderId = randomUUID();
  const returnTo = input.returnTo?.trim() || "";
  const cancelParams = new URLSearchParams({ mode: "signup", canceled: "1" });
  if (returnTo) cancelParams.set("return_to", returnTo);
  cancelParams.set("email", input.email.trim());
  cancelParams.set("tenantName", tenantName);
  const cancelUrl = `${config.publicUrl}/connect?${cancelParams.toString()}`;
  const successUrl = returnTo
    ? `${config.publicUrl}/success?session_id={CHECKOUT_SESSION_ID}&return_to=${encodeURIComponent(returnTo)}`
    : `${config.publicUrl}/success?session_id={CHECKOUT_SESSION_ID}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email.trim(),
    line_items: [{ price: config.stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      order_id: orderId,
      tenant_name: tenantName,
      app_name: appName,
      ...(returnTo ? { return_to: returnTo.slice(0, 500) } : {}),
    },
    subscription_data: {
      metadata: {
        order_id: orderId,
        tenant_name: tenantName,
        app_name: appName,
      },
    },
  });

  store.createOrder({
    id: orderId,
    tenantName,
    appName,
    customerEmail: input.email.trim(),
    stripeSessionId: session.id,
  });

  return session;
}

function sessionPaid(session: Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid" || session.status === "complete";
}

export function scheduleProvision(
  stripe: Stripe,
  config: Config,
  store: Store,
  session: Stripe.Checkout.Session,
): void {
  const tenantName = session.metadata?.tenant_name;
  const sessionId = session.id;
  const orderId = session.metadata?.order_id || randomUUID();
  if (!tenantName || !sessionId) return;
  if (!sessionPaid(session)) return;

  let existing = store.getBySession(sessionId);
  if (existing?.status === "ready" || existing?.status === "provisioning") return;

  // Paid session with no row (e.g. abandoned pending order was deleted) — recreate.
  if (!existing) {
    const byName = store.getByTenantName(tenantName);
    if (byName && tenantNameBlocksCheckout(byName.status)) {
      console.warn(`skip provision for ${tenantName}: name already ${byName.status}`);
      return;
    }
    if (byName) store.removeOrder(byName.stripe_session_id);
    const appName = session.metadata?.app_name || `${config.tenantPrefix}-${tenantName}`;
    store.createOrder({
      id: orderId,
      tenantName,
      appName,
      customerEmail: session.customer_email ?? null,
      stripeSessionId: sessionId,
    });
    existing = store.getBySession(sessionId);
  }
  if (!existing) return;

  store.markProvisioning(sessionId, session.customer as string | null, session.subscription as string | null);

  void (async () => {
    try {
      const result = await provisionTenant(config, tenantName);
      store.markReady(sessionId, result.url, result.entryUrl);
      console.log(`provisioned ${result.app} -> ${result.url}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      store.markFailed(sessionId, message);
      console.error(`provision failed for ${tenantName}:`, message);
    }
  })();
}

export async function handleStripeEvent(
  stripe: Stripe,
  config: Config,
  store: Store,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      scheduleProvision(stripe, config, store, session);
      break;
    }
    case "customer.subscription.deleted":
    case "invoice.payment_failed": {
      const obj = event.data.object as Stripe.Subscription | Stripe.Invoice;
      const subscriptionId =
        event.type === "customer.subscription.deleted"
          ? (obj as Stripe.Subscription).id
          : ((obj as Stripe.Invoice).subscription as string | null);
      if (!subscriptionId) break;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const order = resolveOrderForDeactivate(store, {
        subscriptionId,
        tenantName: subscription.metadata?.tenant_name,
        appName: subscription.metadata?.app_name,
      });
      if (!order) {
        // No CP row (CLI tenant) — still tear down Fly + LiteLLM by app metadata.
        const appName = subscription.metadata?.app_name;
        if (appName) {
          const deleted = event.type === "customer.subscription.deleted";
          await deactivateTenant(
            config,
            {
              appName,
              mode: deleted ? "destroy" : "suspend",
              stripeSubscriptionId: subscriptionId,
              // deleted: already canceled; payment_failed: keep sub so retry can succeed
              skipStripeCancel: true,
            },
            stripe,
          );
        }
        break;
      }
      const deleted = event.type === "customer.subscription.deleted";
      await deactivateOrder(config, store, order, {
        mode: deleted ? "destroy" : "suspend",
        skipStripeCancel: true,
        stripe,
      });
      break;
    }
    default:
      break;
  }
}

/** Fallback when Stripe redirect lands before the webhook — idempotent. */
export async function ensureProvisionFromSession(
  stripe: Stripe,
  config: Config,
  store: Store,
  sessionId: string,
): Promise<void> {
  const order = store.getBySession(sessionId);
  if (order?.status === "ready" || order?.status === "provisioning") return;

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!sessionPaid(session)) return;

  console.log(
    `success-page kickoff for ${sessionId} (${session.metadata?.tenant_name || order?.tenant_name || "unknown"})`,
  );
  scheduleProvision(stripe, config, store, session);
}
