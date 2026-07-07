import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Input, type InputWidth } from "./Input";

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  width?: InputWidth;
}

/** Password field with a show/hide toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { width = "full", className = "", ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="arco-password-input">
      <Input
        ref={ref}
        width={width}
        className={className}
        type={visible ? "text" : "password"}
        {...rest}
      />
      <button
        type="button"
        className="arco-password-input__toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  );
});
