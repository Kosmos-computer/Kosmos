import { serve } from "@hono/node-server";
import { Hono } from "hono";
import Stripe from "stripe";
import { loadConfig } from "./config.js";
import {
  buildDesktopReturnError,
  buildDesktopReturnUrl,
  isAllowedReturnTo,
  parseConnectMode,
  resolveOrderInstance,
} from "./connect.js";
import { Store } from "./db.js";
import { deactivateOrder, deactivateTenant, resolveOrderForDeactivate } from "./deactivate.js";
import {
  createCheckoutSession,
  ensureProvisionFromSession,
  handleStripeEvent,
  validateTenantName,
} from "./stripe-handlers.js";
import { layout } from "./layout.js";

function tenantUrlForName(config: { tenantPrefix: string }, tenantName: string): string {
  return `https://${config.tenantPrefix}-${tenantName.trim().toLowerCase()}.fly.dev`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const config = loadConfig();
const store = new Store(config.dataDir);
const stripe = new Stripe(config.stripeSecretKey);

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.get("/", (c) => {
  const canceled = c.req.query("canceled");
  const body = `
    <h1>Get your Kosmos Cloud instance</h1>
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
    <p class="hint center" style="margin-top:1.5rem">Already have an instance? <a href="/signin">Sign in</a></p>
    <script>
      const input = document.getElementById('tenantName');
      const preview = document.getElementById('preview');
      input.addEventListener('input', () => { preview.textContent = input.value.trim().toLowerCase() || 'name'; });
    </script>`;
  return c.html(layout("Kosmos — Get an instance", body));
});

app.post("/checkout", async (c) => {
  const form = await c.req.parseBody();
  const tenantName = String(form.tenantName ?? "");
  const email = String(form.email ?? "");
  const returnToRaw = String(form.return_to ?? "").trim();
  const returnTo = isAllowedReturnTo(returnToRaw) ? returnToRaw : null;
  const validationError = validateTenantName(tenantName);
  const backHref = returnTo
    ? `/connect?mode=signup&return_to=${encodeURIComponent(returnTo)}`
    : "/";
  if (validationError) {
    return c.html(
      layout("Checkout error", `<p class="error">${escapeHtml(validationError)}</p><p><a href="${backHref}">Back</a></p>`),
      400,
    );
  }
  if (!email.includes("@")) {
    return c.html(layout("Checkout error", `<p class="error">Enter a valid email.</p><p><a href="${backHref}">Back</a></p>`), 400);
  }
  try {
    const session = await createCheckoutSession(stripe, config, store, { tenantName, email, returnTo });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return c.redirect(session.url, 303);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.html(
      layout("Checkout error", `<p class="error">${escapeHtml(message)}</p><p><a href="${backHref}">Back</a></p>`),
      400,
    );
  }
});

app.get("/signup", (c) => {
  const returnTo = c.req.query("return_to");
  if (isAllowedReturnTo(returnTo)) {
    return c.redirect(`/connect?mode=signup&return_to=${encodeURIComponent(returnTo!)}`, 302);
  }
  return c.redirect("/", 302);
});

/** Desktop / www pairing — email or instance name, then return_to with kosmosInstance. */
app.get("/connect", async (c) => {
  const returnToRaw = c.req.query("return_to") ?? "";
  const mode = parseConnectMode(c.req.query("mode"));
  const error = c.req.query("error");
  const canceled = c.req.query("canceled");
  const shouldContinue = c.req.query("continue") === "1";
  const returnTo = isAllowedReturnTo(returnToRaw) ? returnToRaw : "";
  const prefillEmail = String(c.req.query("email") ?? "").trim();
  const prefillTenant = String(c.req.query("tenantName") ?? "").trim().toLowerCase();
  const tenantPreview = prefillTenant || "name";

  if (mode === "signup") {
    // Desktop handoff: fields already collected in-app — go straight to Stripe.
    if (shouldContinue && !canceled && prefillEmail.includes("@") && prefillTenant) {
      const validationError = validateTenantName(prefillTenant);
      if (validationError) {
        const q = new URLSearchParams({
          mode: "signup",
          error: validationError,
          email: prefillEmail,
          tenantName: prefillTenant,
        });
        if (returnTo) q.set("return_to", returnTo);
        return c.redirect(`/connect?${q.toString()}`, 302);
      }
      try {
        const session = await createCheckoutSession(stripe, config, store, {
          tenantName: prefillTenant,
          email: prefillEmail,
          returnTo: returnTo || null,
        });
        if (session.url) return c.redirect(session.url, 303);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const q = new URLSearchParams({
          mode: "signup",
          error: message,
          email: prefillEmail,
          tenantName: prefillTenant,
        });
        if (returnTo) q.set("return_to", returnTo);
        return c.redirect(`/connect?${q.toString()}`, 302);
      }
    }

    const body = `
      <h1>Create your Kosmos Cloud account</h1>
      <p>Checkout provisions a private hosted instance with included inference credits.${
        returnTo ? " When it is ready, we will send you back to the Kosmos app." : ""
      }</p>
      ${canceled ? '<p class="error">Checkout canceled — try again when ready.</p>' : ""}
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/checkout">
        ${returnTo ? `<input type="hidden" name="return_to" value="${escapeHtml(returnTo)}" />` : ""}
        <label for="tenantName">Instance name</label>
        <input id="tenantName" name="tenantName" placeholder="acme" required pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]" value="${escapeHtml(prefillTenant)}" />
        <div class="hint">Your URL: <code>${config.tenantPrefix}-<span id="preview">${escapeHtml(tenantPreview)}</span>.fly.dev</code></div>
        <label for="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required value="${escapeHtml(prefillEmail)}" />
        <button type="submit">Continue to checkout</button>
      </form>
      <p class="hint center" style="margin-top:1.5rem">Already have an instance? <a href="/connect?mode=existing${
        returnTo ? `&return_to=${encodeURIComponent(returnTo)}` : ""
      }">Connect instead</a></p>
      <script>
        const input = document.getElementById('tenantName');
        const preview = document.getElementById('preview');
        input.addEventListener('input', () => { preview.textContent = input.value.trim().toLowerCase() || 'name'; });
      </script>`;
    return c.html(layout("Kosmos — Create account", body));
  }

  const body = `
    <h1>Connect Kosmos Cloud</h1>
    <p>${
      returnTo
        ? "Enter the email from checkout or your instance name. We will pair this browser / desktop app with your hosted instance."
        : "Enter the email from checkout or your instance name to open your hosted instance."
    }</p>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
    <form method="post" action="/connect">
      ${returnTo ? `<input type="hidden" name="return_to" value="${escapeHtml(returnTo)}" />` : ""}
      <input type="hidden" name="mode" value="existing" />
      <label for="email">Email used at checkout</label>
      <input id="email" name="email" type="email" placeholder="you@example.com" value="${escapeHtml(prefillEmail)}" />
      <p class="hint center" style="margin:1rem 0">— or —</p>
      <label for="tenantName">Instance name</label>
      <input id="tenantName" name="tenantName" placeholder="acme" pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]" value="${escapeHtml(prefillTenant)}" />
      <div class="hint">Instance: <code>${config.tenantPrefix}-<span id="preview">${escapeHtml(tenantPreview)}</span>.fly.dev</code></div>
      <button type="submit">${returnTo ? "Connect to app" : "Open my instance"}</button>
    </form>
    <p class="hint center" style="margin-top:1.5rem">Need a new instance? <a href="/connect?mode=signup${
      returnTo ? `&return_to=${encodeURIComponent(returnTo)}` : ""
    }">Create account</a></p>
    <script>
      const input = document.getElementById('tenantName');
      const preview = document.getElementById('preview');
      input.addEventListener('input', () => { preview.textContent = input.value.trim().toLowerCase() || 'name'; });
    </script>`;
  return c.html(layout("Kosmos — Connect", body));
});

app.post("/connect", async (c) => {
  const form = await c.req.parseBody();
  const email = String(form.email ?? "").trim();
  const tenantName = String(form.tenantName ?? "").trim().toLowerCase();
  const returnToRaw = String(form.return_to ?? "").trim();
  const returnTo = isAllowedReturnTo(returnToRaw) ? returnToRaw : "";

  if (tenantName) {
    const validationError = validateTenantName(tenantName);
    if (validationError) {
      const q = new URLSearchParams({ mode: "existing", error: validationError });
      if (returnTo) q.set("return_to", returnTo);
      return c.redirect(`/connect?${q.toString()}`, 302);
    }
  }

  const resolved = resolveOrderInstance(store, config, { email, tenantName });
  if ("error" in resolved) {
    if (returnTo) {
      return c.redirect(buildDesktopReturnError(returnTo, resolved.error), 302);
    }
    const q = new URLSearchParams({ mode: "existing", error: resolved.error });
    return c.redirect(`/connect?${q.toString()}`, 302);
  }

  if (returnTo) {
    return c.redirect(buildDesktopReturnUrl(returnTo, resolved.tenantUrl), 302);
  }
  // Browser-only connect (www Sign in): prefer private entry link when we have it.
  return c.redirect(resolved.entryUrl || resolved.tenantUrl, 302);
});

app.get("/signin", (c) => {
  const error = c.req.query("error");
  const body = `
    <h1>Sign in to your instance</h1>
    <p>Open the Kosmos instance you provisioned at checkout. Use the email from signup or your instance name.</p>
    ${error ? `<p class="error">${error}</p>` : ""}
    <form method="post" action="/signin">
      <label for="email">Email used at checkout</label>
      <input id="email" name="email" type="email" placeholder="you@example.com" />
      <p class="hint center" style="margin:1rem 0">— or —</p>
      <label for="tenantName">Instance name</label>
      <input id="tenantName" name="tenantName" placeholder="acme" pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]" />
      <div class="hint">Opens <code>${config.tenantPrefix}-<span id="preview">name</span>.fly.dev</code></div>
      <button type="submit">Open my instance</button>
    </form>
    <p class="hint center" style="margin-top:1.5rem">Need a new instance? <a href="/">Get started</a></p>
    <script>
      const input = document.getElementById('tenantName');
      const preview = document.getElementById('preview');
      input.addEventListener('input', () => { preview.textContent = input.value.trim().toLowerCase() || 'name'; });
    </script>`;
  return c.html(layout("Kosmos — Sign in", body));
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
  const returnToRaw = c.req.query("return_to") ?? "";
  const returnTo = isAllowedReturnTo(returnToRaw) ? returnToRaw : "";
  if (!sessionId) {
    return c.html(
      layout(
        "Kosmos — Missing session",
        `<p class="error">No checkout session in the URL. If you just paid, return to Stripe's confirmation page and click the link back to Kosmos, or email support with your receipt.</p><p><a href="/">Start over</a></p>`,
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

  // Already ready — send desktop users straight back instead of waiting on the poll UI.
  if (order?.status === "ready" && order.tenant_url && returnTo) {
    try {
      return c.redirect(buildDesktopReturnUrl(returnTo, order.tenant_url), 302);
    } catch (err) {
      console.error("desktop return redirect failed:", err);
    }
  }

  const tenantHint = order
    ? `<p class="hint">Instance: <code>${escapeHtml(order.app_name)}.fly.dev</code></p>`
    : "";

  const body = `
    <h1>Payment successful</h1>
    ${tenantHint}
    <p id="status" class="ok">Thanks — we received your payment.</p>
    <p id="detail">Spinning up your Kosmos instance. This usually takes about a minute…</p>
    <p id="link" style="display:none"></p>
    <p class="hint center">Keep this tab open. We will send you back to the Kosmos app when the instance is ready.</p>
    <script>
      const sessionId = ${JSON.stringify(sessionId)};
      const returnTo = ${JSON.stringify(returnTo)};

      function goToApp(tenantUrl) {
        if (!returnTo || !tenantUrl) return false;
        try {
          const desktop = new URL(returnTo);
          desktop.searchParams.set('kosmosInstance', new URL(tenantUrl).origin);
          desktop.searchParams.set('kosmosConnected', '1');
          window.location.replace(desktop.toString());
          return true;
        } catch (_) {
          return false;
        }
      }

      async function poll() {
        const res = await fetch('/api/order/' + encodeURIComponent(sessionId));
        const status = document.getElementById('status');
        const detail = document.getElementById('detail');
        const link = document.getElementById('link');
        if (!res.ok) {
          detail.innerHTML = '<span class="error">Could not load order status (HTTP ' + res.status + '). Retrying…</span>';
          setTimeout(poll, 2500);
          return;
        }
        const data = await res.json();
        if (data.status === 'ready' && (data.tenantUrl || data.entryUrl)) {
          status.innerHTML = '<span class="ok">Your instance is ready.</span>';
          detail.textContent = returnTo ? 'Returning you to the Kosmos app…' : 'Open your instance to create the owner account.';
          if (goToApp(data.tenantUrl)) return;
          link.style.display = 'block';
          let html = '';
          if (data.tenantUrl) {
            html += '<p><a href="' + data.tenantUrl + '"><strong>Open your instance</strong></a></p>';
          }
          if (data.entryUrl) {
            html += '<p>Or use your <a href="' + data.entryUrl + '">private entry link</a>.</p>';
          }
          link.innerHTML = html || 'Instance ready.';
          return;
        }
        if (data.status === 'failed') {
          detail.innerHTML = '<span class="error">Provisioning failed: ' + (data.error || 'unknown error') + '</span>';
          return;
        }
        setTimeout(poll, 2500);
      }
      poll();
    </script>`;
  return c.html(layout("Kosmos — Success", body));
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

/**
 * Operator teardown — cancels Stripe, revokes LiteLLM key, destroys Fly app.
 * Auth: Authorization: Bearer $ADMIN_TOKEN
 * Body (optional): { "mode": "destroy" | "suspend" }
 */
app.post("/admin/tenants/:tenantName/deactivate", async (c) => {
  if (!config.adminToken) return c.json({ error: "admin_disabled" }, 404);
  const auth = c.req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== config.adminToken) return c.json({ error: "unauthorized" }, 401);

  const tenantName = c.req.param("tenantName").trim().toLowerCase();
  const validationError = validateTenantName(tenantName);
  if (validationError) return c.json({ error: validationError }, 400);

  let mode: "destroy" | "suspend" = "destroy";
  try {
    const body = (await c.req.json().catch(() => ({}))) as { mode?: string };
    if (body.mode === "suspend" || body.mode === "destroy") mode = body.mode;
  } catch {
    /* empty body ok */
  }

  const appName = `${config.tenantPrefix}-${tenantName}`;
  const order = resolveOrderForDeactivate(store, { tenantName, appName });
  if (order) {
    const result = await deactivateOrder(config, store, order, { mode, stripe });
    return c.json({ ok: true, ...result });
  }

  // No order row — still tear down Fly + LiteLLM; cancel Stripe by metadata search.
  let subscriptionId: string | null = null;
  try {
    const found = await stripe.subscriptions.search({
      query: `metadata["app_name"]:"${appName}" AND status:"active"`,
      limit: 1,
    });
    subscriptionId = found.data[0]?.id ?? null;
  } catch (err) {
    console.warn("stripe subscription search failed:", err);
  }

  const result = await deactivateTenant(
    config,
    { appName, mode, stripeSubscriptionId: subscriptionId },
    stripe,
  );
  return c.json({ ok: true, ...result, note: "no_order_row" });
});

serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" }, (info) => {
  console.log(`control plane listening on http://${info.address}:${info.port}`);
});
