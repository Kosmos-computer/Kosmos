import type { InputHTMLAttributes } from "react";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

/** Toggle switch — wraps `.arco-switch` (checkbox under the hood). */
export function Switch({ label, className = "", id, ...rest }: SwitchProps) {
  const switchId = id ?? (label ? `switch-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return (
    <label className={["arco-switch", className].filter(Boolean).join(" ")} htmlFor={switchId}>
      <input type="checkbox" id={switchId} {...rest} />
      <span className="arco-switch__track" aria-hidden="true" />
      {label ? <span className="arco-switch__label">{label}</span> : null}
    </label>
  );
}
