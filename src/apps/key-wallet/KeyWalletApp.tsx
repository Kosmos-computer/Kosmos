import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Key Wallet — one place for every secret the OS uses: LLM keys, MCP env vars,
 * channel tokens, model registry refs, and ACP credentials. Values stay masked
 * until a real secrets vault API lands; this stub mirrors where keys live today.
 */
import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Plus, Trash2, X } from "lucide-react";
import {
  ModuleCardGrid,
  ModuleFilterSelect,
  ModuleHeader,
  ModuleInner,
  ModulePage,
  ModuleSection,
  ModuleToolbar,
} from "../../components/patterns/ModuleDashboard";
import { Button, EmptyState, Input } from "../../components/ui";
import { filterKeys, keyScopeLabel } from "./keyWalletFilters";
import type { KeyEntry, KeyScopeFilter } from "./types";
import { useKeyWalletStub } from "./useKeyWalletStub";

const SCOPE_FILTERS: { id: KeyScopeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "llm", label: "LLM" },
  { id: "mcp", label: "MCP" },
  { id: "channel", label: "Channels" },
  { id: "external", label: "External" },
  { id: "model", label: "Models" },
  { id: "acp", label: "ACP" },
];

function KeyCard({ entry, onOpen }: { entry: KeyEntry; onOpen: () => void }) {
  return (
    <button type="button" className="arco-module-card" onClick={onOpen}>
      <div className="arco-module-card__head">
        <span className="arco-module-card__icon" aria-hidden="true">
          <KeyRound size={16} />
        </span>
        <div className="arco-module-card__body">
          <h3 className="arco-module-card__title">{entry.name}</h3>
          <div className="arco-module-card__meta">
            <code>{entry.envName}</code> · {entry.usedBy}
          </div>
        </div>
      </div>
      {entry.description ? (
        <p className="arco-module-card__desc">{entry.description}</p>
      ) : null}
    </button>
  );
}

function KeyDetailOverlay({
  entry,
  onClose,
  onRemove,
}: {
  entry: KeyEntry;
  onClose: () => void;
  onRemove: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="arco-module-overlay" role="presentation" onClick={onClose}>
      <div
        className="arco-module-overlay__panel"
        role="dialog"
        aria-label={entry.name}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="arco-module-overlay__head">
          <div className="arco-module__headcopy">
            <h2 className="arco-module__title">{entry.name}</h2>
            <p className="arco-module__subtitle">
              <code>{entry.envName}</code> · {entry.usedBy}
            </p>
          </div>
          <div className="arco-module-card__actions">
            <Button size="icon" onClick={onClose} aria-label={i18n.t(I18nKey.COMMON$CLOSE)}>
              <X size={14} />
            </Button>
          </div>
        </div>

        <p className="arco-module-card__desc">{entry.description ?? "Saved credential for this integration."}</p>

        <div className="arco-module-card__pills">
          <span className="arco-module-card__pill">{keyScopeLabel(entry.scope)}</span>
          <span className="arco-module-card__pill"><T k={I18nKey.APPS$KEY_WALLET_UPDATED} />{new Date(entry.updatedAt).toLocaleString()}
          </span>
        </div>

        <label className="arco-label" htmlFor="key-value"><T k={I18nKey.APPS$KEY_WALLET_VALUE} /></label>
        <div className="arco-module-card__actions arco-module-card__actions--footer">
          <Input
            id="key-value"
            width="auto"
            readOnly
            value={revealed ? `${entry.maskedValue} (stub — wire vault to reveal)` : entry.maskedValue}
            aria-label={`Masked value for ${entry.name}`}
          />
          <Button
            size="icon"
            aria-label={revealed ? "Hide value" : "Reveal value"}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
        </div>

        <p className="arco-module__subtitle"><T k={I18nKey.APPS$KEY_WALLET_SECRET_NAMES_MUST_MATCH_THE_ENV_VAR_SUBPROCESSES_EXPECT_} />{" "}
          <code>ANTHROPIC_API_KEY</code><T k={I18nKey.APPS$KEY_WALLET_FOR_CLAUDE_CODE_ACP} /></p>

        <Button variant="danger" onClick={onRemove}>
          <Trash2 size={13} /><T k={I18nKey.APPS$KEY_WALLET_REMOVE_KEY} /></Button>
      </div>
    </div>
  );
}

