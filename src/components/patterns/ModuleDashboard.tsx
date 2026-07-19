import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search, X } from "lucide-react";
import { Menu, type MenuItem } from "../Menu";
import { Input } from "../ui/Input";

export function ModulePage({ children }: { children: ReactNode }) {
  return (
    <div className="arco-module">
      <div className="arco-module__scroll arco-scroll">{children}</div>
    </div>
  );
}

export function ModuleInner({ children }: { children: ReactNode }) {
  return <div className="arco-module__inner">{children}</div>;
}

export function ModuleHeader({
  title,
  subtitle,
  titleKey,
  subtitleKey,
  actions,
}: {
  title?: string;
  subtitle?: string;
  titleKey?: I18nKey;
  subtitleKey?: I18nKey;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  const resolvedTitle = titleKey ? t(titleKey) : title;
  const resolvedSubtitle = subtitleKey ? t(subtitleKey) : subtitle;

  return (
    <header className="arco-module__header">
      <div className="arco-module__headcopy">
        <h1 className="arco-module__title">{resolvedTitle}</h1>
        {resolvedSubtitle ? <p className="arco-module__subtitle">{resolvedSubtitle}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function ModuleToolbar({
  search,
  onSearchChange,
  searchLabel,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  children?: ReactNode;
}) {
  return (
    <div className="arco-module__toolbar">
      <div className="arco-module__search">
        <Search size={14} aria-hidden="true" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchLabel}
          aria-label={searchLabel}
        />
        {search ? (
          <button
            type="button"
            className="arco-btn arco-btn--icon"
            aria-label={i18n.t(I18nKey.APPS$MAPS_CLEAR_SEARCH)}
            onClick={() => onSearchChange("")}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {children ? <div className="arco-module__filters">{children}</div> : null}
    </div>
  );
}

export type ModuleFilterOption<T extends string = string> = {
  value: T;
  label: string;
};

/** Exclusive toolbar filter as an Arco Menu dropdown (replaces chip rails). */
export function ModuleFilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  searchable = false,
  searchPlaceholder,
  portal = false,
  className = "",
}: {
  label: string;
  value: T;
  options: readonly ModuleFilterOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Pass true/"auto" for long option lists (e.g. model pickers). */
  searchable?: boolean | "auto";
  searchPlaceholder?: string;
  /** Portal the menu when a parent clips overflow (settings detail panes). */
  portal?: boolean;
  className?: string;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;
  const items = useMemo<MenuItem[]>(
    () =>
      options.map((option) => ({
        id: option.value || "__empty__",
        label: option.label,
        checked: option.value === value,
        onSelect: () => onChange(option.value),
      })),
    [onChange, options, value],
  );

  return (
    <Menu
      className={["arco-module__filter", className].filter(Boolean).join(" ")}
      aria-label={label}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder}
      portal={portal}
      items={items}
      trigger={
        <button type="button" className="arco-module__filter-trigger" disabled={disabled}>
          <span className="arco-module__filter-label">{selectedLabel}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      }
    />
  );
}

export function ModuleSection({
  title,
  titleKey,
  count,
  children,
}: {
  title?: string;
  titleKey?: I18nKey;
  count: number;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  if (count === 0) return null;
  const resolvedTitle = titleKey ? t(titleKey) : title;
  return (
    <section className="arco-module__section">
      <div className="arco-module__sectionhead">
        <h2 className="arco-module__sectiontitle">{resolvedTitle}</h2>
        <span className="arco-module__count">{count}</span>
      </div>
      {children}
    </section>
  );
}

export function ModuleCardGrid({ children }: { children: ReactNode }) {
  return <div className="arco-module__grid">{children}</div>;
}

export function ModuleList({ children }: { children: ReactNode }) {
  return <div className="arco-module__list">{children}</div>;
}
