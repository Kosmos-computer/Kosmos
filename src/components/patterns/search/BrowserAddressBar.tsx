import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
/**
 * BrowserAddressBar — back/forward/reload + omnibox row ported from Longformer
 * BrowserToolbar, shared by BrowserShell and Search surfaces.
 */
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Globe, Lock, RotateCw } from "lucide-react";
import { Button } from "../../ui";

export interface BrowserAddressBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  /** Show back/forward/reload controls (browse mode). */
  showNav?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  /** When false, show an unlocked globe instead of the lock icon. */
  secure?: boolean;
  /** Opens the current URL in the system browser. */
  openUrl?: string;
  onOpenExternal?: () => void;
  toolbarExtra?: ReactNode;
  variant?: "compact" | "home";
  className?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
}

export function BrowserAddressBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search or enter a URL",
  showNav = true,
  onBack,
  onForward,
  onReload,
  canGoBack = false,
  canGoForward = false,
  secure = true,
  openUrl,
  onOpenExternal,
  toolbarExtra,
  variant = "compact",
  className = "",
  ariaLabel = "Address bar",
  autoFocus = false,
}: BrowserAddressBarProps) {
  const isHome = variant === "home";

  return (
    <div
      className={`arco-browser-address arco-browser-address--${variant}${className ? ` ${className}` : ""}`}
    >
      {showNav ? (
        <div className="arco-browser-address__nav">
          <Button
            variant="ghost"
            className="arco-btn--icon"
            disabled={!canGoBack}
            onClick={onBack}
            aria-label={i18n.t(I18nKey.COMMON$BACK)}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            className="arco-btn--icon"
            disabled={!canGoForward}
            onClick={onForward}
            aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_FORWARD)}
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="ghost"
            className="arco-btn--icon"
            onClick={onReload}
            aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_RELOAD)}
          >
            <RotateCw size={14} />
          </Button>
        </div>
      ) : null}

      <div className="arco-browser-address__field">
        {secure ? (
          <Lock size={isHome ? 14 : 13} className="arco-browser-address__secure" aria-hidden />
        ) : (
          <Globe size={isHome ? 14 : 13} className="arco-browser-address__secure" aria-hidden />
        )}
        <input
          className="arco-browser-address__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="arco-browser-address__actions">
        {onOpenExternal || openUrl ? (
          <Button
            variant="ghost"
            className="arco-btn--icon"
            disabled={!openUrl}
            onClick={onOpenExternal ?? (() => openUrl && window.open(openUrl, "_blank", "noopener"))}
            aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_OPEN_IN_NEW_TAB)}
          >
            <ExternalLink size={12} />
          </Button>
        ) : null}
        {toolbarExtra}
      </div>
    </div>
  );
}
