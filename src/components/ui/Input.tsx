import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export type InputWidth = "full" | "auto" | "narrow" | "compact";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  width?: InputWidth;
  /** Icon or label rendered inside the field on the left. */
  startSlot?: ReactNode;
  /** Trailing control rendered inside the field on the right. */
  endSlot?: ReactNode;
}

const WIDTH_CLASS: Record<InputWidth, string> = {
  full: "",
  auto: "arco-input--auto",
  narrow: "arco-input--narrow",
  compact: "arco-input--compact",
};

/** Text field — wraps the global `.arco-input` styles. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { width = "full", className = "", startSlot, endSlot, ...rest },
  ref,
) {
  const classes = ["arco-input", WIDTH_CLASS[width], className].filter(Boolean).join(" ");
  const input = <input ref={ref} className={classes} {...rest} />;

  if (!startSlot && !endSlot) return input;

  return (
    <span
      className={[
        "arco-input-affix",
        startSlot ? "arco-input-affix--start" : "",
        endSlot ? "arco-input-affix--end" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {startSlot ? <span className="arco-input-affix__start">{startSlot}</span> : null}
      {input}
      {endSlot ? <span className="arco-input-affix__end">{endSlot}</span> : null}
    </span>
  );
});
