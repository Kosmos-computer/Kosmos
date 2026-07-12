/**
 * GET /api/storage — workspace disk quota and live usage for hosted instances.
 */
import { Hono } from "hono";
import type { StorageStatus } from "../../shared/types.js";
import { getKosmosDeployment } from "../system/kosmosDeployment.js";
import { isHostedRuntime } from "../system/workspaceFeatures.js";
import { quotaLimitBytes, workspaceUsageBytes } from "../agent/workspaceQuota.js";

const toMb = (bytes: number) => Math.round(bytes / (1024 * 1024));

async function fetchManagedStorage(hosted: boolean): Promise<Partial<StorageStatus> | null> {
  const kosmos = getKosmosDeployment(hosted);
  if (!kosmos.billingConfigured || !kosmos.controlPlaneUrl) return null;
  const token = process.env.KOSMOS_TENANT_BILLING_TOKEN?.trim();
  if (!token) return null;

  const res = await fetch(`${kosmos.controlPlaneUrl}/api/tenant/storage`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  return (await res.json()) as Partial<StorageStatus>;
}

export const storageRoutes = new Hono();

storageRoutes.get("/", async (c) => {
  const hosted = isHostedRuntime();
  const usedBytes = await workspaceUsageBytes();
  const limitBytes = quotaLimitBytes();
  const usedMb = toMb(usedBytes);
  const totalQuotaMb = toMb(limitBytes);
  const managed = await fetchManagedStorage(hosted);

  const res: StorageStatus = {
    planQuotaMb: managed?.planQuotaMb ?? totalQuotaMb,
    extraQuotaMb: managed?.extraQuotaMb ?? 0,
    totalQuotaMb: managed?.totalQuotaMb ?? totalQuotaMb,
    usedMb,
    remainingMb: Math.max(0, totalQuotaMb - usedMb),
  };
  return c.json(res);
});
