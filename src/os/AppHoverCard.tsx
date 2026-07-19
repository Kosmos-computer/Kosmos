/**
 * App menu popover for Dock / NavRail items — same chrome as Menu dropdowns
 * (`.arco-menu__panel` / `.arco-menu__item`), with window controls for the
 * specific app. Dock opens on hover (or right-click); NavRail opens on
 * left-click (or right-click).
 */
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { useDismiss } from "../components/useDismiss";
import type { AppHoverCardActionHandlers, AppHoverWindowState } from "./appHoverCardData";

export type AppHoverCardPlacement = "top" | "right";
export type AppHoverCardOpenOn = "hover" | "click";

export interface AppHoverCardProps extends AppHoverCardActionHandlers {
  appId: string;
  label: string;
  /** Kept for callers; icon is shown on the tray/nav trigger, not in the menu. */
  icon: LucideIcon;
  children: ReactElement<Record<string, unknown>>;
  windowState: AppHoverWindowState;
  /** Where the panel sits relative to the trigger. */
  placement?: AppHoverCardPlacement;
  /** Primary open gesture — dock uses hover; nav uses click. */
  openOn?: AppHoverCardOpenOn;
  /** Label for unpin (e.g. "Remove from Dock"). */
  removeLabel?: string;
  /** When true, suppress scheduled hover open (e.g. while dragging). */
  disabled?: boolean;
}

function clampFixed(x: number, y: number, width: number, height: number): CSSProperties {
  const pad = 8;
  const left = Math.min(Math.max(pad, x), Math.max(pad, window.innerWidth - width - pad));
  const top = Math.min(Math.max(pad, y), Math.max(pad, window.innerHeight - height - pad));
  return { position: "fixed", left, top, right: "auto", bottom: "auto" };
}

function triggerAnchoredStyle(
  trigger: DOMRect,
  panel: DOMRect,
  placement: AppHoverCardPlacement,
): CSSProperties {
  if (placement === "right") {
    const x = trigger.right + 8;
    const y = trigger.top + trigger.height / 2 - panel.height / 2;
    return clampFixed(x, y, panel.width, panel.height);
  }

  const gap = 4;
  const x = trigger.left + trigger.width / 2 - panel.width / 2;
  const y = trigger.top - panel.height - gap;
  return clampFixed(x, y, panel.width, panel.height);
}

function MenuRow({
  label,
  danger,
  disabled,
  onClick,
}: {
  label: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={["arco-menu__item", danger && "arco-menu__item--danger"].filter(Boolean).join(" ")}
      onClick={onClick}
    >
      <span className="arco-menu__itemlabel">{label}</span>
    </button>
  );
}

function AppHoverMenuPanel({
  label,
  windowState,
  removeLabel,
  handlers,
}: {
  label: string;
  windowState: AppHoverWindowState;
  removeLabel?: string;
  handlers: AppHoverCardActionHandlers;
}) {
  const { isOpen, isVisible, isActive, isMaximized } = windowState;
  const run = (action?: () => void) => () => action?.();

  return (
    <>
      {!isOpen && <MenuRow label={`Open ${label}`} onClick={run(handlers.onOpen)} />}

      {isOpen && !isVisible && (
        <MenuRow label={`Show ${label}`} onClick={run(handlers.onShow)} />
      )}

      {isVisible && !isActive && (
        <MenuRow label={`Show ${label}`} onClick={run(handlers.onShow)} />
      )}

      {isVisible && <MenuRow label="Minimize" onClick={run(handlers.onMinimize)} />}

      {isVisible && (
        <MenuRow
          label={isMaximized ? "Restore" : "Maximize"}
          onClick={run(handlers.onMaximize)}
        />
      )}

      {isOpen && handlers.onNewWindow && (
        <MenuRow label="New Window" onClick={run(handlers.onNewWindow)} />
      )}

      {isOpen && (
        <MenuRow label={`Close ${label}`} danger onClick={run(handlers.onClose)} />
      )}

      {removeLabel && handlers.onRemove ? (
        <>
          <div className="arco-menu__separator" role="separator" />
          <MenuRow label={removeLabel} danger onClick={run(handlers.onRemove)} />
        </>
      ) : null}
    </>
  );
}

