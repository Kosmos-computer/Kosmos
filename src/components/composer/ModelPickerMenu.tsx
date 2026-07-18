/**
 * ModelPickerMenu — split panel for the composer model chip:
 * left nav of providers (Arco / Cursor / ACP…), right searchable model list.
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
import type { ModelPickerNavAction, ModelPickerProvider } from "./modelPickerTypes";

const PROVIDER_TAB_KEY = "arco.modelPicker.providerId";

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

  const visibleModels = useMemo(() => {
    const models = browseProvider?.models ?? [];
    return filterMenuItems(models, searchQuery);
  }, [browseProvider, searchQuery]);

  const close = useCallback(() => {
    setOpen(false);
    setSearchQuery("");
  }, []);

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
    const gap = 4;
    const x =
      align === "end" ? triggerRect.right - panelRect.width : triggerRect.left;
    const y =
      side === "top"
        ? triggerRect.top - panelRect.height - gap
        : triggerRect.bottom + gap;
    setFixedStyle(clampFixed(x, y, panelRect.width, panelRect.height));
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
        <div className="arco-model-picker__body">
          <div className="arco-model-picker__navcol">
            <div
              className="arco-model-picker__nav arco-scroll"
              role="tablist"
              aria-label="Model providers"
            >
              {providers.map((provider) => {
                const selected = provider.id === browseProvider?.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`arco-model-picker__navitem${selected ? " arco-model-picker__navitem--active" : ""}${provider.id === activeProviderId ? " arco-model-picker__navitem--current" : ""}`}
                    onClick={() => selectProvider(provider.id)}
                  >
                    <span className="arco-model-picker__navlabel">{provider.label}</span>
                  </button>
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
                      <span className="arco-menu__itemdesc">{model.description}</span>
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
