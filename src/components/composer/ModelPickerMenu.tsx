/**
 * ModelPickerMenu — split panel for the composer model chip:
 * left nav of providers (Arco / Cursor / ACP…), right searchable model list.
 *
 * Unconfigured providers pass `setup` and get a configure screen in the right
 * pane (API key paste + Settings link) instead of an empty model list.
 */
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { filterMenuItems } from "../../lib/listSearch";
import { useDismiss } from "../useDismiss";
import { ListSearch } from "../patterns/ListSearch";
import { Button, Input, PasswordInput } from "../ui";
import type { ModelPickerNavAction, ModelPickerProvider } from "./modelPickerTypes";

const PROVIDER_TAB_KEY = "arco.modelPicker.providerId";

/** Render "Fast · ••oo" with lit/dim cost dots when the meta line matches. */
function renderModelDescription(description: string) {
  const match = /^(Fast|Med|High) · ([•o]{4})$/.exec(description);
  if (!match) return description;
  const [, speed, dots] = match;
  return (
    <>
      {speed} ·{" "}
      <span className="arco-menu__costdots" aria-label={`Cost ${(dots!.match(/•/g) ?? []).length} of 4`}>
        {[...dots!].map((ch, i) => (
          <span
            key={i}
            className={ch === "•" ? "arco-menu__costdot--on" : "arco-menu__costdot--off"}
          >
            {ch === "•" ? "•" : "o"}
          </span>
        ))}
      </span>
    </>
  );
}

export interface ModelPickerMenuProps {
  trigger: ReactElement<Record<string, unknown>>;
  providers: ModelPickerProvider[];
  /** Provider id that owns the currently active model (chip selection). */
  activeProviderId: string;
  onProviderChange?: (providerId: string) => void;
  /** Actions pinned under the provider list (Manage models / agents). */
  navActions?: ModelPickerNavAction[];
  "aria-label"?: string;
  side?: "top" | "bottom";
  align?: "start" | "end";
  portal?: boolean;
}

function clampFixed(x: number, y: number, width: number, height: number): CSSProperties {
  const pad = 8;
  const left = Math.min(Math.max(pad, x), Math.max(pad, window.innerWidth - width - pad));
  const top = Math.min(Math.max(pad, y), Math.max(pad, window.innerHeight - height - pad));
  return { position: "fixed", left, top, right: "auto", bottom: "auto" };
}

function readStoredProviderId(): string | null {
  try {
    return localStorage.getItem(PROVIDER_TAB_KEY);
  } catch {
    return null;
  }
}

function storeProviderId(id: string): void {
  try {
    localStorage.setItem(PROVIDER_TAB_KEY, id);
  } catch {
    /* ignore */
  }
}

