/**
 * macOS-style app menu popover for Dock / NavRail items — port of Longformer
 * TrayAppHoverCard. Dock opens on hover (or right-click); NavRail opens on
 * left-click (or right-click). Portal-positioned so HoverDock / overflow
 * clipping don't clip the panel.
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
import { Check, ChevronRight, type LucideIcon } from "lucide-react";
import { useDismiss } from "../components/useDismiss";
import {
  APP_HOVER_OPTIONS_ITEMS,
  defaultProfilesForApp,
  type AppHoverCardActionHandlers,
  type AppHoverProfile,
} from "./appHoverCardData";

export type AppHoverCardPlacement = "top" | "right";
export type AppHoverCardOpenOn = "hover" | "click";

export interface AppHoverCardProps extends AppHoverCardActionHandlers {
  /** Stable app id (windowKey) — used for stub profile lists. */
  appId: string;
  label: string;
  icon: LucideIcon;
  children: ReactElement<Record<string, unknown>>;
  running?: boolean;
  active?: boolean;
  openWindowCount?: number;
  profiles?: AppHoverProfile[];
  defaultProfileId?: string;
  /** Where the panel sits relative to the trigger. */
  placement?: AppHoverCardPlacement;
  /** Primary open gesture — dock uses hover; nav uses click. */
  openOn?: AppHoverCardOpenOn;
  /** Label for the remove action in Options (e.g. "Remove from Dock"). */
  removeLabel?: string;
  /** When true, suppress scheduled hover open (e.g. while dragging). */
  disabled?: boolean;
}

function getMenuStyle(
  trigger: HTMLElement | null,
  placement: AppHoverCardPlacement,
): CSSProperties | undefined {
  const rect = trigger?.getBoundingClientRect();
  if (!rect) return undefined;

  if (placement === "right") {
    return {
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    };
  }

  return {
    top: rect.top - 8,
    left: rect.left + rect.width / 2,
  };
}

function MenuSeparator() {
  return <div className="arco-app-hovercard__separator" role="separator" />;
}

