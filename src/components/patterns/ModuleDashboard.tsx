import type { ReactNode } from "react";
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
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="arco-module__header">
      <div className="arco-module__headcopy">
        <h1 className="arco-module__title">{title}</h1>
        {subtitle ? <p className="arco-module__subtitle">{subtitle}</p> : null}
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
            aria-label="Clear search"
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
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="arco-module__section">
      <div className="arco-module__sectionhead">
        <h2 className="arco-module__sectiontitle">{title}</h2>
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
