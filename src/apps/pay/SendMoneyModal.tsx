import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { formatMoney, parseAmountToCents } from "@shared/payments";
import type { PaymentCounterparty, PaymentProviderId } from "@shared/payments";
import { Avatar, Button, Input } from "../../components/ui";
import type { PayRecipient } from "./payMock";

export interface SendMoneyModalProps {
  open: boolean;
  onClose: () => void;
  provider: PaymentProviderId;
  recipients: PayRecipient[];
  busy?: boolean;
  onSend: (input: {
    amountCents: number;
    counterparty: PaymentCounterparty;
    note?: string;
  }) => Promise<void>;
}

export function SendMoneyModal({ open, onClose, provider, recipients, busy, onSend }: SendMoneyModalProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PayRecipient | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setNote("");
    setQuery("");
    setSelected(recipients.find((r) => r.recent) ?? null);
  }, [open, recipients]);

  if (!open) return null;

  const filtered = recipients.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.handle.toLowerCase().includes(query.toLowerCase()),
  );
  const amountCents = parseAmountToCents(amount);
  const canSend = amountCents !== null && selected !== null;

  async function handleSend() {
    if (!canSend || !selected || amountCents === null) return;
    await onSend({
      amountCents,
      counterparty: { name: selected.name, handle: selected.handle },
      note: note.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="arco-connect-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-connect-modal arco-pay-action-modal"
        role="dialog"
        aria-labelledby="send-money-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-connect-modal__header">
          <div className="arco-connect-modal__title-row">
            <h2 id="send-money-title"><T k={I18nKey.APPS$PAY_SEND_MONEY} /></h2>
          </div>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label={i18n.t(I18nKey.COMMON$CLOSE)}>
            <X size={16} />
          </button>
        </header>

        <div className="arco-connect-modal__body">
          <div className="arco-pay-action-modal__amount">
            <span className="arco-pay-action-modal__currency">$</span>
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={i18n.t(I18nKey.APPS$PAY_0_00)}
              aria-label={i18n.t(I18nKey.APPS$PAY_AMOUNT)}
              inputMode="decimal"
            />
          </div>
          {amountCents !== null ? (
            <p className="arco-pay-action-modal__preview"><T k={I18nKey.APPS$PAY_YOU_WILL_SEND} />{formatMoney({ cents: amountCents, currency: "usd" })}<T k={I18nKey.APPS$PAY_VIA} />{provider}
            </p>
          ) : null}

          <section className="arco-connect-modal__section">
            <label className="arco-connect-modal__label" htmlFor="send-note"><T k={I18nKey.APPS$PAY_WHAT_APOS_S_IT_FOR} /></label>
            <Input
              id="send-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={i18n.t(I18nKey.APPS$PAY_DINNER_RENT_THANKS)}
            />
          </section>

          <section className="arco-connect-modal__section">
            <label className="arco-connect-modal__label"><T k={I18nKey.APPS$PAY_TO} /></label>
            <div className="arco-pay-action-modal__search">
              <Search size={14} className="arco-icon--tertiary" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={i18n.t(I18nKey.APPS$PAY_SEARCH_NAME_HANDLE_EMAIL)}
                aria-label={i18n.t(I18nKey.APPS$PAY_SEARCH_RECIPIENTS)}
                width="auto"
              />
            </div>
            <ul className="arco-pay-recipient-list">
              {filtered.map((recipient) => (
                <li key={recipient.id}>
                  <button
                    type="button"
                    className={`arco-pay-recipient${selected?.id === recipient.id ? " arco-pay-recipient--selected" : ""}`}
                    onClick={() => setSelected(recipient)}
                  >
                    <Avatar name={recipient.name} size="sm" />
                    <div>
                      <strong>{recipient.name}</strong>
                      <span>{recipient.handle}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="arco-connect-modal__footer">
          <Button variant="ghost" onClick={onClose}><T k={I18nKey.COMMON$CANCEL} /></Button>
          <Button variant="primary" onClick={handleSend} disabled={!canSend || busy}>
            {busy ? "Sending…" : "Send"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
