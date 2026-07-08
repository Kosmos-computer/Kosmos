import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { formatMoney, parseAmountToCents } from "@shared/payments";
import type { PaymentCounterparty, PaymentProviderId } from "@shared/payments";
import { Avatar, Button, Input } from "../../components/ui";
import type { PayRecipient } from "./payMock";

export interface RequestMoneyModalProps {
  open: boolean;
  onClose: () => void;
  provider: PaymentProviderId;
  recipients: PayRecipient[];
  busy?: boolean;
  onRequest: (input: {
    amountCents: number;
    counterparty: PaymentCounterparty;
    note?: string;
  }) => Promise<void>;
}

export function RequestMoneyModal({
  open,
  onClose,
  provider,
  recipients,
  busy,
  onRequest,
}: RequestMoneyModalProps) {
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
  const canRequest = amountCents !== null && selected !== null;

  async function handleRequest() {
    if (!canRequest || !selected || amountCents === null) return;
    await onRequest({
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
        aria-labelledby="request-money-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-connect-modal__header">
          <div className="arco-connect-modal__title-row">
            <h2 id="request-money-title"><T k={I18nKey.APPS$PAY_REQUEST_MONEY} /></h2>
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

          <section className="arco-connect-modal__section">
            <label className="arco-connect-modal__label"><T k={I18nKey.APPS$PAY_FROM_2} /></label>
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
            <ul className="arco-pay-recipient-list arco-pay-recipient-list--compact">
              {filtered.length === 0 ? (
                <li className="arco-pay-recipient-list__empty"><T k={I18nKey.APPS$PAY_NO_RECIPIENTS_MATCH_YOUR_SEARCH} /></li>
              ) : null}
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

          <section className="arco-connect-modal__section">
            <label className="arco-connect-modal__label" htmlFor="request-note"><T k={I18nKey.APPS$PAY_REASON} /></label>
            <Input
              id="request-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={i18n.t(I18nKey.APPS$PAY_CONCERT_TICKETS_SHARED_BILL)}
            />
          </section>

          {amountCents !== null && selected ? (
            <p className="arco-pay-action-modal__preview"><T k={I18nKey.APPS$PAY_REQUEST} />{formatMoney({ cents: amountCents, currency: "usd" })}<T k={I18nKey.APPS$PAY_FROM} />{selected.name}<T k={I18nKey.APPS$PAY_VIA} />{provider}
            </p>
          ) : null}
        </div>

        <footer className="arco-connect-modal__footer">
          <Button variant="ghost" onClick={onClose}><T k={I18nKey.COMMON$CANCEL} /></Button>
          <Button variant="primary" onClick={handleRequest} disabled={!canRequest || busy}>
            {busy ? "Requesting…" : "Request"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
