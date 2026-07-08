import type { HTMLAttributes, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { I18nKey } from "../../i18n/declaration";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  titleKey?: I18nKey;
  children?: ReactNode;
}

/** Centered empty / loading / placeholder surface. */
export function EmptyState({ title, titleKey, className = "", children, ...rest }: EmptyStateProps) {
  const { t } = useTranslation();
  const resolvedTitle = titleKey ? t(titleKey) : title;
  const classes = ["arco-empty", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {resolvedTitle ? <strong className="arco-empty__title">{resolvedTitle}</strong> : null}
      {children}
    </div>
  );
}
