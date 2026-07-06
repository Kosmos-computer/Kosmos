import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface ListItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  leading?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  active?: boolean;
}

/** Icon + label + trailing meta row for sidebars and master lists. */
export const ListItem = forwardRef<HTMLButtonElement, ListItemProps>(function ListItem(
  { leading, label, description, trailing, active = false, className = "", ...rest },
  ref,
) {
  const classes = ["arco-list-item", active ? "arco-list-item--active" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button ref={ref} type="button" className={classes} aria-current={active ? "true" : undefined} {...rest}>
      {leading ? <span className="arco-list-item__leading">{leading}</span> : null}
      <span className="arco-list-item__body">
        <span className="arco-list-item__label">{label}</span>
        {description ? <span className="arco-list-item__desc">{description}</span> : null}
      </span>
      {trailing ? <span className="arco-list-item__trailing">{trailing}</span> : null}
    </button>
  );
});
