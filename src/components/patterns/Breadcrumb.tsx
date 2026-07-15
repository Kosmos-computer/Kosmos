import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  actions?: React.ReactNode;
  collaborators?: React.ReactNode;
}

/** Document top bar with breadcrumb trail and optional actions. */
export function Breadcrumb({ items, actions, collaborators }: BreadcrumbProps) {
  return (
    <div className="arco-breadcrumb-bar">
      <nav className="arco-breadcrumb" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_BREADCRUMB)}>
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`} className="arco-breadcrumb__segment">
            {index > 0 ? (
              <ChevronRight size={13} className="arco-breadcrumb__sep" aria-hidden="true" />
            ) : null}
            <span
              className={[
                "arco-breadcrumb__item",
                item.current ? "arco-breadcrumb__item--current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.label}
            </span>
          </span>
        ))}
      </nav>
      {(collaborators || actions) && (
        <div className="arco-breadcrumb-bar__right">
          {collaborators}
          {actions ? <div className="arco-breadcrumb-bar__actions">{actions}</div> : null}
        </div>
      )}
    </div>
  );
}
