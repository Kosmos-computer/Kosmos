import { I18nKey } from "../i18n/declaration";
import { T } from "../i18n/T";
/**
 * Menu — the shell's generic dropdown primitive. Arco previously hand-rolled
 * every dropdown (ProjectPicker); this standardizes the pattern: a trigger
 * element, an anchored panel of descriptor-driven items, outside-click /
 * Escape dismissal, and arrow-key focus movement.
 *
 * Default panels position absolutely inside the trigger's wrapper. Pass
 * `anchorPoint` to pin the panel to viewport coordinates via a body portal
 * (context menus, overflow-clipped toolbars).
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
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { filterMenuItems, shouldShowListSearch } from "../lib/listSearch";
import { useDismiss } from "./useDismiss";
import { ListSearch } from "./patterns/ListSearch";

export interface MenuItem {
  id: string;
  label: ReactNode;
  /** Secondary line under the label (approval posture, etc.). */
  description?: string;
  icon?: LucideIcon;
  /** Extra strings matched when the menu is searchable. */
  keywords?: string[];
  /** Trailing check mark — for single-choice menus (model, list view). */
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  /** Renders a divider above this item. */
  separatorAbove?: boolean;
  onSelect?: () => void;
}

export interface MenuAnchorPoint {
  x: number;
  y: number;
}

export interface MenuProps {
  /** The element that opens the menu; cloned with onClick + ARIA wiring. */
  trigger: ReactElement<Record<string, unknown>>;
  items: MenuItem[];
  /**
   * Items pinned below the scrollable list (e.g. Lock / Sign out). Not filtered
   * by search; stay visible while the main list scrolls.
   */
  footerItems?: MenuItem[];
  /** Optional non-interactive content above footer items (e.g. signed-in user). */
  footerHeader?: ReactNode;
  /** Optional title above the item list (e.g. approval posture menus). */
  heading?: string;
  /** Panel edge alignment relative to the trigger. */
  align?: "start" | "end";
  /** Which side of the trigger the panel opens on. */
  side?: "top" | "bottom" | "right";
  "aria-label"?: string;
  className?: string;
  /** Controlled open state — e.g. to open the menu from a right-click instead of the trigger's click. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Show a search field to filter items. "auto" enables when item count >= searchMinItems. */
  searchable?: boolean | "auto";
  searchPlaceholder?: string;
  searchMinItems?: number;
  /**
   * Viewport coordinates for a fixed, portaled panel (context menus). When set
   * while open, the panel ignores trigger-relative side/align placement.
   */
  anchorPoint?: MenuAnchorPoint | null;
}

function clampAnchor(x: number, y: number, width: number, height: number): CSSProperties {
  const pad = 8;
  const left = Math.min(Math.max(pad, x), Math.max(pad, window.innerWidth - width - pad));
  const top = Math.min(Math.max(pad, y), Math.max(pad, window.innerHeight - height - pad));
  return { position: "fixed", left, top, right: "auto", bottom: "auto" };
}