export function ModelPickerMenu({
  trigger,
  providers,
  activeProviderId,
  onProviderChange,
  navActions,
  "aria-label": ariaLabel = "Choose model",
  side = "top",
  align = "start",
  portal = true,
}: ModelPickerMenuProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [fixedStyle, setFixedStyle] = useState<CSSProperties | null>(null);
  const [browseProviderId, setBrowseProviderId] = useState(() => {
    const stored = readStoredProviderId();
    if (stored && providers.some((p) => p.id === stored)) return stored;
    return activeProviderId || providers[0]?.id || "";
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep browse tab valid when providers change; prefer active provider on open.
  useEffect(() => {
    if (!open) return;
    setBrowseProviderId((current) => {
      if (providers.some((p) => p.id === current)) return current;
      if (providers.some((p) => p.id === activeProviderId)) return activeProviderId;
      return providers[0]?.id ?? "";
    });
  }, [open, providers, activeProviderId]);

  const browseProvider =
    providers.find((p) => p.id === browseProviderId) ?? providers[0] ?? null;
  const setup = browseProvider?.setup ?? null;

  const visibleModels = useMemo(() => {
    if (setup) return [];
    const models = browseProvider?.models ?? [];
    return filterMenuItems(models, searchQuery);
  }, [browseProvider, searchQuery, setup]);

  // Clear half-typed credentials when switching provider so drafts don't leak.
  useEffect(() => {
    setUrlDraft("");
    setKeyDraft("");
    setSavingKey(false);
  }, [browseProviderId]);

  const close = useCallback(() => {
    setOpen(false);
    setSearchQuery("");
    setUrlDraft("");
    setKeyDraft("");
    setSavingKey(false);
  }, []);

  const canSubmitSetup = Boolean(
    setup &&
      (setup.onSaveConnection || setup.onSaveKey) &&
      (setup.urlLabel ? urlDraft.trim() : keyDraft.trim()),
  );

  useDismiss(open, close, rootRef, panelRef);

  useLayoutEffect(() => {
    if (!open || !portal || !panelRef.current) {
      setFixedStyle(null);
      return;
    }
    const panelRect = panelRef.current.getBoundingClientRect();
    const triggerRect = rootRef.current?.getBoundingClientRect();
    if (!triggerRect) {
      setFixedStyle(null);
      return;
    }
    const pad = 8;
    const gap = 4;
    const x =
      align === "end" ? triggerRect.right - panelRect.width : triggerRect.left;
    // Bottom-anchor when opening upward so content growth doesn't steal clicks.
    if (side === "top") {
      const left = Math.min(
        Math.max(pad, x),
        Math.max(pad, window.innerWidth - panelRect.width - pad),
      );
      setFixedStyle({
        position: "fixed",
        left,
        right: "auto",
        top: "auto",
        bottom: window.innerHeight - triggerRect.top + gap,
        maxHeight: Math.max(160, triggerRect.top - pad - gap),
      });
      return;
    }
    setFixedStyle(clampFixed(x, triggerRect.bottom + gap, panelRect.width, panelRect.height));
  }, [align, open, portal, side, browseProviderId, visibleModels.length, searchQuery]);

  const selectProvider = useCallback(
    (id: string) => {
      setBrowseProviderId(id);
      storeProviderId(id);
      setSearchQuery("");
      onProviderChange?.(id);
    },
    [onProviderChange],
  );

  const onPanelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const index = providers.findIndex((p) => p.id === browseProviderId);
        if (index < 0) return;
        const delta = e.key === "ArrowRight" ? 1 : -1;
        const next = providers[(index + delta + providers.length) % providers.length];
        if (next) selectProvider(next.id);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const buttons = Array.from(
        panelRef.current?.querySelectorAll<HTMLButtonElement>(
          ".arco-model-picker__models .arco-menu__item:not(:disabled)",
        ) ?? [],
      );
      if (buttons.length === 0) return;
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const delta = e.key === "ArrowDown" ? 1 : -1;
      buttons[(current + delta + buttons.length) % buttons.length]?.focus();
    },
    [browseProviderId, providers, selectProvider],
  );

  if (!isValidElement(trigger)) return null;

  const triggerEl = cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      (trigger.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
      setOpen(!open);
    },
    "aria-haspopup": "menu",
    "aria-expanded": open,
  });

  const panel =
    open && providers.length > 0 ? (
      <div
        ref={panelRef}
        role="dialog"
        aria-label={ariaLabel}
        className={[
          "arco-menu__panel",
          "arco-model-picker",
          portal ? "arco-menu__panel--fixed" : `arco-menu__panel--${side}`,
          portal ? "" : `arco-menu__panel--${align}`,
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          portal
            ? (fixedStyle ?? {
                position: "fixed",
                left: 0,
                top: 0,
                visibility: "hidden",
              })
            : undefined
        }
        onKeyDown={onPanelKeyDown}
      >
        {!setup ? (
          <div className="arco-model-picker__search">
            <ListSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search models…"
              ariaLabel={`Search ${ariaLabel}`}
              compact
              autoFocus
            />
          </div>
        ) : null}
        <div className="arco-model-picker__body">
          <div className="arco-model-picker__navcol">
            <div
              className="arco-model-picker__nav arco-scroll"
              role="tablist"
              aria-label="Model providers"
            >
              {providers.map((provider, index) => {
                const selected = provider.id === browseProvider?.id;
                const prevGroup = index > 0 ? providers[index - 1]?.group : undefined;
                const showDivider =
                  provider.group === "who" && prevGroup != null && prevGroup !== "who";
                return (
                  <div key={provider.id}>
                    {showDivider ? (
                      <div className="arco-model-picker__navdivider" role="separator" />
                    ) : null}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={`arco-model-picker__navitem${selected ? " arco-model-picker__navitem--active" : ""}${provider.id === activeProviderId ? " arco-model-picker__navitem--current" : ""}`}
                      onClick={() => selectProvider(provider.id)}
                    >
                      <span className="arco-model-picker__navlabel">{provider.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            {navActions && navActions.length > 0 ? (
              <div className="arco-model-picker__navactions">
                {navActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="arco-model-picker__navaction"
                    onClick={() => {
                      action.onSelect();
                      close();
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {setup ? (
            <div className="arco-model-picker__setup arco-scroll" role="region" aria-label={setup.title}>
              <strong className="arco-model-picker__setuptitle">{setup.title}</strong>
              <p className="arco-model-picker__setupdesc">{setup.description}</p>
              {setup.onSaveConnection || setup.onSaveKey ? (
                <form
                  className="arco-model-picker__setupform"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!canSubmitSetup || savingKey) return;
                    const apiKey = keyDraft.trim();
                    const baseUrl = urlDraft.trim() || undefined;
                    setSavingKey(true);
                    const save = setup.onSaveConnection
                      ? setup.onSaveConnection({ apiKey, baseUrl })
                      : setup.onSaveKey?.(apiKey);
                    void Promise.resolve(save)
                      .then(() => {
                        setUrlDraft("");
                        setKeyDraft("");
                      })
                      .finally(() => setSavingKey(false));
                  }}
                >
                  {setup.urlLabel ? (
                    <>
                      <label className="arco-label" htmlFor={`model-picker-url-${browseProvider?.id}`}>
                        {setup.urlLabel}
                      </label>
                      <Input
                        id={`model-picker-url-${browseProvider?.id}`}
                        width="full"
                        autoComplete="off"
                        placeholder={setup.urlPlaceholder ?? "https://…"}
                        value={urlDraft}
                        onChange={(e) => setUrlDraft(e.target.value)}
                        autoFocus
                      />
                    </>
                  ) : null}
                  <label className="arco-label" htmlFor={`model-picker-key-${browseProvider?.id}`}>
                    {setup.keyLabel ?? "API key"}
                  </label>
                  <PasswordInput
                    id={`model-picker-key-${browseProvider?.id}`}
                    width="full"
                    autoComplete="off"
                    placeholder={setup.keyPlaceholder ?? "Paste API key"}
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    autoFocus={!setup.urlLabel}
                  />
                  <Button type="submit" variant="primary" disabled={!canSubmitSetup || savingKey}>
                    {savingKey ? "Saving…" : "Save & connect"}
                  </Button>
                </form>
              ) : null}
              <div className="arco-model-picker__setupactions">
                <Button
                  variant={setup.onSaveConnection || setup.onSaveKey ? "default" : "primary"}
                  onClick={() => {
                    setup.onPrimary();
                    close();
                  }}
                >
                  {setup.primaryLabel}
                </Button>
                {setup.secondaryLabel && setup.onSecondary ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setup.onSecondary?.();
                    }}
                  >
                    {setup.secondaryLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="arco-model-picker__models arco-scroll" role="menu">
              {visibleModels.length === 0 ? (
                <div className="arco-menu__empty">
                  {searchQuery.trim()
                    ? "No matches"
                    : (browseProvider?.emptyMessage ?? "No models")}
                </div>
              ) : (
                visibleModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    role="menuitem"
                    disabled={model.disabled || browseProvider?.inactive}
                    className={`arco-menu__item${model.description ? " arco-menu__item--described" : ""}`}
                    onClick={() => {
                      model.onSelect();
                      close();
                    }}
                  >
                    <span className="arco-menu__itemlabel">
                      <span className="arco-menu__itemtitle">{model.label}</span>
                      {model.description ? (
                        <span className="arco-menu__itemdesc">
                          {renderModelDescription(model.description)}
                        </span>
                      ) : null}
                    </span>
                    {model.checked && (
                      <span className="arco-menu__check" aria-hidden="true">
                        <Check size={13} />
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className="arco-menu arco-model-picker-root" ref={rootRef}>
      {triggerEl}
      {portal && panel ? createPortal(panel, document.body) : panel}
    </div>
  );
}
