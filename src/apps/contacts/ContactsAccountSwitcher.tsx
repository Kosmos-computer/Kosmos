import { useState } from "react";
import { ChevronDown, Cloud, HardDrive, Plus, Trash2 } from "lucide-react";
import { Menu } from "../../components/Menu";
import { Button, Input } from "../../components/ui";
import type { ContactAccount, ContactAccountKind } from "./types";
import { CONTACT_ACCOUNT_KIND_LABELS } from "./types";

const SYNC_KINDS: Exclude<ContactAccountKind, "local">[] = ["google", "icloud", "carddav"];

export interface ContactsAccountSwitcherProps {
  accounts: ContactAccount[];
  activeAccountId: string;
  onSelectAccount: (id: string) => void;
  onAddLocalAccount: (label: string) => void;
  onConnectAccount: (input: { kind: Exclude<ContactAccountKind, "local">; label: string; email?: string }) => void;
  onRemoveAccount: (id: string) => void;
}

export function ContactsAccountSwitcher({
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddLocalAccount,
  onConnectAccount,
  onRemoveAccount,
}: ContactsAccountSwitcherProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [localLabel, setLocalLabel] = useState("");
  const [connectKind, setConnectKind] = useState<Exclude<ContactAccountKind, "local">>("google");
  const [connectEmail, setConnectEmail] = useState("");

  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? accounts[0];

  const menuItems = [
    ...accounts.map((account) => ({
      id: account.id,
      label: (
        <span className="arco-contacts__account-menu-label">
          <span
            className="arco-contacts__account-swatch"
            style={{ background: account.accent }}
            aria-hidden
          >
            {account.initials}
          </span>
          <span>
            {account.label}
            <small>{CONTACT_ACCOUNT_KIND_LABELS[account.kind]}</small>
          </span>
        </span>
      ),
      checked: account.id === activeAccountId,
      onSelect: () => onSelectAccount(account.id),
    })),
    {
      id: "add-local",
      label: "Add on-device account",
      icon: HardDrive,
      separatorAbove: true,
      onSelect: () => setAddOpen(true),
    },
    {
      id: "connect",
      label: "Connect synced account…",
      icon: Cloud,
      onSelect: () => setConnectOpen(true),
    },
    ...(accounts.length > 1 && activeAccount
      ? [
          {
            id: "remove",
            label: `Remove “${activeAccount.label}”`,
            icon: Trash2,
            danger: true,
            separatorAbove: true,
            onSelect: () => onRemoveAccount(activeAccount.id),
          },
        ]
      : []),
  ];

  return (
    <>
      <Menu
        aria-label="Contact accounts"
        align="start"
        items={menuItems}
        trigger={
          <button type="button" className="arco-contacts__account-switcher">
            <span className="arco-contacts__account-swatch" style={{ background: activeAccount?.accent }} aria-hidden>
              {activeAccount?.initials}
            </span>
            <span className="arco-contacts__account-switcher-text">
              <strong>{activeAccount?.label ?? "Contacts"}</strong>
              <small>{activeAccount ? CONTACT_ACCOUNT_KIND_LABELS[activeAccount.kind] : ""}</small>
            </span>
            <ChevronDown size={14} className="arco-icon--tertiary" aria-hidden />
          </button>
        }
      />

      {addOpen ? (
        <div className="arco-contact-modal__backdrop" role="presentation" onClick={() => setAddOpen(false)}>
          <div
            className="arco-contact-modal arco-contact-modal--compact"
            role="dialog"
            aria-labelledby="add-account-title"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="arco-contact-modal__header">
              <div className="arco-contact-modal__title-row">
                <Plus size={18} aria-hidden />
                <h2 id="add-account-title">Add on-device account</h2>
              </div>
            </header>
            <div className="arco-contact-modal__body">
              <label className="arco-contact-modal__label" htmlFor="local-account-label">
                Account name
              </label>
              <Input
                id="local-account-label"
                value={localLabel}
                onChange={(event) => setLocalLabel(event.target.value)}
                placeholder="Family, Side project, …"
                autoFocus
              />
            </div>
            <footer className="arco-contact-modal__footer">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!localLabel.trim()}
                onClick={() => {
                  onAddLocalAccount(localLabel.trim());
                  setLocalLabel("");
                  setAddOpen(false);
                }}
              >
                Add account
              </Button>
            </footer>
          </div>
        </div>
      ) : null}

      {connectOpen ? (
        <div className="arco-contact-modal__backdrop" role="presentation" onClick={() => setConnectOpen(false)}>
          <div
            className="arco-contact-modal"
            role="dialog"
            aria-labelledby="connect-account-title"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="arco-contact-modal__header">
              <div className="arco-contact-modal__title-row">
                <Cloud size={18} aria-hidden />
                <h2 id="connect-account-title">Connect account</h2>
              </div>
            </header>
            <div className="arco-contact-modal__body">
              <p className="arco-contact-modal__hint">
                OAuth sync lands later — for now this creates a synced account you can import into.
              </p>
              <section className="arco-contact-modal__section">
                <span className="arco-contact-modal__label">Provider</span>
                <div className="arco-contact-modal__chips" role="listbox" aria-label="Contact providers">
                  {SYNC_KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      role="option"
                      aria-selected={connectKind === kind}
                      className={`arco-chip${connectKind === kind ? " arco-chip--active" : ""}`}
                      onClick={() => setConnectKind(kind)}
                    >
                      {CONTACT_ACCOUNT_KIND_LABELS[kind]}
                    </button>
                  ))}
                </div>
              </section>
              <section className="arco-contact-modal__section">
                <label className="arco-contact-modal__label" htmlFor="connect-account-email">
                  Account email (optional)
                </label>
                <Input
                  id="connect-account-email"
                  type="email"
                  value={connectEmail}
                  onChange={(event) => setConnectEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </section>
            </div>
            <footer className="arco-contact-modal__footer">
              <Button variant="ghost" onClick={() => setConnectOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const label = connectEmail.trim() || CONTACT_ACCOUNT_KIND_LABELS[connectKind];
                  onConnectAccount({ kind: connectKind, label, email: connectEmail.trim() || undefined });
                  setConnectEmail("");
                  setConnectOpen(false);
                }}
              >
                Connect
              </Button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