export function Menu({
  trigger,
  items,
  footerItems,
  footerHeader,
  heading,
  align = "start",
  side = "bottom",
  "aria-label": ariaLabel,
  className,
  open: openProp,
  onOpenChange,
  searchable = "auto",
  searchPlaceholder = "Search…",
  searchMinItems = 4,
  anchorPoint = null,
}: MenuProps) {
  const [openState, setOpenState] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fixedStyle, setFixedStyle] = useState<CSSProperties | null>(null);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const floating = Boolean(open && anchorPoint);

  const showSearch =
    searchable === true || (searchable === "auto" && shouldShowListSearch(items.length, searchMinItems));

  const visibleItems = useMemo(
    () => (showSearch ? filterMenuItems(items, searchQuery) : items),
    [items, searchQuery, showSearch],
  );

  const close = useCallback(() => {
    setOpen(false);
    setSearchQuery("");
  }, [setOpen]);

  useDismiss(open, close, rootRef, panelRef);

  useLayoutEffect(() => {
    if (!open || !anchorPoint || !panelRef.current) {
      setFixedStyle(null);
      return;
    }
    const rect = panelRef.current.getBoundingClientRect();
    setFixedStyle(clampAnchor(anchorPoint.x, anchorPoint.y, rect.width, rect.height));
  }, [anchorPoint, open, visibleItems.length]);

  // Focus search (when present) or first enabled item on open.
  useEffect(() => {
    if (!open) return;
    if (showSearch) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [open, showSearch]);

  // Roving focus: ArrowUp/Down cycle through enabled items.
  const onPanelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>(".arco-menu__item:not(:disabled)") ?? [],
    );
    if (buttons.length === 0) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = e.key === "ArrowDown" ? 1 : -1;
    buttons[(index + delta + buttons.length) % buttons.length]?.focus();
  }, []);

  if (!isValidElement(trigger)) return null;

  const triggerEl = cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      (trigger.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
      setOpen(!open);
    },
    "aria-haspopup": "menu",
    "aria-expanded": open,
  });

  const rich = Boolean(heading || items.some((item) => item.description));
  const hasFooter = Boolean(footerHeader || (footerItems && footerItems.length > 0));

  const panel =
    open ? (
      <div
        ref={panelRef}
        role="menu"
        aria-label={ariaLabel}
        className={[
          "arco-menu__panel",
          floating ? "arco-menu__panel--fixed" : `arco-menu__panel--${side}`,
          floating ? "" : `arco-menu__panel--${align}`,
          showSearch && "arco-menu__panel--searchable",
          rich && "arco-menu__panel--rich",
          hasFooter && "arco-menu__panel--footer",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          floating
            ? (fixedStyle ?? {
                position: "fixed",
                left: anchorPoint!.x,
                top: anchorPoint!.y,
                right: "auto",
                bottom: "auto",
                visibility: fixedStyle ? "visible" : "hidden",
              })
            : undefined
        }
        onKeyDown={onPanelKeyDown}
      >
        {heading ? <div className="arco-menu__heading">{heading}</div> : null}
        {showSearch ? (
          <div className="arco-menu__search">
            <ListSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={searchPlaceholder}
              ariaLabel={`Search ${ariaLabel ?? "menu"}`}
              compact
              autoFocus
            />
          </div>
        ) : null}
        <div className="arco-menu__items arco-scroll">
          {visibleItems.length === 0 ? (
            <div className="arco-menu__empty">
              <T k={I18nKey.COMPONENTS$MENU_NO_MATCHES} />
            </div>
          ) : (
            visibleItems.map((item) => <MenuRow key={item.id} item={item} onClose={close} />)
          )}
        </div>
        {hasFooter ? (
          <div className="arco-menu__footer">
            {footerHeader ? <div className="arco-menu__footer-header">{footerHeader}</div> : null}
            {footerItems?.map((item) => (
              <MenuRow key={item.id} item={item} onClose={close} />
            ))}
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className={`arco-menu ${className ?? ""}`} ref={rootRef}>
      {triggerEl}
      {floating && panel ? createPortal(panel, document.body) : panel}
    </div>
  );
}

/** One menu row: optional divider, icon, label, and trailing check. */
function MenuRow({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const IconCmp = item.icon;
  return (
    <>
      {item.separatorAbove && <div className="arco-menu__separator" role="separator" />}
      <button
        type="button"
        role="menuitem"
        disabled={item.disabled}
        className={`arco-menu__item ${item.description ? "arco-menu__item--described" : ""} ${item.danger ? "arco-menu__item--danger" : ""}`}
        onClick={() => {
          item.onSelect?.();
          onClose();
        }}
      >
        {IconCmp && (
          <span className="arco-menu__icon" aria-hidden="true">
            <IconCmp size={14} />
          </span>
        )}
        <span className="arco-menu__itemlabel">
          <span className="arco-menu__itemtitle">{item.label}</span>
          {item.description ? (
            <span className="arco-menu__itemdesc">{item.description}</span>
          ) : null}
        </span>
        {item.checked && (
          <span className="arco-menu__check" aria-hidden="true">
            <Check size={13} />
          </span>
        )}
      </button>
    </>
  );
}
