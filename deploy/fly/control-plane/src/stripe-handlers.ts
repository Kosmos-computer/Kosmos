import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { Config } from "./config.js";
import type { Store } from "./db.js";
import { provisionTenant, suspendTenant } from "./provision.js";

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

export async function createCheckoutSession(
  stripe: Stripe,
  config: Config,
  store: Store,
  input: { tenantName: string; email: string },
): Promise<Stripe.Checkout.Session> {
  const tenantName = input.tenantName.trim().toLowerCase();
  const validationError = validateTenantName(tenantName);
  if (validationError) throw new Error(validationError);
  if (store.getByTenantName(tenantName)) throw new Error("That instance name is already taken.");

  const appName = `${config.tenantPrefix}-${tenantName}`;
  const orderId = randomUUID();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email.trim(),
    line_items: [{ price: config.stripePriceId, quantity: 1 }],
    success_url: `${config.publicUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.publicUrl}/?canceled=1`,
    metadata: {
      order_id: orderId,
      tenant_name: tenantName,
      app_name: appName,
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
  if (!tenantName || !sessionId) return;
  if (!sessionPaid(session)) return;

  const existing = store.getBySession(sessionId);
  if (!existing || existing.status === "ready" || existing.status === "provisioning") return;

  store.markProvisioning(sessionId, session.customer as string | null, session.subscription as string | null);

  void (async () => {
    try {
      const result = await provisionTenant(config, tenantName);
      store.markReady(sessionId, result.url);
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
      const tenantName = subscription.metadata?.tenant_name;
      if (!tenantName) break;
      const order = store.getByTenantName(tenantName);
      if (!order) break;
      await suspendTenant(config, order.app_name);
      store.markSuspended(order.stripe_session_id);
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
  if (!order || order.status === "ready" || order.status === "provisioning") return;

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!sessionPaid(session)) return;

  console.log(`success-page kickoff for ${sessionId} (${order.tenant_name})`);
  scheduleProvision(stripe, config, store, session);
}
