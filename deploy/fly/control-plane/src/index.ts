import { serve } from "@hono/node-server";
import { Hono } from "hono";
import Stripe from "stripe";
import { loadConfig } from "./config.js";
import { Store } from "./db.js";
import {
  createCheckoutSession,
  ensureProvisionFromSession,
  handleStripeEvent,
  validateTenantName,
} from "./stripe-handlers.js";

function tenantUrlForName(config: { tenantPrefix: string }, tenantName: string): string {
  return `https://${config.tenantPrefix}-${tenantName.trim().toLowerCase()}.fly.dev`;
}

const config = loadConfig();
const store = new Store(config.dataDir);
const stripe = new Stripe(config.stripeSecretKey);

const app = new Hono();

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; background: #0b0d12; color: #e8ecf4; display: grid; place-items: center; }
    main { width: min(480px, 92vw); padding: 2rem; border: 1px solid #222836; border-radius: 16px; background: #12151d; }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
    p { color: #9aa6bd; line-height: 1.5; }
    label { display: block; margin: 1rem 0 0.35rem; font-size: 0.9rem; }
    input { width: 100%; box-sizing: border-box; padding: 0.7rem 0.8rem; border-radius: 8px; border: 1px solid #2a3142; background: #0b0d12; color: inherit; }
    button { margin-top: 1.25rem; width: 100%; padding: 0.85rem; border: 0; border-radius: 10px; background: #4f7cff; color: white; font-weight: 600; cursor: pointer; }
    button:hover { background: #3f6aef; }
    .hint { font-size: 0.85rem; margin-top: 0.35rem; }
    .error { color: #ff8f8f; margin-top: 1rem; }
    .ok { color: #7ddea6; }
    a { color: #8eb4ff; }
    code { background: #0b0d12; padding: 0.1rem 0.35rem; border-radius: 4px; }
  </style>
</head>
<body><main>${body}</main></body></html>`;
}

app.get("/health", (c) => c.json({ ok: true }));

app.get("/", (c) => {
  const canceled = c.req.query("canceled");
  const body = `
    <h1>Get your Arco instance</h1>
    <p>Hosted AI OS with $${config.tenantBudgetUsd} included inference credits. After checkout, we provision your private instance on Fly.io.</p>
    ${canceled ? '<p class="error">Checkout canceled — try again when ready.</p>' : ""}
    <form method="post" action="/checkout">
      <label for="tenantName">Instance name</label>
      <input id="tenantName" name="tenantName" placeholder="acme" required pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]" />
      <div class="hint">Your URL: <code>${config.tenantPrefix}-<span id="preview">name</span>.fly.dev</code></div>
      <label for="email">Email</label>
      <input id="email" name="email" type="email" placeholder="you@example.com" required />
      <button type="submit">Continue to checkout</button>
    </form>
    <p class="hint" style="margin-top:1.5rem">Already have an instance? <a href="/signin">Sign in</a></p>
    <script>
      const input = document.getElementById('tenantName');
      const preview = document.getElementById('preview');
      input.addEventListener('input', () => { preview.textContent = input.value.trim().toLowerCase() || 'name'; });
    </script>`;
  return c.html(layout("Arco — Get an instance", body));
});

app.post("/checkout", async (c) => {
  const form = await c.req.parseBody();
  const tenantName = String(form.tenantName ?? "");
  const email = String(form.email ?? "");
  const validationError = validateTenantName(tenantName);
  if (validationError) {
    return c.html(layout("Checkout error", `<p class="error">${validationError}</p><p><a href="/">Back</a></p>`), 400);
  }
  if (!email.includes("@")) {
    return c.html(layout("Checkout error", `<p class="error">Enter a valid email.</p><p><a href="/">Back</a></p>`), 400);
  }
  try {
    const session = await createCheckoutSession(stripe, config, store, { tenantName, email });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return c.redirect(session.url, 303);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.html(layout("Checkout error", `<p class="error">${message}</p><p><a href="/">Back</a></p>`), 400);
  }
});

app.get("/signup", (c) => c.redirect("/", 302));

app.get("/signin", (c) => {
  const error = c.req.query("error");
  const body = `
    <h1>Sign in to your instance</h1>
    <p>Open the Arco instance you provisioned at checkout. Use the email from signup or your instance name.</p>
    ${error ? `<p class="error">${error}</p>` : ""}
    <form method="post" action="/signin">
      <label for="email">Email used at checkout</label>
      <input id="email" name="email" type="email" placeholder="you@example.com" />
      <p class="hint" style="text-align:center;margin:1rem 0">— or —</p>
      <label for="tenantName">Instance name</label>
      <input id="tenantName" name="tenantName" placeholder="acme" pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]" />
      <div class="hint">Opens <code>${config.tenantPrefix}-<span id="preview">name</span>.fly.dev</code></div>
      <button type="submit">Open my instance</button>
    </form>
    <p class="hint" style="margin-top:1.5rem">Need a new instance? <a href="/">Get started</a></p>
    <script>
      const input = document.getElementById('tenantName');
      const preview = document.getElementById('preview');
      input.addEventListener('input', () => { preview.textContent = input.value.trim().toLowerCase() || 'name'; });
    </script>`;
  return c.html(layout("Arco — Sign in", body));
});

app.post("/signin", async (c) => {
  const form = await c.req.parseBody();
  const email = String(form.email ?? "").trim();
  const tenantName = String(form.tenantName ?? "").trim().toLowerCase();

  if (email) {
    const order = store.getByEmail(email);
    if (order?.tenant_url) return c.redirect(order.tenant_url, 302);
    if (order?.tenant_name) return c.redirect(tenantUrlForName(config, order.tenant_name), 302);
    return c.redirect("/signin?error=No+instance+found+for+that+email.+Try+your+instance+name.", 302);
  }

  if (tenantName) {
    const validationError = validateTenantName(tenantName);
    if (validationError) {
      return c.redirect(`/signin?error=${encodeURIComponent(validationError)}`, 302);
    }
    return c.redirect(tenantUrlForName(config, tenantName), 302);
  }

  return c.redirect("/signin?error=Enter+your+email+or+instance+name.", 302);
});

app.get("/success", async (c) => {
  const sessionId = c.req.query("session_id");
  if (!sessionId) {
    return c.html(
      layout(
        "Arco — Missing session",
        `<p class="error">No checkout session in the URL. If you just paid, return to Stripe's confirmation page and click the link back to Arco, or email support with your receipt.</p><p><a href="/">Start over</a></p>`,
      ),
      400,
    );
  }

  try {
    await ensureProvisionFromSession(stripe, config, store, sessionId);
  } catch (err) {
    console.error("ensureProvisionFromSession failed:", err);
  }

  const order = store.getBySession(sessionId);
  const tenantHint = order
    ? `<p class="hint">Instance: <code>${order.app_name}.fly.dev</code></p>`
    : "";

  const body = `
    <h1>Provisioning your instance</h1>
    ${tenantHint}
    <p id="status">Payment received. Spinning up your Arco instance — this usually takes about a minute.</p>
    <p id="link" style="display:none"></p>
    <p class="hint">You can leave this tab open. If Stripe didn't redirect you here, bookmark this page.</p>
    <script>
      const sessionId = ${JSON.stringify(sessionId)};
      async function poll() {
        const res = await fetch('/api/order/' + encodeURIComponent(sessionId));
        if (!res.ok) {
          document.getElementById('status').innerHTML = '<span class="error">Could not load order status (HTTP ' + res.status + '). Retrying…</span>';
          setTimeout(poll, 4000);
          return;
        }
        const data = await res.json();
        const status = document.getElementById('status');
        const link = document.getElementById('link');
        if (data.status === 'ready' && data.entryUrl) {
          status.innerHTML = '<span class="ok">Your instance is ready.</span>';
          link.style.display = 'block';
          link.innerHTML = 'Open your <a href="' + data.entryUrl + '">private Kosmos entry link</a> and create your owner account.';
          return;
        }
        if (data.status === 'failed') {
          status.innerHTML = '<span class="error">Provisioning failed: ' + (data.error || 'unknown error') + '</span>';
          return;
        }
        setTimeout(poll, 4000);
      }
      poll();
    </script>`;
  return c.html(layout("Arco — Provisioning", body));
});

app.get("/api/order/:sessionId", (c) => {
  const order = store.getBySession(c.req.param("sessionId"));
  if (!order) return c.json({ error: "not_found" }, 404);
  return c.json({
    status: order.status,
    tenantUrl: order.tenant_url,
    entryUrl: order.entry_url,
    tenantName: order.tenant_name,
    error: order.error,
  });
});

app.post("/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) return c.text("missing signature", 400);
  const rawBody = await c.req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("stripe webhook verify failed:", message);
    return c.text(`Webhook Error: ${message}`, 400);
  }
  try {
    await handleStripeEvent(stripe, config, store, event);
  } catch (err) {
    console.error("stripe webhook handler failed:", err);
    return c.text("handler error", 500);
  }
  return c.json({ received: true });
});

serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" }, (info) => {
  console.log(`control plane listening on http://${info.address}:${info.port}`);
});
