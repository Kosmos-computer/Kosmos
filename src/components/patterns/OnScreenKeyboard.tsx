import { useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { AvailableLanguages, DEFAULT_LOCALE } from "../../i18n";
import { I18nKey } from "../../i18n/declaration";
import {
  displayKeyLabel,
  getKeyboardLayout,
  KEY_BACKSPACE,
  KEY_ENTER,
  KEY_SHIFT,
  KEY_SPACE,
  resolveKeyOutput,
  type KeyboardKey,
} from "../../os/keyboardLayouts";
import { backspaceAtTarget, enterAtTarget, insertAtTarget } from "../../os/keyboardInsert";
import { useInputMethodStore } from "../../os/inputMethodStore";

export interface OnScreenKeyboardProps {
  className?: string;
}

function keyClassName(key: KeyboardKey, shift: boolean): string {
  const classes = ["arco-keyboard__key"];
  if (key.type === "action") {
    classes.push("arco-keyboard__key--action");
    if (key.action === KEY_SHIFT && shift) classes.push("arco-keyboard__key--active");
    if (key.action === KEY_SPACE) classes.push("arco-keyboard__key--space");
    if (key.action === KEY_ENTER) classes.push("arco-keyboard__key--enter");
    if (key.action === KEY_BACKSPACE) classes.push("arco-keyboard__key--backspace");
  }
  const wide = key.type === "char" ? key.wide : key.wide;
  if (wide && wide > 1) classes.push("arco-keyboard__key--wide");
  if (wide && wide >= 4) classes.push("arco-keyboard__key--extra-wide");
  return classes.join(" ");
}

function keyStyle(key: KeyboardKey): CSSProperties | undefined {
  const wide = key.type === "char" ? key.wide : key.wide;
  if (!wide || wide <= 1) return undefined;
  return { flexGrow: wide, flexBasis: 0 };
}

export function OnScreenKeyboard({ className }: OnScreenKeyboardProps) {
  const { i18n } = useTranslation();
  const shift = useInputMethodStore((s) => s.shift);
  const toggleShift = useInputMethodStore((s) => s.toggleShift);
  const setShift = useInputMethodStore((s) => s.setShift);
  const refreshTarget = useInputMethodStore((s) => s.refreshTarget);

  const activeLocale = i18n.language || DEFAULT_LOCALE;
  const layout = useMemo(() => getKeyboardLayout(activeLocale), [activeLocale]);
  const languageLabel =
    AvailableLanguages.find((lang) => lang.value === activeLocale)?.label ??
    AvailableLanguages[0]?.label ??
    "English";

  function handleKeyPress(key: KeyboardKey) {
    refreshTarget();
    const target = useInputMethodStore.getState().lastTarget;

    if (key.type === "action") {
      if (key.action === KEY_SHIFT) {
        toggleShift();
        return;
      }
      if (key.action === KEY_BACKSPACE) {
        backspaceAtTarget(target);
        return;
      }
      if (key.action === KEY_SPACE) {
        insertAtTarget(target, " ");
        setShift(false);
        return;
      }
      if (key.action === KEY_ENTER) {
        enterAtTarget(target);
        setShift(false);
        return;
      }
      return;
    }

    const output = resolveKeyOutput(key, shift);
    if (!output) return;
    insertAtTarget(target, output);
    if (shift && output.length === 1 && /[A-Z]/.test(output)) setShift(false);
  }

  return (
    <section
      className={["arco-keyboard", className].filter(Boolean).join(" ")}
      aria-label={i18n.t(I18nKey.OS$KEYBOARD)}
    >
      <header className="arco-keyboard__header">
        <span className="arco-keyboard__title">{i18n.t(I18nKey.OS$KEYBOARD)}</span>
        <span className="arco-keyboard__layout">{i18n.t(I18nKey.OS$KEYBOARD_LAYOUT, { language: languageLabel })}</span>
      </header>
      <div className="arco-keyboard__rows">
        {layout.rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="arco-keyboard__row">
            {row.map((key, keyIndex) => (
              <button
                key={`${rowIndex}-${keyIndex}-${key.type === "char" ? key.value : key.action}`}
                type="button"
                className={keyClassName(key, shift)}
                style={keyStyle(key)}
                aria-label={displayKeyLabel(key, shift)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => handleKeyPress(key)}
              >
                {displayKeyLabel(key, shift)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
