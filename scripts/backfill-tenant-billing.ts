/**
 * Patch KOSMOS_* env onto an existing Fly tenant (manual / pre-billing provision).
 *
 *   npx tsx scripts/backfill-tenant-billing.ts arco-demo
 *   npx tsx scripts/backfill-tenant-billing.ts kosmos-demo --billing-token <hex>
 *
 * For billing API auth, the token must also exist in kosmos-control-plane's tenant
 * registry (Stripe checkout tenants get this automatically on backfill).
 *
 * Required env: FLY_API_TOKEN (or fly auth login).
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

const FLY = process.env.FLY_BIN ?? "fly";
const MACHINES = "https://api.machines.dev/v1";

interface Options {
  app: string;
  controlPlaneUrl: string;
  billingToken: string;
  paymentLinkUrl: string;
  portalLoginUrl: string;
}

function usageExit(message?: string): never {
  if (message) console.error(`error: ${message}\n`);
  console.error(
    `usage: npx tsx scripts/backfill-tenant-billing.ts <app> [options]
  --control-plane <url>   KOSMOS_CONTROL_PLANE_URL (default https://kosmos-control-plane.fly.dev)
  --billing-token <tok>   KOSMOS_TENANT_BILLING_TOKEN (optional for env-only patch)
  --payment-link <url>    KOSMOS_PAYMENT_LINK_URL (optional)
  --portal-login <url>    KOSMOS_PORTAL_LOGIN_URL (optional)`,
  );
  process.exit(1);
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    app: "",
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
    if (arg === "--control-plane") opts.controlPlaneUrl = next().replace(/\/+$/, "");
    else if (arg === "--billing-token") opts.billingToken = next();
    else if (arg === "--payment-link") opts.paymentLinkUrl = next();
    else if (arg === "--portal-login") opts.portalLoginUrl = next();
    else if (arg.startsWith("--")) usageExit(`unknown option ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 1) usageExit("exactly one <app> required");
  opts.app = positional[0];
  return opts;
}

function flyToken(): string {
  const env = process.env.FLY_API_TOKEN?.trim();
  if (env) return env;
  const flyBin = process.env.FLY_BIN ?? "/Users/paulbloch/.fly/bin/fly";
  try {
    return execFileSync(flyBin, ["auth", "token"], { encoding: "utf-8" }).trim();
  } catch {
    console.error("error: set FLY_API_TOKEN or run fly auth login");
    process.exit(1);
  }
}

async function flyJson(token: string, route: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${MACHINES}${route}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`fly ${route}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function kosmosEnv(opts: Options): Record<string, string> {
  const env: Record<string, string> = {
    KOSMOS_BILLING_MANAGED: "1",
    KOSMOS_TENANT_APP: opts.app,
    KOSMOS_CONTROL_PLANE_URL: opts.controlPlaneUrl,
  };
  if (opts.billingToken) env.KOSMOS_TENANT_BILLING_TOKEN = opts.billingToken;
  if (opts.paymentLinkUrl) env.KOSMOS_PAYMENT_LINK_URL = opts.paymentLinkUrl;
  if (opts.portalLoginUrl) env.KOSMOS_PORTAL_LOGIN_URL = opts.portalLoginUrl;
  return env;
}

const opts = parseArgs(process.argv.slice(2));
const token = flyToken();

const machines = (await flyJson(token, `/apps/${opts.app}/machines`)) as { id: string }[];
if (!machines.length) usageExit(`no machines on ${opts.app}`);

const machineId = machines[0].id;
const machine = (await flyJson(token, `/apps/${opts.app}/machines/${machineId}`)) as {
  config: Record<string, unknown>;
};
const existingEnv = (machine.config.env as Record<string, string> | undefined) ?? {};
const mergedEnv = { ...existingEnv, ...kosmosEnv(opts) };

console.log(`Patching ${opts.app} machine ${machineId} with KOSMOS_* env…`);
await flyJson(token, `/apps/${opts.app}/machines/${machineId}`, {
  method: "POST",
  body: JSON.stringify({ config: { ...machine.config, env: mergedEnv } }),
});

console.log(`✔ ${opts.app} updated — machine will restart briefly.`);
if (!opts.billingToken) {
  console.log(
    "  note: no --billing-token — Settings billing portal will not auth until the token is in the control-plane registry.",
  );
}