/** Shell app hovercard — window controls for one app, Menu dropdown styling. */
export function AppHoverCard({
  label,
  children,
  windowState,
  placement = "top",
  openOn = "hover",
  removeLabel,
  disabled = false,
  onOpen,
  onShow,
  onMinimize,
  onMaximize,
  onClose,
  onNewWindow,
  onRemove,
}: AppHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuId = useId();

  const handlers: AppHoverCardActionHandlers = {
    onOpen,
    onShow,
    onMinimize,
    onMaximize,
    onClose,
    onNewWindow,
    onRemove,
  };

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useDismiss(open, dismiss, wrapperRef, popoverRef);

  function clearOpenTimer() {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }
  }

  function clearHideTimer() {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
  }

  function showMenu() {
    if (disabled) return;
    clearOpenTimer();
    clearHideTimer();
    setOpen(true);
  }

  function scheduleShowMenu() {
    if (disabled || openOn !== "hover") return;
    clearOpenTimer();
    openTimerRef.current = setTimeout(showMenu, 420);
  }

  function scheduleHideMenu() {
    if (openOn === "click") return;
    clearHideTimer();
    hideTimerRef.current = setTimeout(dismiss, 140);
  }

  function cancelHideMenu() {
    clearHideTimer();
  }

  useEffect(
    () => () => {
      clearOpenTimer();
      clearHideTimer();
    },
    [],
  );

  useEffect(() => {
    if (disabled && open) dismiss();
  }, [disabled, open, dismiss]);

  useLayoutEffect(() => {
    if (!open || !popoverRef.current) {
      setStyle(null);
      return;
    }

    function updatePosition() {
      const triggerRect = wrapperRef.current?.getBoundingClientRect();
      const panelRect = popoverRef.current?.getBoundingClientRect();
      if (!triggerRect || !panelRect) {
        setStyle(null);
        return;
      }
      setStyle(triggerAnchoredStyle(triggerRect, panelRect, placement));
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, placement, windowState, removeLabel]);

  const child = isValidElement(children)
    ? cloneElement(children, {
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
        onMouseEnter: (event: MouseEvent) => {
          (children.props as { onMouseEnter?: (e: MouseEvent) => void }).onMouseEnter?.(event);
          cancelHideMenu();
          scheduleShowMenu();
        },
        onMouseLeave: (event: MouseEvent) => {
          (children.props as { onMouseLeave?: (e: MouseEvent) => void }).onMouseLeave?.(event);
          clearOpenTimer();
          scheduleHideMenu();
        },
        onClick: (event: MouseEvent) => {
          // Always activate/open the app first; click-mode also reveals the menu.
          (children.props as { onClick?: (e: MouseEvent) => void }).onClick?.(event);
          if (openOn === "click") showMenu();
        },
        onContextMenu: (event: MouseEvent) => {
          (children.props as { onContextMenu?: (e: MouseEvent) => void }).onContextMenu?.(event);
          event.preventDefault();
          showMenu();
        },
      })
    : children;

  const wrapAction = (action?: () => void) => () => {
    action?.();
    dismiss();
  };

  const panel = open ? (
    <div
      ref={popoverRef}
      id={menuId}
      role="menu"
      aria-label={`${label} menu`}
      className="arco-menu__panel arco-menu__panel--fixed"
      style={
        style ?? {
          position: "fixed",
          left: 0,
          top: 0,
          right: "auto",
          bottom: "auto",
          visibility: "hidden",
        }
      }
      onMouseEnter={cancelHideMenu}
      onMouseLeave={scheduleHideMenu}
    >
      <AppHoverMenuPanel
        label={label}
        windowState={windowState}
        removeLabel={removeLabel}
        handlers={{
          onOpen: wrapAction(handlers.onOpen),
          onShow: wrapAction(handlers.onShow),
          onMinimize: wrapAction(handlers.onMinimize),
          onMaximize: wrapAction(handlers.onMaximize),
          onClose: wrapAction(handlers.onClose),
          onRemove: wrapAction(handlers.onRemove),
        }}
      />
    </div>
  ) : null;

  return (
    <span
      className={["arco-app-hovercard__wrap", open && "arco-app-hovercard__wrap--open"]
        .filter(Boolean)
        .join(" ")}
      ref={wrapperRef}
    >
      {child}
      {panel ? createPortal(panel, document.body) : null}
    </span>
  );
}

export type { AppHoverCardActionHandlers, AppHoverWindowState } from "./appHoverCardData";
