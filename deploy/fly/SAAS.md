# Kosmos hosted SaaS — current setup

Operational reference for the usage-based Fly.io stack: credits gateway, Stripe
control plane, and per-customer Kosmos instances. This lives in the deploy tree
(not the in-app Docs application under `apps/docs/`).

For step-by-step first deploy, see [README.md](README.md). For product/strategy
notes, see the private `docs/saas-plan.md` (gitignored).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Signup / billing                                                       │
│  https://kosmos-control-plane.fly.dev                                     │
│    POST /checkout → Stripe Checkout ($25/mo test subscription)          │
│    POST /webhooks/stripe → provision tenant on payment                  │
│    GET  /success?session_id=… → poll provisioning status                │
│    GET  /connect?return_to&mode → desktop/www pairing (no IdP yet)      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ flyctl (FLY_API_TOKEN)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Tenant instance (one Fly app + 1GB volume per customer)                │
│  https://kosmos-<name>.fly.dev                                            │
│    Arco Node server, SQLite + files on /data                            │
│    LLM_* env → credits gateway                                          │
│    auto_stop when idle, cold-start on next request                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ virtual API key (budget-capped)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Credits gateway (LiteLLM Proxy, always on)                             │
│  https://kosmos-gateway.fly.dev                                           │
│    /key/generate, /key/delete, /key/info (master key)                   │
│    /v1/chat/completions (tenant virtual keys)                           │
│    Postgres: virtual keys, spend, budgets                               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ OPENROUTER_API_KEY
                                ▼
                         OpenRouter (per-token inference)
```

**Isolation model:** one Firecracker microVM per tenant. The agent runs shell
commands with server authority — no shared multi-tenancy in a single process.

---

## Live Fly apps (personal org)

| App | Role | URL |
| --- | --- | --- |
| `kosmos-gateway` | LiteLLM credits proxy | https://kosmos-gateway.fly.dev |
| `kosmos-control-plane` | Stripe signup + auto-provision | https://kosmos-control-plane.fly.dev |
| `kosmos-template` | Image registry only (not serving HTTP) | — |
| `kosmos-<name>` | Customer instance | https://kosmos-<name>.fly.dev |

Optional/supporting:

| App | Role |
| --- | --- |
| `kosmos-litellm-db` | Fly Postgres for LiteLLM (if used instead of Neon) |

Example tenants provisioned during testing: `kosmos-demo` (manual CLI), `kosmos-test`
(Stripe checkout).

---

## Repository map

| Path | Purpose |
| --- | --- |
| [gateway/](gateway/) | LiteLLM Docker image + `config.yaml` + `fly.toml` |
| [control-plane/](control-plane/) | Hono app: checkout, webhooks, SQLite orders, flyctl provision |
| [tenant/fly.toml.tmpl](tenant/fly.toml.tmpl) | Per-tenant Fly config template |
| [template.fly.toml](template.fly.toml) | Build/push shared tenant image (`kosmos-template:demo`) |
| [Dockerfile.runtime](Dockerfile.runtime) | Tenant image: prebuilt `dist/`, no in-Docker Vite build |
| [../../scripts/provision-tenant.ts](../../scripts/provision-tenant.ts) | CLI provision/destroy (same steps as control plane) |
| [tenants/](tenants/) | Gitignored records (`<app>.json`, `<app>.toml`) — contain virtual keys |
| `.deploy-secrets.local` | Gitignored local operator secrets (see below) |

---

## Two ways to provision a tenant

### 1. Self-serve (Stripe)

1. Customer opens https://kosmos-control-plane.fly.dev
2. Enters instance name + email → Stripe Checkout
3. On payment:
   - Stripe redirects to `/success?session_id=…`
   - Webhook `checkout.session.completed` fires (backup: success page also kicks off provision)
4. Control plane mints LiteLLM key, creates Fly app/volume/secrets, deploys template image
5. Customer opens `https://kosmos-<name>.fly.dev` → Kosmos first-run owner setup

**Test card:** `4242 4242 4242 4242`, any future expiry, any CVC.

### 2. Manual (operator CLI)

```bash
source deploy/fly/.deploy-secrets.local   # LITELLM_MASTER_KEY
npx tsx scripts/provision-tenant.ts acme --budget 5
# → https://kosmos-acme.fly.dev
```

