/**
 * Server-side install readiness — delegates to scripts/lib/installChecks.ts with
 * packaged vs dev-repo context (ARCO_DATA_DIR, ARCO_PACKAGED).
 */
import path from "node:path";
import { collectInstallStatus, type InstallStatus } from "../../scripts/lib/installChecks.js";

export async function getInstallStatus(): Promise<InstallStatus> {
  const packaged = process.env.ARCO_PACKAGED === "1";
  const dataDir = process.env.ARCO_DATA_DIR ? path.resolve(process.env.ARCO_DATA_DIR) : undefined;

  return collectInstallStatus({
    packaged,
    repoRoot: process.cwd(),
    dataDir,
  });
}
