/**
 * ConnectServiceModal — pick a provider and save a connected account.
 * Shared by Groups, Social, and Settings → Connected accounts.
 */
import { useEffect, useMemo, useState } from "react";
import { Plug, X } from "lucide-react";
import type { ConnectionDomain, ServiceConnection, ServiceProviderId } from "@shared/serviceConnections";
import { presetById, presetsForDomain } from "@shared/serviceConnections";
import { Button, Chip, Input } from "../ui";
import type { ConnectServiceInput } from "../../connections/useConnectionStore";

export interface ConnectServiceModalProps {
  open: boolean;
  onClose: () => void;
  domain: ConnectionDomain;
  /** Existing connections the user can re-select instead of adding new. */
  existingConnections?: ServiceConnection[];
  /** Pre-select a provider chip when opening from a network rail. */
  initialProvider?: ServiceProviderId;
  onConnect: (input: ConnectServiceInput) => void;
  onSelectExisting?: (connection: ServiceConnection) => void;
}

export function ConnectServiceModal({
  open,
  onClose,
  domain,
  existingConnections = [],
  initialProvider,
  onConnect,
  onSelectExisting,
}: ConnectServiceModalProps) {
  const presets = useMemo(() => presetsForDomain(domain), [domain]);
  const [providerId, setProviderId] = useState<ServiceProviderId>(presets[0]?.id ?? "mattermost");
  const [instanceUrl, setInstanceUrl] = useState("");
  const [accountHint, setAccountHint] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = initialProvider ?? presets[0]?.id ?? "mattermost";
    setProviderId(next);
    setInstanceUrl("");
    setAccountHint("");
    setToken("");
  }, [open, initialProvider, presets]);

  if (!open) return null;

  const preset = presetById(providerId);
  const domainConnections = existingConnections.filter((c) => c.domain === domain);
  const canSave =
    (!preset.requiresInstance || instanceUrl.trim().length > 0) &&
    (!preset.requiresToken || token.trim().length > 0);

  function handleSave() {
    onConnect({
      domain,
      provider: providerId,
      instanceUrl: instanceUrl.trim() || undefined,
      accountHint: accountHint.trim() || undefined,
      token: token.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="arco-connect-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-connect-modal"
        role="dialog"
        aria-labelledby="connect-service-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-connect-modal__header">
          <div className="arco-connect-modal__title-row">
            <Plug size={18} aria-hidden />
            <h2 id="connect-service-title">Connect an account</h2>
          </div>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="arco-connect-modal__body">
          {domainConnections.length > 0 ? (
            <section className="arco-connect-modal__section">
              <h3 className="arco-connect-modal__label">Saved connections</h3>
              <ul className="arco-connect-modal__saved-list">
                {domainConnections.map((connection) => (
                  <li key={connection.id}>
                    <button
                      type="button"
                      className="arco-connect-modal__saved-item"
                      onClick={() => {
                        onSelectExisting?.(connection);
                        onClose();
                      }}
                    >
                      <span className="arco-connect-modal__saved-name">{connection.label}</span>
                      <span className="arco-connect-modal__saved-meta">{presetById(connection.provider).label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="arco-connect-modal__section">
            <h3 className="arco-connect-modal__label">Provider</h3>
            <div className="arco-connect-modal__chips" role="listbox" aria-label="Service providers">
              {presets.map((option) => (
                <Chip
                  key={option.id}
                  role="option"
                  aria-selected={option.id === providerId}
                  className={option.id === providerId ? "arco-connect-modal__chip--selected" : ""}
                  onClick={() => setProviderId(option.id)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
            <p className="arco-connect-modal__hint">{preset.hint}</p>
          </section>

          {preset.requiresInstance ? (
            <section className="arco-connect-modal__section">
              <label className="arco-connect-modal__label" htmlFor="connect-instance-url">
                Server / instance URL
              </label>
              <Input
                id="connect-instance-url"
                value={instanceUrl}
                onChange={(event) => setInstanceUrl(event.target.value)}
                placeholder="https://chat.example.com"
                spellCheck={false}
              />
            </section>
          ) : null}

          <section className="arco-connect-modal__section">
            <label className="arco-connect-modal__label" htmlFor="connect-account-hint">
              Account label (optional)
            </label>
            <Input
              id="connect-account-hint"
              value={accountHint}
              onChange={(event) => setAccountHint(event.target.value)}
              placeholder="@you or work@company.com"
              spellCheck={false}
            />
          </section>

          {preset.requiresToken ? (
            <section className="arco-connect-modal__section">
              <label className="arco-connect-modal__label" htmlFor="connect-token">
                Access token
              </label>
              <Input
                id="connect-token"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste token — OAuth replaces this later"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="arco-connect-modal__hint">
                Stored locally for this prototype. Production wiring uses the server vault and OAuth redirect.
              </p>
            </section>
          ) : null}
        </div>

        <footer className="arco-connect-modal__footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave}>
            Connect
          </Button>
        </footer>
      </div>
    </div>
  );
}
