import { useEffect, useMemo, useState } from "react";
import { Plug, X } from "lucide-react";
import type { PaymentProviderId } from "@shared/payments";
import { PAYMENT_PROVIDER_META } from "@shared/payments";
import { PAYMENT_PROVIDER_LIST } from "./paymentAdapters";
import { Button, Chip, Input } from "../../components/ui";

export interface ConnectPaymentModalProps {
  open: boolean;
  onClose: () => void;
  initialProvider?: PaymentProviderId;
  onConnect: (input: {
    provider: PaymentProviderId;
    accountHint?: string;
    metadata?: Record<string, string>;
  }) => Promise<void>;
}

export function ConnectPaymentModal({ open, onClose, initialProvider, onConnect }: ConnectPaymentModalProps) {
  const [providerId, setProviderId] = useState<PaymentProviderId>("venmo");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const preset = PAYMENT_PROVIDER_META[providerId];

  useEffect(() => {
    if (!open) return;
    setProviderId(initialProvider ?? "venmo");
    setFieldValues({});
  }, [open, initialProvider]);

  const canSave = useMemo(() => {
    return preset.connectFields.every((field) => !field.required || (fieldValues[field.key]?.trim().length ?? 0) > 0);
  }, [preset.connectFields, fieldValues]);

  if (!open) return null;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const accountHint =
        fieldValues.username ??
        fieldValues.email ??
        fieldValues.phone ??
        fieldValues.walletAddress ??
        undefined;
      await onConnect({
        provider: providerId,
        accountHint: accountHint?.trim(),
        metadata: { ...fieldValues },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="arco-connect-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-connect-modal arco-pay-connect"
        role="dialog"
        aria-labelledby="connect-payment-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-connect-modal__header">
          <div className="arco-connect-modal__title-row">
            <Plug size={18} aria-hidden />
            <h2 id="connect-payment-title">Connect payment method</h2>
          </div>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="arco-connect-modal__body">
          <section className="arco-connect-modal__section">
            <h3 className="arco-connect-modal__label">Provider</h3>
            <div className="arco-connect-modal__chips" role="listbox" aria-label="Payment providers">
              {PAYMENT_PROVIDER_LIST.map((option) => (
                <Chip
                  key={option.id}
                  role="option"
                  aria-selected={option.id === providerId}
                  className={option.id === providerId ? "arco-connect-modal__chip--selected" : ""}
                  onClick={() => {
                    setProviderId(option.id);
                    setFieldValues({});
                  }}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
            <p className="arco-connect-modal__hint">{preset.hint}</p>
            <p className="arco-pay-connect__mode">
              Connect mode: <strong>{preset.connectMode.replace("_", " ")}</strong>
            </p>
          </section>

          {preset.connectFields.map((field) => (
            <section key={field.key} className="arco-connect-modal__section">
              <label className="arco-connect-modal__label" htmlFor={`pay-field-${field.key}`}>
                {field.label}
              </label>
              <Input
                id={`pay-field-${field.key}`}
                type={field.type === "password" ? "password" : "text"}
                value={fieldValues[field.key] ?? ""}
                onChange={(event) => setFieldValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                placeholder={field.placeholder}
                autoComplete="off"
                spellCheck={false}
              />
            </section>
          ))}

          <p className="arco-connect-modal__hint">
            Stub only — production wiring uses OAuth redirects, Stripe Connect, Plaid Link, and a server-side vault.
          </p>
        </div>

        <footer className="arco-connect-modal__footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Connecting…" : "Connect"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
