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
}

function usageExit(message?: string): never {
  if (message) console.error(`error: ${message}\n`);
  console.error(
    `usage: npx tsx scripts/provision-tenant.ts <name> [options]
  --destroy            tear the tenant down (app, volume, key, record)
  --budget <usd>       LiteLLM key budget in USD          (default 5)
  --model <name>       gateway model for LLM_MODEL        (default qwen3-30b)
  --region <code>      Fly region                         (default iad)
  --org <slug>         Fly org                            (default personal)
  --prefix <str>       app-name prefix                    (default kosmos)
  --image <ref>        tenant image                       (default registry.fly.io/kosmos-template:demo)
  --gateway <url>      credits gateway base URL           (default https://kosmos-gateway.fly.dev)
  --volume-gb <n>      /data volume size                  (default 1)
  --quota-mb <n>       ARCO_WORKSPACE_QUOTA_MB            (default 512)`,
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
  virtualKey: string;
  budgetUsd: number;
  model: string;
  region: string;
  image: string;
  gateway: string;
  createdAt: string;
}

async function provision(opts: Options): Promise<void> {
  const app = `${opts.prefix}-${opts.name}`;
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

  console.log(`\n[2/5] Creating Fly app ${app} (org ${opts.org})`);
  fly(["apps", "create", app, "--org", opts.org]);

  console.log(`\n[3/5] Creating ${opts.volumeGb}GB volume in ${opts.region}`);
  fly([
    "volumes", "create", "arco_data",
    "--app", app, "--region", opts.region,
    "--size", String(opts.volumeGb), "--yes",
  ]);

  console.log("\n[4/5] Staging secrets");
  fly([
    "secrets", "set", "--app", app, "--stage",
    "LLM_PROVIDER=custom",
    `LLM_BASE_URL=${opts.gateway}/v1`,
    `LLM_API_KEY=${virtualKey}`,
    `LLM_MODEL=${opts.model}`,
    "ARCO_SECURE_COOKIES=1",
    `ARCO_WORKSPACE_QUOTA_MB=${opts.quotaMb}`,
  ]);

  console.log(`\n[5/5] Deploying ${opts.image}`);
  fs.mkdirSync(TENANTS_DIR, { recursive: true });
  const toml = fs
    .readFileSync(TEMPLATE, "utf-8")
    .replaceAll("__APP__", app)
    .replaceAll("__REGION__", opts.region);
  fs.writeFileSync(tomlPath, toml, "utf-8");
  // --ha=false: one machine per tenant — the single volume is the instance.
  fly(["deploy", "--config", tomlPath, "--image", opts.image, "--ha=false"]);

  const record: TenantRecord = {
    app,
    url: `https://${app}.fly.dev`,
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
  console.log("  First visit shows Arco's first-run setup — the customer creates their owner account there.");
  console.log(`  Record (contains the virtual key): ${path.relative(REPO_ROOT, recordPath)}`);
}

async function destroy(opts: Options): Promise<void> {
  const app = `${opts.prefix}-${opts.name}`;
  const recordPath = path.join(TENANTS_DIR, `${app}.json`);
  const tomlPath = path.join(TENANTS_DIR, `${app}.toml`);

  let record: TenantRecord | null = null;
  try {
    record = JSON.parse(fs.readFileSync(recordPath, "utf-8")) as TenantRecord;
  } catch {
    console.log(`note: no record at ${recordPath} — destroying the Fly app only.`);
  }

  if (record?.virtualKey) {
    console.log(`\n[1/2] Revoking gateway key for ${app}`);
    const res = await gatewayPost(record.gateway ?? opts.gateway, "/key/delete", {
      keys: [record.virtualKey],
    }).catch(() => null);
    if (!res?.ok) console.log("  warning: key revoke failed — delete it in the LiteLLM UI.");
  }

  console.log(`\n[2/2] Destroying Fly app ${app} (volume goes with it)`);
  fly(["apps", "destroy", app, "--yes"], { allowFail: true });

  fs.rmSync(recordPath, { force: true });
  fs.rmSync(tomlPath, { force: true });
  console.log(`\n✔ Tenant ${app} destroyed.`);
}

const opts = parseArgs(process.argv.slice(2));
await (opts.destroy ? destroy(opts) : provision(opts));
