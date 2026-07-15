import i18n from "../i18n/index";
import { Keyboard } from "lucide-react";
import { I18nKey } from "../i18n/declaration";
import { useInputMethodStore } from "./inputMethodStore";

export function MenuBarKeyboardControl() {
  const open = useInputMethodStore((s) => s.open);
  const toggleOpen = useInputMethodStore((s) => s.toggleOpen);

  return (
    <button
      type="button"
      className={`arco-menubar__icon-btn${open ? " arco-menubar__icon-btn--active" : ""}`}
      aria-label={i18n.t(I18nKey.OS$KEYBOARD_TOGGLE)}
      aria-pressed={open}
      title={i18n.t(I18nKey.OS$KEYBOARD_TOGGLE)}
      onClick={toggleOpen}
    >
      <Keyboard size={14} />
    </button>
  );
}