function AddKeyPanel({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="arco-form">
      <p className="arco-module__subtitle"><T k={I18nKey.APPS$KEY_WALLET_SAVING_KEYS_FROM_THE_WALLET_WILL_LAND_ONCE_THE_SECRETS_V} /></p>
      <Button onClick={onCancel}><T k={I18nKey.COMMON$CLOSE} /></Button>
    </div>
  );
}

export function KeyWalletApp() {
  const { keys, selected, select, remove } = useKeyWalletStub();
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<KeyScopeFilter>("all");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(
    () => filterKeys(keys, search, scopeFilter),
    [keys, search, scopeFilter],
  );

  const grouped = useMemo(() => {
    const scopes = scopeFilter === "all" ? (["llm", "mcp", "channel", "external", "model", "acp"] as const) : [scopeFilter];
    return scopes
      .map((scope) => ({
        scope,
        items: filtered.filter((entry) => entry.scope === scope),
      }))
      .filter((group) => group.items.length > 0);
  }, [filtered, scopeFilter]);

  return (
    <ModulePage>
      <ModuleInner>
        <ModuleHeader
          title={i18n.t(I18nKey.OS$APP_KEY_WALLET)}
          subtitle={i18n.t(I18nKey.APPS$KEY_WALLET_EVERY_CREDENTIAL_ARCO_USES_LLM_VENDORS_MCP_SERVERS_CHANN)}
          actions={
            <Button onClick={() => setShowAdd((value) => !value)}>
              <Plus size={13} /><T k={I18nKey.APPS$KEY_WALLET_ADD_KEY} /></Button>
          }
        />

        {showAdd ? <AddKeyPanel onCancel={() => setShowAdd(false)} /> : null}

        {keys.length === 0 ? (
          <EmptyState title={i18n.t(I18nKey.APPS$KEY_WALLET_NO_KEYS_SAVED)}><T k={I18nKey.APPS$KEY_WALLET_ADD_API_KEYS_IN_SETTINGS_OR_INSTALL_AN_INTEGRATION_THAT_} /></EmptyState>
        ) : (
          <>
            <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel={i18n.t(I18nKey.APPS$KEY_WALLET_SEARCH_KEYS)}>
              <ModuleFilterSelect
                label={i18n.t(I18nKey.APPS$KEY_WALLET_KEY_SCOPE_FILTER)}
                value={scopeFilter}
                options={SCOPE_FILTERS.map((entry) => ({
                  value: entry.id,
                  label: entry.label,
                }))}
                onChange={setScopeFilter}
              />
            </ModuleToolbar>

            {filtered.length === 0 ? (
              <EmptyState title={i18n.t(I18nKey.APPS$KEY_WALLET_NO_MATCHING_KEYS)}><T k={I18nKey.APPS$KEY_WALLET_TRY_A_DIFFERENT_SEARCH_TERM_OR_FILTER} /></EmptyState>
            ) : scopeFilter === "all" ? (
              grouped.map((group) => (
                <ModuleSection key={group.scope} title={keyScopeLabel(group.scope)} count={group.items.length}>
                  <ModuleCardGrid>
                    {group.items.map((entry) => (
                      <KeyCard key={entry.id} entry={entry} onOpen={() => select(entry.id)} />
                    ))}
                  </ModuleCardGrid>
                </ModuleSection>
              ))
            ) : (
              <ModuleCardGrid>
                {filtered.map((entry) => (
                  <KeyCard key={entry.id} entry={entry} onOpen={() => select(entry.id)} />
                ))}
              </ModuleCardGrid>
            )}
          </>
        )}
      </ModuleInner>

      {selected ? (
        <KeyDetailOverlay
          entry={selected}
          onClose={() => select(null)}
          onRemove={() => {
            remove(selected.id);
            select(null);
          }}
        />
      ) : null}
    </ModulePage>
  );
}
