/**
 * Pay — unified payment gateway workspace (Venmo / PayPal-style prototype).
 *
 * Provider rail → activity feed → balance & quick actions.
 * Adapters stub Stripe, Venmo, Zelle, PayPal, and crypto; swap in real SDKs later.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { formatMoney, providerMeta } from "@shared/payments";
import type { PaymentProviderId, PaymentTransaction } from "@shared/payments";
import { Avatar, Button, Chip, EmptyState } from "../../components/ui";
import { ALL_PROVIDERS, relativeTime, transactionSign, transactionVerb } from "./payMock";
import { ConnectPaymentModal } from "./ConnectPaymentModal";
import { RequestMoneyModal } from "./RequestMoneyModal";
import { SendMoneyModal } from "./SendMoneyModal";
import { usePayStub } from "./usePayStub";

function TransactionRow({ tx }: { tx: PaymentTransaction }) {
  const sign = transactionSign(tx.type);
  const isPositive = sign === "+";
  const isPending = tx.status === "pending";

  return (
    <article className="arco-pay__tx">
      <Avatar name={tx.counterparty.name} size="md" />
      <div className="arco-pay__tx-body">
        <div className="arco-pay__tx-main">
          <strong>
            {tx.type === "send" || tx.type === "withdraw"
              ? `You ${transactionVerb(tx.type)} ${tx.counterparty.name}`
              : `${tx.counterparty.name} ${transactionVerb(tx.type)}`}
          </strong>
          {tx.note ? <span className="arco-pay__tx-note">{tx.note}</span> : null}
        </div>
        <div className="arco-pay__tx-meta">
          <time>{relativeTime(tx.timestamp)}</time>
          {isPending ? <span className="arco-pay__tx-status">Pending</span> : null}
        </div>
      </div>
      <div
        className={`arco-pay__tx-amount${isPositive ? " arco-pay__tx-amount--in" : ""}${sign === "-" ? " arco-pay__tx-amount--out" : ""}`}
      >
        {sign}
        {formatMoney(tx.amount)}
      </div>
    </article>
  );
}

export function PayApp() {
  const pay = usePayStub();
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectProvider, setConnectProvider] = useState<PaymentProviderId | undefined>();
  const [sendOpen, setSendOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [feedTab, setFeedTab] = useState<"all" | "pending">("all");

  const activeMeta = providerMeta(pay.activeProviderId);
  const isConnected = pay.connected.has(pay.activeProviderId);

  useEffect(() => {
    if (isConnected) void pay.refreshBalance(pay.activeProviderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on provider connect change only
  }, [isConnected, pay.activeProviderId]);

  const openConnect = useCallback((provider?: PaymentProviderId) => {
    setConnectProvider(provider ?? pay.activeProviderId);
    setConnectOpen(true);
  }, [pay.activeProviderId]);

  const visibleTransactions =
    feedTab === "pending"
      ? pay.transactions.filter((tx) => tx.status === "pending")
      : pay.transactions;

  return (
    <div className="arco-pay">
      <aside className="arco-pay__rail" aria-label="Payment providers">
        {ALL_PROVIDERS.map((id) => {
          const meta = providerMeta(id);
          const connected = pay.connected.has(id);
          return (
            <button
              key={id}
              type="button"
              className={`arco-pay__rail-tile${pay.activeProviderId === id ? " arco-pay__rail-tile--active" : ""}${connected ? "" : " arco-pay__rail-tile--disconnected"}`}
              style={{ ["--pay-accent" as string]: meta.accent }}
              title={connected ? meta.label : `${meta.label} — not connected`}
              onClick={() => pay.setActiveProvider(id)}
            >
              <span>{meta.initials}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="arco-pay__rail-tile arco-pay__rail-tile--add"
          aria-label="Connect another payment method"
          onClick={() => openConnect()}
        >
          <Plus size={16} />
        </button>
      </aside>

      <section className="arco-pay__feed-column">
        <header className="arco-pay__feed-header">
          <h1>{activeMeta.label}</h1>
          <div className="arco-pay__tabs">
            <Chip
              className={feedTab === "all" ? "arco-pay__tab--active" : ""}
              onClick={() => setFeedTab("all")}
            >
              Activity
            </Chip>
            <Chip
              className={feedTab === "pending" ? "arco-pay__tab--active" : ""}
              onClick={() => setFeedTab("pending")}
            >
              Pending
            </Chip>
          </div>
        </header>

        {!isConnected ? (
          <>
            <div className="arco-pay__demo-banner">
              <p>
                Demo activity below. Connect {activeMeta.label} to send, request, and see live balance.
              </p>
              <Button variant="primary" onClick={() => openConnect(pay.activeProviderId)}>
                Connect account
              </Button>
            </div>
            <div className="arco-pay__feed arco-scroll">
              {pay.transactions.length === 0 ? (
                <EmptyState title="No activity for this provider">
                  <p>Switch providers or connect an account.</p>
                </EmptyState>
              ) : (
                pay.transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
              )}
            </div>
          </>
        ) : (
          <div className="arco-pay__feed arco-scroll">
            {visibleTransactions.length === 0 ? (
              <EmptyState title="No activity yet">
                <p>Send or request money to see transactions here.</p>
              </EmptyState>
            ) : (
              visibleTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
            )}
          </div>
        )}
      </section>

      <aside className="arco-pay__sidebar">
        <section className="arco-pay__balance-card">
          <div className="arco-pay__balance-head">
            <Wallet size={18} aria-hidden />
            <span>Available balance</span>
            <button
              type="button"
              className="arco-pay__refresh"
              aria-label="Refresh balance"
              disabled={!isConnected || pay.busy}
              onClick={() => void pay.refreshBalance()}
            >
              <RefreshCw size={14} className={pay.busy ? "arco-pay__spin" : ""} />
            </button>
          </div>
          {isConnected && pay.activeBalance ? (
            <>
              <p className="arco-pay__balance-amount">{formatMoney(pay.activeBalance.available)}</p>
              {pay.activeBalance.pending ? (
                <p className="arco-pay__balance-pending">
                  {formatMoney(pay.activeBalance.pending)} pending
                </p>
              ) : null}
              {pay.activeConnection?.accountHint ? (
                <p className="arco-pay__balance-account">{pay.activeConnection.accountHint}</p>
              ) : null}
            </>
          ) : (
            <p className="arco-pay__balance-empty">Connect a provider to see balance</p>
          )}

          <div className="arco-pay__actions">
            <Button
              variant="primary"
              disabled={!isConnected || pay.busy}
              onClick={() => setSendOpen(true)}
            >
              <ArrowUpRight size={16} /> Send
            </Button>
            <Button disabled={!isConnected || pay.busy} onClick={() => setRequestOpen(true)}>
              <ArrowDownLeft size={16} /> Request
            </Button>
          </div>
        </section>

        <section className="arco-pay__panel">
          <h2>Recent contacts</h2>
          <ul className="arco-pay__contacts">
            {pay.recipients
              .filter((r) => r.recent)
              .map((recipient) => (
                <li key={recipient.id}>
                  <Avatar name={recipient.name} size="sm" />
                  <div>
                    <strong>{recipient.name}</strong>
                    <span>{recipient.handle}</span>
                  </div>
                </li>
              ))}
          </ul>
        </section>

        <section className="arco-pay__panel arco-pay__panel--muted">
          <h2>Gateway architecture</h2>
          <p>
            Each provider implements a shared adapter contract. The gateway routes send, request, and
            balance calls — swap stub adapters for Stripe SDK, PayPal REST, Plaid Link, or wallet connect.
          </p>
        </section>

        {pay.lastError ? <p className="arco-pay__error" role="alert">{pay.lastError}</p> : null}
      </aside>

      <ConnectPaymentModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        initialProvider={connectProvider}
        onConnect={async (input) => {
          await pay.connect(input);
        }}
      />

      <SendMoneyModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        provider={pay.activeProviderId}
        recipients={pay.recipients}
        busy={pay.busy}
        onSend={async (input) => {
          await pay.send({
            provider: pay.activeProviderId,
            amountCents: input.amountCents,
            counterparty: input.counterparty,
            note: input.note,
          });
        }}
      />

      <RequestMoneyModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        provider={pay.activeProviderId}
        recipients={pay.recipients}
        busy={pay.busy}
        onRequest={async (input) => {
          await pay.request({
            provider: pay.activeProviderId,
            amountCents: input.amountCents,
            counterparty: input.counterparty,
            note: input.note,
          });
        }}
      />
    </div>
  );
}
