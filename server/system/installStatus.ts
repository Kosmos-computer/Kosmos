/**
 * Server-side install readiness — delegates to scripts/lib/installChecks.ts with
 * packaged vs dev-repo context (ARCO_DATA_DIR, ARCO_PACKAGED).
 */
import path from "node:path";
import type { InstallStatus } from "../../shared/types.js";
import { collectInstallStatus } from "../../scripts/lib/installChecks.js";
import { getKosmosDeployment } from "./kosmosDeployment.js";
import { isHostedRuntime } from "./workspaceFeatures.js";

/** True when this process is a Kosmos Cloud tenant (gateway LLM already set). */
export function isHostedCloudInstall(): boolean {
  const kosmos = getKosmosDeployment(isHostedRuntime());
  if (kosmos.deployment === "fly-tenant" || kosmos.billingManaged) return true;
  const baseUrl = process.env.LLM_BASE_URL ?? "";
  if (/kosmos-gateway/i.test(baseUrl)) return true;
  if (/^kosmos-/i.test(process.env.FLY_APP_NAME ?? "")) return true;
  return false;
}

export async function getInstallStatus(): Promise<InstallStatus> {
  const packaged = process.env.ARCO_PACKAGED === "1";
  const dataDir = process.env.ARCO_DATA_DIR ? path.resolve(process.env.ARCO_DATA_DIR) : undefined;

  const base = await collectInstallStatus({
    packaged,
    repoRoot: process.cwd(),
    dataDir,
  });

  return {
    ...base,
    hostedCloud: isHostedCloudInstall(),
  };
}
