# Kosmos Fly ops runbook

Operator reference for the hosted stack: what is live, how teardown works, and
how to avoid orphaned Stripe / LiteLLM / Fly resources.

Companion docs:

- [README.md](README.md) — first-time deploy
- [SAAS.md](SAAS.md) — architecture, secrets, gaps

Fly CLI (if not on `PATH`): `~/.fly/bin/flyctl` (alias `fly`).

---

## Current live apps (personal org)

| App | Role | Notes |
| --- | --- | --- |
| `kosmos-control-plane` | Stripe signup + provision + deactivate | Always on; https://kosmos-control-plane.fly.dev |
| `kosmos-gateway` | LiteLLM credits proxy | Always on; https://kosmos-gateway.fly.dev |
| `kosmos-litellm-db` | Fly Postgres for LiteLLM keys/spend | Used by gateway `DATABASE_URL` |
| `kosmos-template` | Tenant image registry slot | **Pending with 0 machines is normal** |

Customer instances appear as `kosmos-<name>` when provisioned.

### Why `kosmos-template` shows Pending

It is **not** a running service. It only holds the shared tenant image
(`registry.fly.io/kosmos-template:demo`). Fly shows **Pending** when an app has
never had a machine — expected for registry-only apps even after
`--build-only --push`.

Push / refresh the image:

```bash
# From repo root
fly deploy . --config deploy/fly/template.fly.toml --build-only --push --image-label demo
```

### Gateway UI

- URL: https://kosmos-gateway.fly.dev/ui
- Auth: LiteLLM **master key** (`LITELLM_MASTER_KEY` on the gateway). No separate
  username/password unless `UI_USERNAME` / `UI_PASSWORD` are set.
- Fly dashboard: https://fly.io/apps/kosmos-gateway

---

## Account deactivation (Stripe + LiteLLM + Fly)

All teardown must go through one orchestrator so nothing is left billing or
callable after an account is closed.

**Implementation:** `control-plane/src/deactivate.ts` (`deactivateTenant` /
`deactivateOrder`).

### Order of operations

```
1. Stripe  — cancel subscription (unless already canceled / payment_failed)
2. LiteLLM — POST /key/delete { "key_aliases": ["<fly-app-name>"] }
3. Fly     — apps suspend  OR  apps destroy
4. Orders  — mark suspended, or delete row (destroy frees the tenant name)
```

LiteLLM virtual keys use `key_alias = Fly app name` (e.g. `kosmos-acme`).
Revoke does **not** require storing the secret key in the control-plane DB.

### Triggers

| Trigger | Stripe | LiteLLM | Fly | Order row |
| --- | --- | --- | --- | --- |
| `customer.subscription.deleted` webhook | already canceled | revoke | **destroy** | removed |
| `invoice.payment_failed` webhook | leave active (retry) | revoke | **suspend** | `suspended` |
| `POST /admin/tenants/:name/deactivate` | cancel (if found) | revoke | destroy or suspend | per mode |
| CLI `provision-tenant.ts --destroy` | cancel via admin API or `STRIPE_SECRET_KEY` | revoke | destroy | local record deleted |

### Operator commands

**Prefer admin API** (runs on the control plane with Fly + gateway credentials):

```bash
curl -X POST https://kosmos-control-plane.fly.dev/admin/tenants/acme/deactivate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"destroy"}'
```

`ADMIN_TOKEN` is a Fly secret on `kosmos-control-plane`.

**CLI** (from repo root):

```bash
# Best: let control plane orchestrate
export ADMIN_TOKEN=...
npx tsx scripts/provision-tenant.ts acme --destroy

# Fallback without admin token: local Stripe + LiteLLM + Fly
export STRIPE_SECRET_KEY=sk_...          # live or test matching the sub
export LITELLM_MASTER_KEY=sk-master-...
npx tsx scripts/provision-tenant.ts acme --destroy
```

### Do not

- Do **not** run `fly apps destroy kosmos-…` alone — leaves Stripe subs and
  LiteLLM keys active (this caused the `arco-test` / smoke-key orphans).
