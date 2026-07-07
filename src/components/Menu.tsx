/**
 * Menu — the shell's generic dropdown primitive. Arco previously hand-rolled
 * every dropdown (ProjectPicker); this standardizes the pattern: a trigger
 * element, an anchored panel of descriptor-driven items, outside-click /
 * Escape dismissal, and arrow-key focus movement.
 *
 * Panels position absolutely inside the trigger's wrapper (no portal), which
 * is enough inside Arco windows and keeps stacking simple via
 * --arco-z-overlay.
 */
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDismiss } from "./useDismiss";

export interface MenuItem {
  id: string;
  label: ReactNode;
  icon?: LucideIcon;
  /** Trailing check mark — for single-choice menus (model, list view). */
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  /** Renders a divider above this item. */
  separatorAbove?: boolean;
  onSelect?: () => void;
}

export interface MenuProps {
  /** The element that opens the menu; cloned with onClick + ARIA wiring. */
  trigger: ReactElement<Record<string, unknown>>;
  items: MenuItem[];
  /** Panel edge alignment relative to the trigger. */
  align?: "start" | "end";
  /** Which side of the trigger the panel opens on. */
  side?: "top" | "bottom" | "right";
  "aria-label"?: string;
  className?: string;
  /** Controlled open state — e.g. to open the menu from a right-click instead of the trigger's click. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Menu({
  trigger,
  items,
  align = "start",
  side = "bottom",
  "aria-label": ariaLabel,
  className,
  open: openProp,
  onOpenChange,
}: MenuProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(open, close, rootRef);

  // Focus the first enabled item on open so keyboard users land in the menu.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [open]);

  // Roving focus: ArrowUp/Down cycle through enabled items.
  const onPanelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
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

  return (
    <div className={`arco-menu ${className ?? ""}`} ref={rootRef}>
      {triggerEl}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={ariaLabel}
          className={`arco-menu__panel arco-menu__panel--${side} arco-menu__panel--${align}`}
          onKeyDown={onPanelKeyDown}
        >
          {items.map((item) => (
            <MenuRow key={item.id} item={item} onClose={close} />
          ))}
        </div>
      )}
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
        className={`arco-menu__item ${item.danger ? "arco-menu__item--danger" : ""}`}
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
        <span className="arco-menu__itemlabel">{item.label}</span>
        {item.checked && (
          <span className="arco-menu__check" aria-hidden="true">
            <Check size={13} />
          </span>
        )}
      </button>
    </>
  );
}
