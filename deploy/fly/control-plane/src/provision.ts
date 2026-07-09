import { execFileSync } from "node:child_process";
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

export async function provisionTenant(config: Config, tenantName: string): Promise<ProvisionResult> {
  const app = `${config.tenantPrefix}-${tenantName}`;
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "arco-provision-"));
  const tomlPath = path.join(workDir, `${app}.toml`);

  const keyRes = await gatewayPost(config, "/key/generate", {
    key_alias: app,
    max_budget: config.tenantBudgetUsd,
    metadata: { tenant: tenantName, provisionedBy: "arco-control-plane" },
  });
  if (!keyRes.ok) {
    throw new Error(`/key/generate failed: ${keyRes.status} ${await keyRes.text()}`);
  }
  const virtualKey = ((await keyRes.json()) as { key?: string }).key;
  if (!virtualKey) throw new Error("gateway response had no key field");

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
    `ARCO_WORKSPACE_QUOTA_MB=${config.tenantQuotaMb}`,
  ]);

  const toml = TENANT_TEMPLATE.replaceAll("__APP__", app).replaceAll("__REGION__", config.tenantRegion);
  fs.writeFileSync(tomlPath, toml, "utf-8");
  fly(config, ["deploy", "--config", tomlPath, "--image", config.tenantImage, "--ha=false"]);

  return { app, url: `https://${app}.fly.dev`, virtualKey };
}

export async function suspendTenant(config: Config, appName: string, virtualKey?: string): Promise<void> {
  if (virtualKey) {
    await gatewayPost(config, "/key/delete", { keys: [virtualKey] }).catch(() => undefined);
  }
  fly(config, ["apps", "suspend", appName], true);
}
