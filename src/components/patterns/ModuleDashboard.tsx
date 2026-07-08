import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
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
      {children}
    </div>
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
