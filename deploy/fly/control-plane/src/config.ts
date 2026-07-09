export interface Config {
  port: number;
  publicUrl: string;
  dataDir: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceId: string;
  litellmMasterKey: string;
  gatewayUrl: string;
  tenantImage: string;
  tenantPrefix: string;
  tenantOrg: string;
  tenantRegion: string;
  tenantBudgetUsd: number;
  tenantModel: string;
  tenantQuotaMb: number;
  tenantVolumeGb: number;
  flyBin: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 4700),
    publicUrl: required("PUBLIC_URL").replace(/\/+$/, ""),
    dataDir: process.env.DATA_DIR?.trim() || "/data",
    stripeSecretKey: required("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: required("STRIPE_WEBHOOK_SECRET"),
    stripePriceId: required("STRIPE_PRICE_ID"),
    litellmMasterKey: required("LITELLM_MASTER_KEY"),
    gatewayUrl: (process.env.GATEWAY_URL ?? "https://arco-gateway.fly.dev").replace(/\/+$/, ""),
    tenantImage: process.env.TENANT_IMAGE?.trim() || "registry.fly.io/arco-template:demo",
    tenantPrefix: process.env.TENANT_PREFIX?.trim() || "arco",
    tenantOrg: process.env.TENANT_ORG?.trim() || "personal",
    tenantRegion: process.env.TENANT_REGION?.trim() || "iad",
    tenantBudgetUsd: Number(process.env.TENANT_BUDGET_USD ?? 5),
    tenantModel: process.env.TENANT_MODEL?.trim() || "qwen3-30b",
    tenantQuotaMb: Number(process.env.TENANT_QUOTA_MB ?? 512),
    tenantVolumeGb: Number(process.env.TENANT_VOLUME_GB ?? 1),
    flyBin: process.env.FLY_BIN?.trim() || "/usr/local/bin/flyctl",
  };
}
