# Hosted Arco on Fly.io — demo runbook

The usage-based stack from the SaaS plan: one Firecracker microVM + volume per
tenant (auto-stop when idle), a LiteLLM credits gateway routing to serverless
per-token inference (OpenRouter), budget-capped virtual keys per tenant.

**Full architecture, live apps, secrets, and gaps:** see [SAAS.md](SAAS.md).

```
customer ──► https://kosmos-<name>.fly.dev          (tenant microVM, /data volume)
                    │  LLM_BASE_URL + virtual key
                    ▼
             https://kosmos-gateway.fly.dev          (LiteLLM proxy, always on)
                    │  OPENROUTER_API_KEY
                    ▼
             OpenRouter (per-token serverless)     Neon Postgres (key/spend store)
```

## 0. Accounts (one-time, ~20 min)

| Service | Sign up | Then |
| --- | --- | --- |
| Fly.io | <https://fly.io/app/sign-up> | `brew install flyctl` → `fly auth login`; add a card at <https://fly.io/dashboard> → Billing |
| OpenRouter | <https://openrouter.ai> | Buy ~$10 credits: <https://openrouter.ai/settings/credits>; create an API key: <https://openrouter.ai/settings/keys> |
| Neon | <https://console.neon.tech/signup> | Create a free project; copy the **connection string** (postgres://…) |

## 1. Deploy the credits gateway

```bash
cd deploy/fly/gateway
fly apps create kosmos-gateway --org personal   # rename if taken; app names are global
fly secrets set --app kosmos-gateway \
  OPENROUTER_API_KEY=sk-or-... \
  DATABASE_URL='postgres://...neon.tech/...' \
  LITELLM_MASTER_KEY=sk-master-$(openssl rand -hex 16)
fly deploy
```

Smoke test (save the master key somewhere safe first):

```bash
curl -s https://kosmos-gateway.fly.dev/key/generate \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H "Content-Type: application/json" \
  -d '{"key_alias":"smoke","max_budget":1}'
# → {"key":"sk-..."} — then run one completion with it:
curl -s https://kosmos-gateway.fly.dev/v1/chat/completions \
  -H "Authorization: Bearer sk-..." -H "Content-Type: application/json" \
  -d '{"model":"qwen3-30b","messages":[{"role":"user","content":"hi"}]}'
# and confirm spend registered:
curl -s https://kosmos-gateway.fly.dev/key/info -H "Authorization: Bearer sk-..."
```

Model catalog lives in [gateway/config.yaml](gateway/config.yaml) — verify the
OpenRouter slugs at <https://openrouter.ai/models> before first deploy.

## 2. Build the shared tenant image (once per release)

```bash
# From the repo root:
fly apps create kosmos-template --org personal
fly deploy . --config deploy/fly/template.fly.toml --build-only --push --image-label demo
```

If the remote builder OOMs on the Vite build, add `--local-only` (needs
Docker/Colima running).

## 3. Provision a tenant

```bash
export LITELLM_MASTER_KEY=sk-master-...
npx tsx scripts/provision-tenant.ts acme --budget 5
# → https://kosmos-acme.fly.dev  (first visit = Kosmos first-run owner setup)
```

Teardown: `npx tsx scripts/provision-tenant.ts acme --destroy`

## 4. Demo script (~2 min)

1. Provision live in the terminal — five numbered steps, ends with the URL.
2. Open the URL, create the owner account, chat with the agent.
3. Settings → **Usage & credits**: spend/remaining against the $5 budget,
   refreshed from the gateway (`/key/info`).
4. Ask the agent to write a multi-hundred-MB file — the workspace quota
   (`ARCO_WORKSPACE_QUOTA_MB`, default 512) refuses it.
5. Show the machine auto-stopping after idle in `fly machine list -a kosmos-acme`
   (storage-only billing while stopped).

## Costs & caveats

- Tenant at rest ≈ $0.15/GB/mo volume + rootfs; active ≈ per-second
  shared-cpu-1x/1GB. Gateway always-on ≈ $3–4/mo. Inference: pass-through
  OpenRouter per-token, capped by each tenant's key budget.
- Cold start after idle: first request waits a few seconds — expected, it's
  the margin story.
- Cron automations don't fire while a machine is stopped. Keep automation
  demos off, or keep that tenant warm (`min_machines_running = 1`).
- The tenant record in `deploy/fly/tenants/` (gitignored) holds the virtual
  key — treat the directory as secrets.
