import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * ConnectServiceModal — pick a provider and save a connected account.
 * Shared by Groups, Social, and Settings → Connected accounts.
 */
import { useEffect, useMemo, useState } from "react";
import { Plug, X } from "lucide-react";
import type { ConnectionDomain, ServiceConnection, ServiceProviderId } from "@shared/serviceConnections";
import { presetById, presetsForDomain } from "@shared/serviceConnections";
import { ListSearch } from "./ListSearch";
import { matchesListSearch } from "../../lib/listSearch";
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
  const [listSearch, setListSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = initialProvider ?? presets[0]?.id ?? "mattermost";
    setProviderId(next);
    setInstanceUrl("");
    setAccountHint("");
    setToken("");
    setListSearch("");
  }, [open, initialProvider, presets]);

  if (!open) return null;

  const preset = presetById(providerId);
  const domainConnections = existingConnections.filter((c) => c.domain === domain);
  const filteredConnections = domainConnections.filter((connection) =>
    matchesListSearch(listSearch, connection.label, presetById(connection.provider).label, connection.instanceUrl),
  );
  const filteredPresets = presets.filter((option) =>
    matchesListSearch(listSearch, option.label, option.id, option.hint),
  );
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
            <h2 id="connect-service-title"><T k={I18nKey.COMPONENTS$PATTERNS_CONNECT_AN_ACCOUNT} /></h2>
          </div>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label={i18n.t(I18nKey.COMMON$CLOSE)}>
            <X size={16} />
          </button>
        </header>

        <div className="arco-connect-modal__body">
          {(domainConnections.length > 0 || presets.length > 3) ? (
            <div className="arco-connect-modal__search">
              <ListSearch
                value={listSearch}
                onChange={setListSearch}
                placeholder={i18n.t(I18nKey.COMPONENTS$PATTERNS_SEARCH_PROVIDERS_AND_ACCOUNTS)}
                ariaLabel="Search providers and accounts"
                compact
              />
            </div>
          ) : null}

          {domainConnections.length > 0 ? (
            <section className="arco-connect-modal__section">
              <h3 className="arco-connect-modal__label"><T k={I18nKey.COMPONENTS$PATTERNS_SAVED_CONNECTIONS} /></h3>
              <ul className="arco-connect-modal__saved-list">
                {filteredConnections.length === 0 ? (
                  <li className="arco-connect-modal__empty"><T k={I18nKey.COMPONENTS$PATTERNS_NO_SAVED_CONNECTIONS_MATCH_YOUR_SEARCH} /></li>
                ) : null}
                {filteredConnections.map((connection) => (
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
            <h3 className="arco-connect-modal__label"><T k={I18nKey.COMPONENTS$PATTERNS_PROVIDER} /></h3>
            <div className="arco-connect-modal__chips" role="listbox" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_SERVICE_PROVIDERS)}>
              {filteredPresets.length === 0 ? (
                <p className="arco-connect-modal__empty"><T k={I18nKey.COMPONENTS$PATTERNS_NO_PROVIDERS_MATCH_YOUR_SEARCH} /></p>
              ) : null}
              {filteredPresets.map((option) => (
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
              <label className="arco-connect-modal__label" htmlFor="connect-instance-url"><T k={I18nKey.COMPONENTS$PATTERNS_SERVER_INSTANCE_URL} /></label>
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
            <label className="arco-connect-modal__label" htmlFor="connect-account-hint"><T k={I18nKey.COMPONENTS$PATTERNS_ACCOUNT_LABEL_OPTIONAL} /></label>
            <Input
              id="connect-account-hint"
              value={accountHint}
              onChange={(event) => setAccountHint(event.target.value)}
              placeholder={i18n.t(I18nKey.COMPONENTS$PATTERNS_YOU_OR_WORK_COMPANY_COM)}
              spellCheck={false}
            />
          </section>

          {preset.requiresToken ? (
            <section className="arco-connect-modal__section">
              <label className="arco-connect-modal__label" htmlFor="connect-token"><T k={I18nKey.COMPONENTS$PATTERNS_ACCESS_TOKEN} /></label>
              <Input
                id="connect-token"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={i18n.t(I18nKey.COMPONENTS$PATTERNS_PASTE_TOKEN_OAUTH_REPLACES_THIS_LATER)}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="arco-connect-modal__hint"><T k={I18nKey.COMPONENTS$PATTERNS_STORED_LOCALLY_FOR_THIS_PROTOTYPE_PRODUCTION_WIRING_USES} /></p>
            </section>
          ) : null}
        </div>

        <footer className="arco-connect-modal__footer">
          <Button variant="ghost" onClick={onClose}><T k={I18nKey.COMMON$CANCEL} /></Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave}><T k={I18nKey.COMMON$CONNECT} /></Button>
        </footer>
      </div>
    </div>
  );
}
