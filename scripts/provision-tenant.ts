/**
 * Provision (or destroy) one hosted Arco tenant on Fly.io.
 *
 *   npx tsx scripts/provision-tenant.ts <name> [--budget 5] [--model qwen3-30b]
 *   npx tsx scripts/provision-tenant.ts <name> --destroy
 *
 * Provisioning mints a budget-capped LiteLLM virtual key on the credits
 * gateway, creates a Fly app + 1GB volume, stages the LLM_* secrets, and
 * deploys the prebuilt template image (see deploy/fly/template.fly.toml —
 * tenants never rebuild Arco). The tenant record, including its virtual key,
 * lands in deploy/fly/tenants/<app>.json (gitignored — keys live only there
 * and in Fly secrets).
 *
 * Required env: LITELLM_MASTER_KEY (the gateway's master key).
 * Optional env: FLY_BIN (defaults to "fly").
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATE = path.join(REPO_ROOT, "deploy/fly/tenant/fly.toml.tmpl");
const TENANTS_DIR = path.join(REPO_ROOT, "deploy/fly/tenants");
const FLY = process.env.FLY_BIN ?? "fly";

interface Options {
  name: string;
  destroy: boolean;
  budget: number;
  model: string;
  region: string;
  org: string;
  prefix: string;
  image: string;
  gateway: string;
  volumeGb: number;
  quotaMb: number;
  billingManaged: boolean;
  controlPlaneUrl: string;
  billingToken: string;
  paymentLinkUrl: string;
  portalLoginUrl: string;
}

function usageExit(message?: string): never {
  if (message) console.error(`error: ${message}\n`);
  console.error(
    `usage: npx tsx scripts/provision-tenant.ts <name> [options]
  --destroy            tear down Stripe + LiteLLM + Fly (prefer this over fly apps destroy)
  --budget <usd>       LiteLLM key budget in USD          (default 5)
  --model <name>       gateway model for LLM_MODEL        (default qwen3-30b)
  --region <code>      Fly region                         (default iad)
  --org <slug>         Fly org                            (default personal)
  --prefix <str>       app-name prefix                    (default kosmos)
  --image <ref>        tenant image                       (default registry.fly.io/kosmos-template:demo)
  --gateway <url>      credits gateway base URL           (default https://kosmos-gateway.fly.dev)
  --volume-gb <n>      /data volume size                  (default 1)
  --quota-mb <n>       ARCO_WORKSPACE_QUOTA_MB            (default 512)
  --billing-managed    set KOSMOS_BILLING_MANAGED=1 on tenant
  --control-plane <url> KOSMOS_CONTROL_PLANE_URL (with --billing-managed)
  --billing-token <tok> KOSMOS_TENANT_BILLING_TOKEN (minted by control plane)
  --payment-link <url>  KOSMOS_PAYMENT_LINK_URL (optional)
  --portal-login <url>  KOSMOS_PORTAL_LOGIN_URL (optional)`,
  );
  process.exit(1);
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    name: "",
    destroy: false,
    budget: 5,
    model: "qwen3-30b",
    region: "iad",
    org: "personal",
    prefix: "kosmos",
    image: "registry.fly.io/kosmos-template:demo",
    gateway: "https://kosmos-gateway.fly.dev",
    volumeGb: 1,
    quotaMb: 512,
    billingManaged: false,
    controlPlaneUrl: "https://kosmos-control-plane.fly.dev",
    billingToken: "",
    paymentLinkUrl: "",
    portalLoginUrl: "",
  };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) usageExit(`${arg} needs a value`);
      return v;
    };
    if (arg === "--destroy") opts.destroy = true;
    else if (arg === "--budget") opts.budget = Number(next());
    else if (arg === "--model") opts.model = next();
    else if (arg === "--region") opts.region = next();
    else if (arg === "--org") opts.org = next();
    else if (arg === "--prefix") opts.prefix = next();
    else if (arg === "--image") opts.image = next();
    else if (arg === "--gateway") opts.gateway = next().replace(/\/+$/, "");
    else if (arg === "--volume-gb") opts.volumeGb = Number(next());
    else if (arg === "--quota-mb") opts.quotaMb = Number(next());
    else if (arg === "--billing-managed") opts.billingManaged = true;
    else if (arg === "--control-plane") opts.controlPlaneUrl = next().replace(/\/+$/, "");
    else if (arg === "--billing-token") opts.billingToken = next();
    else if (arg === "--payment-link") opts.paymentLinkUrl = next();
    else if (arg === "--portal-login") opts.portalLoginUrl = next();
    else if (arg.startsWith("--")) usageExit(`unknown option ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 1) usageExit("exactly one tenant <name> required");
  opts.name = positional[0];
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(opts.name)) {
    usageExit("name must be lowercase letters/digits/dashes, 3–30 chars");
  }
  if (!Number.isFinite(opts.budget) || opts.budget <= 0) usageExit("--budget must be a positive number");
  return opts;
}

function fly(args: string[], opts: { allowFail?: boolean } = {}): string {
  console.log(`  $ ${FLY} ${args.join(" ")}`);
  try {
    return execFileSync(FLY, args, { encoding: "utf-8", stdio: ["ignore", "pipe", "inherit"] });
  } catch (err) {
    if (opts.allowFail) return "";
    throw err;
  }
}

function masterKey(): string {
  const key = process.env.LITELLM_MASTER_KEY?.trim();
  if (!key) {
    console.error("error: LITELLM_MASTER_KEY is not set (the gateway's master key).");
    process.exit(1);
  }
  return key;
}

async function gatewayPost(gateway: string, route: string, body: unknown): Promise<Response> {
  return fetch(`${gateway}${route}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${masterKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
}

interface TenantRecord {
  app: string;
  url: string;
  entryUrl: string;
  virtualKey: string;
  budgetUsd: number;
  model: string;
  region: string;
  image: string;
  gateway: string;
  createdAt: string;
  stripeSubscriptionId?: string;
}

async function revokeGatewayKey(
  gateway: string,
  app: string,
  virtualKey?: string,
): Promise<boolean> {
  // Alias is always the Fly app name — works even without a local tenant record.
  const body: { key_aliases: string[]; keys?: string[] } = { key_aliases: [app] };
  if (virtualKey) body.keys = [virtualKey];
  const res = await gatewayPost(gateway, "/key/delete", body).catch(() => null);
  return Boolean(res?.ok);
}

async function provision(opts: Options): Promise<void> {
  const app = `${opts.prefix}-${opts.name}`;
  const url = `https://${app}.fly.dev`;
  const entryKey = randomBytes(32).toString("hex");
  const recordPath = path.join(TENANTS_DIR, `${app}.json`);
  const tomlPath = path.join(TENANTS_DIR, `${app}.toml`);
  if (fs.existsSync(recordPath)) {
    console.error(`error: ${recordPath} exists — tenant already provisioned (use --destroy first).`);
    process.exit(1);
  }

  console.log(`\n[1/5] Minting LiteLLM virtual key on ${opts.gateway} (budget $${opts.budget})`);
  const keyRes = await gatewayPost(opts.gateway, "/key/generate", {
    key_alias: app,
    max_budget: opts.budget,
    metadata: { tenant: opts.name, provisionedBy: "provision-tenant.ts" },
  });
  if (!keyRes.ok) {
    console.error(`error: /key/generate failed: ${keyRes.status} ${await keyRes.text()}`);
    process.exit(1);
  }
  const virtualKey = ((await keyRes.json()) as { key?: string }).key;
  if (!virtualKey) {
    console.error("error: gateway response had no `key` field");
    process.exit(1);
  }

  try {
    console.log(`\n[2/5] Creating Fly app ${app} (org ${opts.org})`);
    fly(["apps", "create", app, "--org", opts.org]);

    console.log(`\n[3/5] Creating ${opts.volumeGb}GB volume in ${opts.region}`);
    fly([
      "volumes", "create", "arco_data",
      "--app", app, "--region", opts.region,
      "--size", String(opts.volumeGb), "--yes",
    ]);

    console.log("\n[4/5] Staging secrets");
    const secrets = [
      "LLM_PROVIDER=custom",
      `LLM_BASE_URL=${opts.gateway}/v1`,
      `LLM_API_KEY=${virtualKey}`,
      `LLM_MODEL=${opts.model}`,
      "ARCO_SECURE_COOKIES=1",
      `ARCO_ENTRY_MAGIC_KEY=${entryKey}`,
      `ARCO_WORKSPACE_QUOTA_MB=${opts.quotaMb}`,
    ];
    if (opts.billingManaged) {
      secrets.push("KOSMOS_BILLING_MANAGED=1", `KOSMOS_TENANT_APP=${app}`);
      secrets.push(`KOSMOS_CONTROL_PLANE_URL=${opts.controlPlaneUrl}`);
      if (opts.billingToken) secrets.push(`KOSMOS_TENANT_BILLING_TOKEN=${opts.billingToken}`);
      if (opts.paymentLinkUrl) secrets.push(`KOSMOS_PAYMENT_LINK_URL=${opts.paymentLinkUrl}`);
      if (opts.portalLoginUrl) secrets.push(`KOSMOS_PORTAL_LOGIN_URL=${opts.portalLoginUrl}`);
    }
    fly(["secrets", "set", "--app", app, "--stage", ...secrets]);

    console.log(`\n[5/5] Deploying ${opts.image}`);
    fs.mkdirSync(TENANTS_DIR, { recursive: true });
    const toml = fs
      .readFileSync(TEMPLATE, "utf-8")
      .replaceAll("__APP__", app)
      .replaceAll("__REGION__", opts.region);
    fs.writeFileSync(tomlPath, toml, "utf-8");
    // --ha=false: one machine per tenant — the single volume is the instance.
    fly(["deploy", "--config", tomlPath, "--image", opts.image, "--ha=false"]);
  } catch (err) {
    console.error("\nprovision failed — revoking gateway key and destroying app");
    await revokeGatewayKey(opts.gateway, app, virtualKey);
    fly(["apps", "destroy", app, "--yes"], { allowFail: true });
    fs.rmSync(tomlPath, { force: true });
    throw err;
  }

  const record: TenantRecord = {
    app,
    url,
    entryUrl: `${url}/entry/${entryKey}`,
    virtualKey,
    budgetUsd: opts.budget,
    model: opts.model,
    region: opts.region,
    image: opts.image,
    gateway: opts.gateway,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), "utf-8");

  console.log(`\n✔ Tenant ready: ${record.url}`);
  console.log(`  Private entry URL: ${record.entryUrl}`);
  console.log("  The customer must use the private entry URL before creating their owner account.");
  console.log(`  Record (contains the virtual key): ${path.relative(REPO_ROOT, recordPath)}`);
}

async function cancelStripeSubscription(
  app: string,
  subscriptionId?: string,
): Promise<"canceled" | "skipped" | "absent" | "failed"> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.log("  note: STRIPE_SECRET_KEY unset — skipping Stripe cancel");
    return "absent";
  }

  const auth = Buffer.from(`${key}:`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  let subId = subscriptionId?.trim() || "";
  if (!subId) {
    const q = encodeURIComponent(`metadata["app_name"]:"${app}" AND status:"active"`);
    const searchRes = await fetch(`https://api.stripe.com/v1/subscriptions/search?query=${q}&limit=1`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);
    if (!searchRes?.ok) {
      console.log("  warning: Stripe subscription search failed");
      return "failed";
    }
    const found = (await searchRes.json()) as { data?: Array<{ id: string }> };
    subId = found.data?.[0]?.id ?? "";
  }
  if (!subId) {
    console.log("  note: no active Stripe subscription for this app");
    return "absent";
  }

  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res?.ok) {
    console.log(`  warning: Stripe cancel failed for ${subId} (HTTP ${res?.status ?? "network"})`);
    return "failed";
  }
  console.log(`  canceled ${subId}`);
  return "canceled";
}

async function destroyViaControlPlane(opts: Options): Promise<boolean> {
  const token = process.env.ADMIN_TOKEN?.trim();
  if (!token) return false;
  const url = `${opts.controlPlaneUrl}/admin/tenants/${opts.name}/deactivate`;
  console.log(`\n[control-plane] POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode: "destroy" }),
    signal: AbortSignal.timeout(120_000),
  }).catch(() => null);
  if (!res?.ok) {
    console.log(`  warning: control-plane deactivate failed (HTTP ${res?.status ?? "network"}) — falling back to local teardown`);
    return false;
  }
  console.log("  ", await res.text());
  return true;
}

async function destroy(opts: Options): Promise<void> {
  const app = `${opts.prefix}-${opts.name}`;
  const recordPath = path.join(TENANTS_DIR, `${app}.json`);
  const tomlPath = path.join(TENANTS_DIR, `${app}.toml`);

  let record: TenantRecord | null = null;
  try {
    record = JSON.parse(fs.readFileSync(recordPath, "utf-8")) as TenantRecord;
  } catch {
    console.log(`note: no record at ${recordPath} — tearing down by app name ${app}.`);
  }

  // Prefer the control-plane orchestrator when ADMIN_TOKEN is set (Stripe+LiteLLM+Fly).
  if (await destroyViaControlPlane(opts)) {
    fs.rmSync(recordPath, { force: true });
    fs.rmSync(tomlPath, { force: true });
    console.log(`\n✔ Tenant ${app} destroyed via control plane.`);
    return;
  }

  console.log(`\n[1/3] Canceling Stripe subscription for ${app}`);
  await cancelStripeSubscription(app, record?.stripeSubscriptionId);

  console.log(`\n[2/3] Revoking gateway key for ${app}`);
  const revoked = await revokeGatewayKey(
    record?.gateway ?? opts.gateway,
    app,
    record?.virtualKey,
  );
  if (!revoked) console.log("  warning: key revoke failed — delete it in the LiteLLM UI.");

  console.log(`\n[3/3] Destroying Fly app ${app} (volume goes with it)`);
  fly(["apps", "destroy", app, "--yes"], { allowFail: true });

  fs.rmSync(recordPath, { force: true });
  fs.rmSync(tomlPath, { force: true });
  console.log(`\n✔ Tenant ${app} destroyed.`);
}

const opts = parseArgs(process.argv.slice(2));
await (opts.destroy ? destroy(opts) : provision(opts));