- Do **not** assume Stripe Dashboard cancel alone cleans Fly/LiteLLM — the
  webhook must reach the control plane (`customer.subscription.deleted`).

---

## Stripe notes

- Control plane Fly secret is **live** (`sk_live_…`).
- Local `deploy/fly/.deploy-secrets.local` may still hold a **test** key
  (`sk_test_…`). When canceling from the CLI, use the key for the mode that
  created the subscription.
- Subscription metadata (set at Checkout) must include:
  - `tenant_name` — short name (`acme`)
  - `app_name` — full Fly app (`kosmos-acme`)
  - `order_id` — control-plane order UUID

### Audit open subscriptions

```bash
# Live (from control plane)
fly ssh console -a kosmos-control-plane -C 'printenv STRIPE_SECRET_KEY'
# Then list with Stripe API / Dashboard — expect 0 active when no tenants

# Test (from .deploy-secrets.local)
# stripe subscriptions list --status active
```

---

## LiteLLM key hygiene

List / delete with master key:

```bash
export LITELLM_MASTER_KEY=sk-master-...
curl -s https://kosmos-gateway.fly.dev/key/list \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"

curl -s -X POST https://kosmos-gateway.fly.dev/key/delete \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key_aliases":["kosmos-acme"]}'
```

Failed provision and deactivate both revoke by alias so
`Key with alias already exists` should be rare.

---

## Infra hygiene lessons (Jul 2026 cleanup)

These issues showed up during ops cleanup; the deactivate path exists to prevent
them going forward.

| Issue | Cause | Fix applied / rule |
| --- | --- | --- |
| Duplicate `kosmos-gateway` machines | Fly host migration left old VM; `auto_stop=off` | Destroy extras; keep scale = 1 |
| Orphan LiteLLM keys (`arco-*`, `smoke*`) | Raw `fly apps destroy` | Always deactivate; revoke by alias |
| Orphan Stripe test sub for `arco-test` | Destroyed Fly without canceling Stripe | Cancel via deactivate / admin API |
| Parallel `arco-*` stack still running | Rename leftover from Arco → Kosmos | Destroyed; keep only `kosmos-*` (+ DB) |
| DB named `arco-litellm-db` | Legacy name | Forked to `kosmos-litellm-db`, pointed gateway `DATABASE_URL`, destroyed old app |

Internal Postgres role/db may still be named `arco_gateway` (cosmetic; credentials
unchanged after the fork).

---

## Reconciliation checklist

Run periodically or after any manual Fly/Stripe change:

```bash
fly apps list
fly machine list -a kosmos-gateway          # expect 1 started
curl -s https://kosmos-gateway.fly.dev/health/liveliness
curl -s https://kosmos-control-plane.fly.dev/health

# LiteLLM: every key_alias should match a live kosmos-* tenant (or be master-only)
# Stripe: every active subscription metadata.app_name should exist on Fly
# Fly: every kosmos-* tenant (not gateway/control-plane/template/db) should have
#      an active Stripe sub OR be intentionally CLI-only
```

---

## Deploy commands

```bash
# Control plane (deactivate + webhooks)
cd deploy/fly/control-plane && fly deploy

# Gateway
cd deploy/fly/gateway && fly deploy

# Tenant image
fly deploy . --config deploy/fly/template.fly.toml --build-only --push --image-label demo
```

Health:

- https://kosmos-control-plane.fly.dev/health → `{"ok":true}`
- https://kosmos-gateway.fly.dev/health/liveliness → 200

---

## Related code

| Path | Role |
| --- | --- |
| [control-plane/src/deactivate.ts](control-plane/src/deactivate.ts) | Orchestrator |
| [control-plane/src/stripe-handlers.ts](control-plane/src/stripe-handlers.ts) | Webhook → deactivate |
| [control-plane/src/index.ts](control-plane/src/index.ts) | `POST /admin/tenants/:name/deactivate` |
| [control-plane/src/provision.ts](control-plane/src/provision.ts) | Provision + Fly/LiteLLM helpers |
| [../../scripts/provision-tenant.ts](../../scripts/provision-tenant.ts) | CLI provision / destroy |
