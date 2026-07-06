import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

/** Toggle chip — wraps `.arco-chip` for filter and mode pickers. */
export function Chip({ active, className = "", children, ...rest }: ChipProps) {
  const classes = ["arco-chip", active ? "arco-chip--active" : "", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} aria-pressed={active} {...rest}>
      {children}
    </button>
  );
}
