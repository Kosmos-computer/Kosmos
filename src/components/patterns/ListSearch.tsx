import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { Search, X } from "lucide-react";
import type { KeyboardEventHandler, Ref } from "react";
import { Input } from "../ui";

export interface ListSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Compact variant for menu panels and tight modals. */
  compact?: boolean;
  autoFocus?: boolean;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  inputRef?: Ref<HTMLInputElement>;
}

/** Shared search field for lists, menus, and modals. */
export function ListSearch({
  value,
  onChange,
  placeholder = "Search…",
  ariaLabel = "Search list",
  className = "",
  compact = false,
  autoFocus = false,
  onKeyDown,
  inputRef,
}: ListSearchProps) {
  return (
    <div
      className={[
        "arco-list-search",
        compact ? "arco-list-search--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Search size={compact ? 13 : 14} aria-hidden="true" className="arco-list-search__icon" />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="arco-list-search__input"
        autoFocus={autoFocus}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          event.stopPropagation();
        }}
      />
      {value ? (
        <button
          type="button"
          className="arco-btn arco-btn--icon arco-list-search__clear"
          aria-label={i18n.t(I18nKey.APPS$MAPS_CLEAR_SEARCH)}
          onClick={() => onChange("")}
        >
          <X size={compact ? 12 : 14} />
        </button>
      ) : null}
    </div>
  );
}
