import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Config } from "./config.js";

const TENANT_TEMPLATE = `app = "__APP__"
primary_region = "__REGION__"

[env]
  PORT = "4600"
  ARCO_DATA_DIR = "/data"

[mounts]
  source = "arco_data"
  destination = "/data"

[http_service]
  internal_port = 4600
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1
`;

export interface ProvisionResult {
  app: string;
  url: string;
  entryUrl: string;
  virtualKey: string;
}

function fly(config: Config, args: string[], allowFail = false): string {
  try {
    return execFileSync(config.flyBin, args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FLY_API_TOKEN: process.env.FLY_API_TOKEN },
    });
  } catch (err) {
    if (allowFail) return "";
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`fly ${args.join(" ")} failed: ${message}`);
  }
}

async function gatewayPost(config: Config, route: string, body: unknown): Promise<Response> {
  return fetch(`${config.gatewayUrl}${route}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.litellmMasterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
}

/** Revoke the tenant's LiteLLM key. Alias is always the Fly app name. */
export async function revokeGatewayKey(
  config: Config,
  appName: string,
  virtualKey?: string,
): Promise<void> {
  const body: { key_aliases: string[]; keys?: string[] } = { key_aliases: [appName] };
  if (virtualKey) body.keys = [virtualKey];
  const res = await gatewayPost(config, "/key/delete", body).catch(() => null);
  if (!res?.ok) {
    console.warn(`gateway key revoke failed for ${appName}: ${res?.status ?? "network"}`);
    throw new Error(`gateway key revoke failed: ${res?.status ?? "network"}`);
  }
}

export function suspendFlyApp(config: Config, appName: string): void {
  fly(config, ["apps", "suspend", appName], true);
}

export function destroyFlyApp(config: Config, appName: string): void {
  fly(config, ["apps", "destroy", appName, "--yes"], true);
}

export async function provisionTenant(config: Config, tenantName: string): Promise<ProvisionResult> {
  const app = `${config.tenantPrefix}-${tenantName}`;
  const url = `https://${app}.fly.dev`;
  const entryKey = randomBytes(32).toString("hex");
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "kosmos-provision-"));
  const tomlPath = path.join(workDir, `${app}.toml`);

  const keyRes = await gatewayPost(config, "/key/generate", {
    key_alias: app,
    max_budget: config.tenantBudgetUsd,
    metadata: { tenant: tenantName, provisionedBy: "kosmos-control-plane" },
  });
  if (!keyRes.ok) {
    throw new Error(`/key/generate failed: ${keyRes.status} ${await keyRes.text()}`);
  }
  const virtualKey = ((await keyRes.json()) as { key?: string }).key;
  if (!virtualKey) throw new Error("gateway response had no key field");

  try {
    fly(config, ["apps", "create", app, "--org", config.tenantOrg]);
    fly(config, [
      "volumes",
      "create",
      "arco_data",
      "--app",
      app,
      "--region",
      config.tenantRegion,
      "--size",
      String(config.tenantVolumeGb),
      "--yes",
    ]);
    fly(config, [
      "secrets",
      "set",
      "--app",
      app,
      "--stage",
      "LLM_PROVIDER=custom",
      `LLM_BASE_URL=${config.gatewayUrl}/v1`,
      `LLM_API_KEY=${virtualKey}`,
      `LLM_MODEL=${config.tenantModel}`,
      "ARCO_SECURE_COOKIES=1",
      `ARCO_ENTRY_MAGIC_KEY=${entryKey}`,
      `ARCO_WORKSPACE_QUOTA_MB=${config.tenantQuotaMb}`,
      "KOSMOS_BILLING_MANAGED=1",
      `KOSMOS_TENANT_APP=${app}`,
      `KOSMOS_CONTROL_PLANE_URL=${config.publicUrl}`,
    ]);

    const toml = TENANT_TEMPLATE.replaceAll("__APP__", app).replaceAll("__REGION__", config.tenantRegion);
    fs.writeFileSync(tomlPath, toml, "utf-8");
    fly(config, ["deploy", "--config", tomlPath, "--image", config.tenantImage, "--ha=false"]);
  } catch (err) {
    await revokeGatewayKey(config, app, virtualKey).catch(() => undefined);
    destroyFlyApp(config, app);
    throw err;
  }

  return { app, url, entryUrl: `${url}/entry/${entryKey}`, virtualKey };
}

/**
 * @deprecated Prefer deactivateTenant from ./deactivate.js
 * Suspend a tenant Fly app and revoke its LiteLLM virtual key.
 */
export async function suspendTenant(config: Config, appName: string, virtualKey?: string): Promise<void> {
  await revokeGatewayKey(config, appName, virtualKey).catch(() => undefined);
  suspendFlyApp(config, appName);
}
