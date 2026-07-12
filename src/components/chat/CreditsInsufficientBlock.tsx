/**
 * Inline chat block when inference credits are exhausted — offers buy-credits
 * checkout or navigation to Usage & credits.
 */
import { useCallback, useEffect, useState } from "react";
import type { BillingAddons } from "@shared/types";
import { api } from "../../lib/api";
import { useDeployment } from "../../hooks/useDeployment";
import { navigateSettingsSection, openShellWindow } from "../../os/shellNavigation";
import { Button } from "../ui";
import { ChatErrorBlock } from "./ChatErrorBlock";

export interface CreditsInsufficientBlockProps {
  text: string;
}

export function CreditsInsufficientBlock({ text }: CreditsInsufficientBlockProps) {
  const { deployment } = useDeployment();
  const [addons, setAddons] = useState<BillingAddons | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAddons = useCallback(async () => {
    if (!deployment.billingConfigured) return;
    try {
      setAddons(await api.getBillingAddons());
    } catch {
      // Checkout buttons fall back to Settings link.
    }
  }, [deployment.billingConfigured]);

  useEffect(() => {
    void loadAddons();
  }, [loadAddons]);

  const startCheckout = async (priceId: string) => {
    setCheckoutBusy(priceId);
    setError(null);
    try {
      const { url } = await api.startBillingCheckout(priceId, "credits");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setCheckoutBusy(null);
    }
  };

  const openUsageSettings = () => {
    openShellWindow({ type: "system", app: "settings" }, "Settings", { section: "usage" });
    navigateSettingsSection("usage");
  };

  const packs = addons?.creditPacks ?? [];

  return (
    <div className="arco-chat__error arco-chat__error--credits">
      <ChatErrorBlock text={text} />
      <p className="arco-chat__error-hint">
        Buy more credits to continue, or wait until your plan renews.
      </p>
      {error && <p className="arco-chat__error-hint">{error}</p>}
      <div className="arco-chat__error-actions">
        {packs.map((pack) => (
          <Button
            key={pack.priceId}
            variant="primary"
            onClick={() => void startCheckout(pack.priceId)}
            disabled={checkoutBusy === pack.priceId}
          >
            {checkoutBusy === pack.priceId ? "Opening…" : `Buy ${pack.label}`}
          </Button>
        ))}
        <Button variant="ghost" onClick={openUsageSettings}>
          Usage & credits
        </Button>
      </div>
    </div>
  );
}