Teardown:

```bash
npx tsx scripts/provision-tenant.ts acme --destroy
```

---

## Tenant runtime configuration

Set automatically on each tenant Fly app:

| Secret / env | Value |
| --- | --- |
| `LLM_PROVIDER` | `custom` |
| `LLM_BASE_URL` | `https://kosmos-gateway.fly.dev/v1` |
| `LLM_API_KEY` | LiteLLM virtual key (per tenant) |
| `LLM_MODEL` | `qwen3-30b` (default) |
| `ARCO_SECURE_COOKIES` | `1` |
| `ARCO_WORKSPACE_QUOTA_MB` | `512` |
| `ARCO_DATA_DIR` | `/data` (mounted volume) |

Inside Arco: **Settings → Usage & credits** reads `/api/usage` → gateway
`/key/info` for spend vs budget.

---

## Secrets and environment variables

Store operator secrets in `deploy/fly/.deploy-secrets.local` (gitignored).
Never commit API keys or the LiteLLM master key.

### Credits gateway (`kosmos-gateway`)

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Upstream inference |
| `DATABASE_URL` | Postgres for LiteLLM virtual keys/spend (Neon or Fly Postgres) |
| `LITELLM_MASTER_KEY` | Admin key for `/key/generate`, `/key/delete`, `/key/info` |

Generate master key: `sk-master-$(openssl rand -hex 16)`

### Control plane (`kosmos-control-plane`)

Set via `fly secrets set`:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_URL` | `https://kosmos-control-plane.fly.dev` |
| `STRIPE_SECRET_KEY` | Stripe test/live secret key |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook endpoint |
| `STRIPE_PRICE_ID` | Subscription price (e.g. `price_…`) |
| `LITELLM_MASTER_KEY` | Same as gateway master key |
| `FLY_API_TOKEN` | Org token: `fly tokens create org personal -n kosmos-control-plane` |

Optional overrides (defaults in [control-plane/fly.toml](control-plane/fly.toml)):
`GATEWAY_URL`, `TENANT_IMAGE`, `TENANT_BUDGET_USD`, `TENANT_MODEL`, etc.

### Stripe one-time setup

```bash
cd deploy/fly/control-plane
STRIPE_SECRET_KEY=sk_test_... ./scripts/setup-stripe.sh
```

Register webhook in Stripe Dashboard:

- **URL:** `https://kosmos-control-plane.fly.dev/webhooks/stripe`
- **Events:** `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`

Then set `STRIPE_WEBHOOK_SECRET` and `STRIPE_PRICE_ID` on the Fly app.

---

## Building the tenant image

Tenants deploy a **prebuilt** image — they never run `npm run build` on Fly.

From repo root (Mac/arm64 → linux/amd64):

```bash
npm run setup -- --skip-npm && npm run build

# Authenticate with Fly registry
fly auth docker

# Build and push runtime image (includes dist/)
docker build --platform linux/amd64 \
  -f deploy/fly/Dockerfile.runtime \
  -t registry.fly.io/kosmos-template:demo .
docker push registry.fly.io/kosmos-template:demo
```

**Why `Dockerfile.runtime`:** remote Fly builds OOM on Vite; cross-compiling
esbuild under QEMU is unstable. Build `dist/` on the host, copy into a slim
runtime image, `npm rebuild better-sqlite3` for amd64.

After a new image push, existing tenants need `fly deploy --image …` to pick up
the release (or destroy/reprovision).

---

## Control plane internals

- **Stack:** Hono + `@hono/node-server`, Stripe SDK, `better-sqlite3` on `/data`
- **Orders DB:** `control_plane_data` volume → `control-plane.db`
- **Provision:** `flyctl` inside container (`FLY_API_TOKEN`) — same steps as
  `scripts/provision-tenant.ts`