function MenuRow({
  label,
  checked,
  chevron,
  danger,
  onClick,
  onMouseEnter,
}: {
  label: ReactNode;
  checked?: boolean;
  chevron?: boolean;
  danger?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={["arco-app-hovercard__row", danger && "arco-app-hovercard__row--danger"]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <span className="arco-app-hovercard__check" aria-hidden="true">
        {checked ? <Check size={12} strokeWidth={2.4} /> : null}
      </span>
      <span className="arco-app-hovercard__row-label">{label}</span>
      {chevron ? (
        <ChevronRight size={12} className="arco-app-hovercard__chevron" aria-hidden="true" />
      ) : null}
    </button>
  );
}

function AppHoverMenuPanel({
  label,
  Icon,
  active,
  running,
  profiles,
  activeProfileId,
  openWindowCount,
  optionsOpen,
  removeLabel,
  onOptionsEnter,
  onOptionsLeave,
  onSelectProfile,
  handlers,
}: {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  running: boolean;
  profiles: AppHoverProfile[];
  activeProfileId: string;
  openWindowCount: number;
  optionsOpen: boolean;
  removeLabel?: string;
  onOptionsEnter: () => void;
  onOptionsLeave: () => void;
  onSelectProfile: (profileId: string) => void;
  handlers: AppHoverCardActionHandlers;
}) {
  const showProfiles = profiles.length > 0;
  const showAllLabel =
    openWindowCount > 1 ? `Show All Windows (${openWindowCount})` : "Show All Windows";

  const run = (action?: () => void) => () => action?.();

  return (
    <div className="arco-app-hovercard__menu" role="menu" aria-label={`${label} menu`}>
      <MenuRow
        label={
          <span className="arco-app-hovercard__header">
            <span className="arco-app-hovercard__header-icon" aria-hidden="true">
              <Icon size={14} strokeWidth={1.8} />
            </span>
            {label}
          </span>
        }
        checked={active || running}
        onClick={run(handlers.onShowAllWindows)}
      />

      {showProfiles && (
        <>
          <MenuSeparator />
          <div className="arco-app-hovercard__section">Profiles</div>
          <div className="arco-app-hovercard__profiles">
            {profiles.map((profile) => (
              <MenuRow
                key={profile.id}
                label={profile.label}
                checked={profile.id === activeProfileId}
                onClick={() => {
                  onSelectProfile(profile.id);
                  handlers.onSelectProfile?.(profile.id);
                }}
              />
            ))}
          </div>
        </>
      )}

      <MenuSeparator />

      <MenuRow label="New Window" onClick={run(handlers.onNewWindow)} />
      <MenuRow
        label="New Incognito Window"
        onClick={run(handlers.onNewPrivateWindow ?? handlers.onNewWindow)}
      />

      <div className="arco-app-hovercard__submenu-wrap" onMouseLeave={onOptionsLeave}>
        <MenuRow label="Options" chevron onMouseEnter={onOptionsEnter} />
        {optionsOpen && (
          <div className="arco-app-hovercard__submenu" role="menu" aria-label="Options">
            {APP_HOVER_OPTIONS_ITEMS.map((item) => (
              <MenuRow key={item.id} label={item.label} />
            ))}
            {removeLabel && handlers.onRemove ? (
              <MenuRow label={removeLabel} danger onClick={run(handlers.onRemove)} />
            ) : null}
          </div>
        )}
      </div>

      <MenuSeparator />

      <MenuRow label={showAllLabel} onClick={run(handlers.onShowAllWindows)} />
      <MenuRow label="Hide" onClick={run(handlers.onHide)} />
      <MenuRow label="Quit" danger onClick={run(handlers.onQuit)} />
    </div>
  );
}

/** Shell app hovercard — profiles, window actions, and nested options. */
export function AppHoverCard({
  appId,
  label,
  icon: Icon,
  children,
  running = false,
  active = false,
  openWindowCount = 0,
  profiles: profilesProp,
  defaultProfileId,
  placement = "top",
  openOn = "hover",
  removeLabel,
  disabled = false,
  onNewWindow,
  onNewPrivateWindow,
  onShowAllWindows,
  onHide,
  onQuit,
  onSelectProfile,
  onRemove,
}: AppHoverCardProps) {
  const profiles = profilesProp ?? defaultProfilesForApp(appId);
  const [open, setOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState(
    defaultProfileId ?? profiles[0]?.id ?? "default",
  );
  const [style, setStyle] = useState<CSSProperties>();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuId = useId();

  const handlers: AppHoverCardActionHandlers = {
    onNewWindow,
    onNewPrivateWindow,
    onShowAllWindows,
    onHide,
    onQuit,
    onSelectProfile,
    onRemove,
  };

  const dismiss = useCallback(() => {
    setOpen(false);
    setOptionsOpen(false);
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
    setStyle(getMenuStyle(wrapperRef.current, placement));
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
    if (!open) return;

    function updatePosition() {
      setStyle(getMenuStyle(wrapperRef.current, placement));
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, placement]);

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
          if (openOn === "click") {
            event.preventDefault();
            event.stopPropagation();
            if (open) dismiss();
            else showMenu();
            return;
          }
          (children.props as { onClick?: (e: MouseEvent) => void }).onClick?.(event);
        },
        onContextMenu: (event: MouseEvent) => {
          (children.props as { onContextMenu?: (e: MouseEvent) => void }).onContextMenu?.(event);
          event.preventDefault();
          showMenu();
        },
      })
    : children;

  const panel =
    open && style ? (
      <div
        ref={popoverRef}
        id={menuId}
        className={[
          "arco-app-hovercard",
          `arco-app-hovercard--${placement}`,
          "arco-app-hovercard--visible",
        ].join(" ")}
        style={style}
        role="presentation"
        onMouseEnter={cancelHideMenu}
        onMouseLeave={scheduleHideMenu}
      >
        <AppHoverMenuPanel
          label={label}
          Icon={Icon}
          active={active}
          running={running}
          profiles={profiles}
          activeProfileId={activeProfileId}
          openWindowCount={openWindowCount}
          optionsOpen={optionsOpen}
          removeLabel={removeLabel}
          onOptionsEnter={() => setOptionsOpen(true)}
          onOptionsLeave={() => setOptionsOpen(false)}
          onSelectProfile={setActiveProfileId}
          handlers={{
            ...handlers,
            onNewWindow: () => {
              handlers.onNewWindow?.();
              dismiss();
            },
            onNewPrivateWindow: () => {
              (handlers.onNewPrivateWindow ?? handlers.onNewWindow)?.();
              dismiss();
            },
            onShowAllWindows: () => {
              handlers.onShowAllWindows?.();
              dismiss();
            },
            onHide: () => {
              handlers.onHide?.();
              dismiss();
            },
            onQuit: () => {
              handlers.onQuit?.();
              dismiss();
            },
            onRemove: () => {
              handlers.onRemove?.();
              dismiss();
            },
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

export type { AppHoverProfile, AppHoverCardActionHandlers } from "./appHoverCardData";
