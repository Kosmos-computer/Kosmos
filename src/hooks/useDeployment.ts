import { useCallback, useEffect, useState } from "react";
import type { KosmosDeployment } from "@shared/types";
import { api } from "../lib/api";

const DEFAULT_DEPLOYMENT: KosmosDeployment = {
  deployment: "desktop-local",
  billingManaged: false,
  tenantApp: null,
  tenantUrl: null,
  controlPlaneUrl: null,
  paymentLinkUrl: "https://buy.stripe.com/3cIcN71uN44T3gy5Uzak000",
  portalLoginUrl: "https://billing.stripe.com/p/login/3cIcN71uN44T3gy5Uzak000",
  billingConfigured: false,
};

export function useDeployment() {
  const [deployment, setDeployment] = useState<KosmosDeployment>(DEFAULT_DEPLOYMENT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const features = await api.workspaceFeatures();
      setDeployment(features.kosmos ?? DEFAULT_DEPLOYMENT);
    } catch {
      setDeployment(DEFAULT_DEPLOYMENT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { deployment, loading, refresh };
}