- **Deactivate (single orchestrator):** Stripe cancel → LiteLLM
  `/key/delete` by `key_alias` (= Fly app name) → Fly suspend or destroy.
  - `invoice.payment_failed` → **suspend** (keep volume; billing may recover)
  - `customer.subscription.deleted` → **destroy** (full teardown)
  - Operator API: `POST /admin/tenants/:name/deactivate` with
    `Authorization: Bearer $ADMIN_TOKEN` and optional
    `{"mode":"destroy"|"suspend"}`
  - CLI: `npx tsx scripts/provision-tenant.ts <name> --destroy`
    (uses control-plane admin API when `ADMIN_TOKEN` is set; otherwise
    cancels Stripe via `STRIPE_SECRET_KEY`, then LiteLLM + Fly locally)
  - Never use raw `fly apps destroy` alone — it leaves Stripe + LiteLLM behind.

**Health:** `GET /health` → `{"ok":true}`

**Order status API:** `GET /api/order/:stripe_session_id`

**Admin deactivate:**

```bash
curl -X POST https://kosmos-control-plane.fly.dev/admin/tenants/acme/deactivate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"destroy"}'
```

---

## End-to-end test checklist

### Gateway

```bash
curl -s https://kosmos-gateway.fly.dev/health/liveliness
# LiteLLM key + completion smoke test — see README.md §1
```

### Manual tenant

```bash
export LITELLM_MASTER_KEY=sk-master-...
npx tsx scripts/provision-tenant.ts demo2 --budget 5
open https://kosmos-demo2.fly.dev
```

1. Create owner account (first signup)
2. Chat with agent
3. Settings → Usage & credits shows spend
4. `fly machine list -a kosmos-demo2` — machine stops when idle

### Stripe tenant

1. https://kosmos-control-plane.fly.dev — new instance name
2. Complete Stripe test checkout
3. Land on `/success?session_id=…` — wait for "Your instance is ready"
4. Open tenant URL, first-run setup

If Stripe does not redirect, open the success URL manually (session id is in
Stripe Dashboard → Checkout sessions).

---

## Costs (approximate)

| Component | Billing |
| --- | --- |
| Tenant (idle) | ~$0.15/GB/mo volume |
| Tenant (active) | Per-second shared-cpu-1x/1GB |
| Gateway | ~$3–4/mo always-on (2GB VM) |
| Control plane | ~$2–3/mo always-on (512MB VM) |
| Inference | OpenRouter pass-through, capped per tenant key budget |

---

## Known gaps (not implemented yet)

| Area | Status |
| --- | --- |
| Marketing **www** site (Vercel) | Not built — control plane landing is minimal |
| Public **docs** site | Not built — `apps/docs` is in-app editor only |
| **Sign in** for returning customers | No lookup by email; must know instance URL |
| **Desktop app → cloud** pairing | Mobile has server profiles; desktop runs local backend only |
| Custom domains (`*.arco.app`) | Tenants use `*.fly.dev` |
| Central customer auth | Per-tenant Arco accounts only |
| Production Stripe / live mode | Test mode configured |
| Automated tenant image updates on release | Manual image push + redeploy |

Recommended next hosting split: **Vercel** for www + public docs, **Fly** for
control plane, gateway, and tenant instances.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Control plane 502 | App crash (check `fly logs -a kosmos-control-plane`) | Redeploy; ensure `tsx` is a production dependency |
| Paid but no redirect | Stripe redirect while app was down | Open `/success?session_id=cs_test_…` manually |
| Order stuck on `pending` | Webhook not delivered | Check Stripe webhook logs; success page triggers backup provision |
| `Key with alias already exists` | Stale LiteLLM key after failed provision | Teardown revokes by `key_alias` (= app name); or `POST /key/delete` with `{"key_aliases":["kosmos-…"]}` |
| Tenant build OOM on Fly | Vite in Docker | Use `Dockerfile.runtime` + host-built `dist/` |
| Image wrong arch | arm64 image on amd64 Fly | `docker build --platform linux/amd64` |
| Usage not showing in Settings | Gateway unreachable or wrong `LLM_API_KEY` | Check tenant secrets and `/key/info` |

---

## Deploy / redeploy commands

```bash
# Gateway
cd deploy/fly/gateway && fly deploy

# Control plane
cd deploy/fly/control-plane && fly deploy

# Tenant image (see "Building the tenant image" above)
```

---

## Related docs

- [README.md](README.md) — first-time deploy runbook
- [control-plane/scripts/setup-stripe.sh](control-plane/scripts/setup-stripe.sh) — Stripe product/price helper
- [gateway/config.yaml](gateway/config.yaml) — model catalog aliases
