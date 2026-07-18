import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPlatformBridge } from "@arco/platform-bridge";
import { I18nKey } from "../../i18n/declaration";
import { Menu, type MenuItem } from "../Menu";
import {
  AvailableKeyboardLayouts,
  displayKeyLabel,
  getKeyboardLayout,
  KEY_ALT,
  KEY_BACKSPACE,
  KEY_CAPS,
  KEY_CTRL,
  KEY_ENTER,
  KEY_ESC,
  KEY_META,
  KEY_MODE_123,
  KEY_MODE_ABC,
  KEY_MODE_EMOJI,
  KEY_SHIFT,
  KEY_SPACE,
  KEY_TAB,
  keyboardKeyId,
  modifierLabelsForOs,
  resolveKeyOutput,
  type KeyboardDensity,
  type KeyboardKey,
} from "../../os/keyboardLayouts";
import {
  backspaceAtTarget,
  dispatchChordAtTarget,
  enterAtTarget,
  escapeAtTarget,
  insertAtTarget,
  tabAtTarget,
} from "../../os/keyboardInsert";
import {
  directImeIdForLocale,
  imeStyleLabel,
  imeUsesCompositionBar,
  isComposing,
  isPhoneticIme,
  usePhysicalKeyboardBridge,
} from "../../os/ime";
import { useInputMethodStore } from "../../os/inputMethodStore";
import { highlightIdsForEvent, isKeyPhysicallyPressed } from "../../os/physicalKeyHighlight";

export interface OnScreenKeyboardProps {
  className?: string;
}

/** Compact phone-style OSK below this width; full desktop layout above. */
const COMPACT_KEYBOARD_MQ = "(max-width: 720px)";

function useKeyboardDensity(): KeyboardDensity {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_KEYBOARD_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_KEYBOARD_MQ);
    const onChange = (event: MediaQueryListEvent) => setCompact(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return compact ? "compact" : "full";
}

function keyClassName(
  key: KeyboardKey,
  state: {
    shift: boolean;
    caps: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
    mode: string;
    pressed: boolean;
  },
): string {
  const classes = ["arco-keyboard__key"];
  if (key.type === "fn") classes.push("arco-keyboard__key--fn");
  if (state.mode === "emoji" && key.type === "char") classes.push("arco-keyboard__key--emoji");
  if (state.pressed) classes.push("arco-keyboard__key--pressed");
  if (key.type === "action") {
    classes.push("arco-keyboard__key--action");
    if (key.action === KEY_SHIFT && state.shift) classes.push("arco-keyboard__key--active");
    if (key.action === KEY_CAPS && state.caps) classes.push("arco-keyboard__key--active");
    if (key.action === KEY_CTRL && state.ctrl) classes.push("arco-keyboard__key--active");
    if (key.action === KEY_ALT && state.alt) classes.push("arco-keyboard__key--active");
    if (key.action === KEY_META && state.meta) classes.push("arco-keyboard__key--active");
    if (key.action === KEY_SPACE) classes.push("arco-keyboard__key--space");
    if (key.action === KEY_ENTER) classes.push("arco-keyboard__key--enter");
    if (key.action === KEY_BACKSPACE) classes.push("arco-keyboard__key--backspace");
    if (key.action === KEY_TAB || key.action === KEY_CAPS || key.action === KEY_ESC) {
      classes.push("arco-keyboard__key--nav");
    }
    if (key.action === KEY_CTRL || key.action === KEY_ALT || key.action === KEY_META) {
      classes.push("arco-keyboard__key--modifier");
    }
    if (key.action === KEY_MODE_123 || key.action === KEY_MODE_ABC || key.action === KEY_MODE_EMOJI) {
      classes.push("arco-keyboard__key--mode");
    }
  }
  const wide = key.type === "fn" ? undefined : key.wide;
  if (wide && wide > 1) classes.push("arco-keyboard__key--wide");
  if (wide && wide >= 4) classes.push("arco-keyboard__key--extra-wide");
  return classes.join(" ");
}

/** Lights OSK keys while the matching physical keys are held. */
function usePhysicalKeyPresses(): ReadonlySet<string> {
  const [pressedIds, setPressedIds] = useState<ReadonlySet<string>>(() => new Set());
  const byCodeRef = useRef(new Map<string, string[]>());

  useEffect(() => {
    function publish() {
      const next = new Set<string>();
      for (const ids of byCodeRef.current.values()) {
        for (const id of ids) next.add(id);
      }
      setPressedIds(next);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      byCodeRef.current.set(event.code, highlightIdsForEvent(event));
      publish();
    }

    function onKeyUp(event: KeyboardEvent) {
      byCodeRef.current.delete(event.code);

      // Clear left/right variants when the modifier family is fully released.
      const mod =
        event.key === "Shift"
          ? "Shift"
          : event.key === "Control"
            ? "Control"
            : event.key === "Alt"
              ? "Alt"
              : event.key === "Meta" || event.key === "OS"
                ? "Meta"
                : null;
      if (mod && !event.getModifierState(mod)) {
        const prefixes = mod === "Meta" ? ["Meta", "OS"] : [mod];
        for (const [code] of byCodeRef.current) {
          if (prefixes.some((prefix) => code.startsWith(prefix))) {
            byCodeRef.current.delete(code);
          }
        }
      }

      publish();
    }

    function clearAll() {
      if (byCodeRef.current.size === 0) return;
      byCodeRef.current.clear();
      publish();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") clearAll();
    }

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", clearAll);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", clearAll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return pressedIds;
}

function keyStyle(key: KeyboardKey): CSSProperties | undefined {
  if (key.type === "fn") return undefined;
  const wide = key.wide;
  if (!wide || wide <= 1) return undefined;
  return { flexGrow: wide, flexBasis: 0 };
}

export function OnScreenKeyboard({ className }: OnScreenKeyboardProps) {
  const { i18n } = useTranslation();
  const density = useKeyboardDensity();
  const shift = useInputMethodStore((s) => s.shift);
  const caps = useInputMethodStore((s) => s.caps);
  const ctrl = useInputMethodStore((s) => s.ctrl);
  const alt = useInputMethodStore((s) => s.alt);
  const meta = useInputMethodStore((s) => s.meta);
  const showModifiers = useInputMethodStore((s) => s.showModifiers);
  const showFunctionKeys = useInputMethodStore((s) => s.showFunctionKeys);
  const mode = useInputMethodStore((s) => s.mode);
  const layoutLocale = useInputMethodStore((s) => s.layoutLocale);
  const imeId = useInputMethodStore((s) => s.imeId);
  const ime = useInputMethodStore((s) => s.ime);
  const toggleShift = useInputMethodStore((s) => s.toggleShift);
  const toggleCaps = useInputMethodStore((s) => s.toggleCaps);
  const toggleCtrl = useInputMethodStore((s) => s.toggleCtrl);
  const toggleAlt = useInputMethodStore((s) => s.toggleAlt);
  const toggleMeta = useInputMethodStore((s) => s.toggleMeta);
  const clearChordModifiers = useInputMethodStore((s) => s.clearChordModifiers);
  const setShift = useInputMethodStore((s) => s.setShift);
  const setMode = useInputMethodStore((s) => s.setMode);
  const setLayoutLocale = useInputMethodStore((s) => s.setLayoutLocale);
  const toggleImeStyle = useInputMethodStore((s) => s.toggleImeStyle);
  const toggleShowModifiers = useInputMethodStore((s) => s.toggleShowModifiers);
  const toggleShowFunctionKeys = useInputMethodStore((s) => s.toggleShowFunctionKeys);
  const refreshTarget = useInputMethodStore((s) => s.refreshTarget);
  const feedIme = useInputMethodStore((s) => s.feedIme);
  const pressedIds = usePhysicalKeyPresses();
  // Hardware keys → IME composition / remembered editable while OSK is open.
  usePhysicalKeyboardBridge(true);

  const phonetic = isPhoneticIme(imeId);
  const showImeBar = imeUsesCompositionBar(imeId) && mode === "letters";
  const composing = isComposing(ime);
  const directAlt = directImeIdForLocale(layoutLocale);

  const modifierLabels = useMemo(
    () => modifierLabelsForOs(getPlatformBridge().config.os),
    [],
  );

  const layout = useMemo(
    () =>
      getKeyboardLayout(layoutLocale, density, mode, {
        showModifiers,
        modifiers: modifierLabels,
        showFunctionKeys,
        letterStyle: phonetic ? "phonetic" : "direct",
      }),
    [layoutLocale, density, mode, showModifiers, showFunctionKeys, modifierLabels, phonetic],
  );

  const menuItems = useMemo<MenuItem[]>(
    () => [
      ...AvailableKeyboardLayouts.map((lang) => ({
        id: lang.value,
        label: lang.label,
        checked: layoutLocale === lang.value,
        onSelect: () => setLayoutLocale(lang.value),
      })),
      ...(directAlt
        ? [
            {
              id: "ime-style",
              label: phonetic
                ? `${imeStyleLabel(imeId)} → ${imeStyleLabel(directAlt)}`
                : `${imeStyleLabel(imeId)} → ${imeStyleLabel(layoutLocale === "ja" ? "romaji-ja" : "pinyin-zh")}`,
              checked: phonetic,
              separatorAbove: true,
              onSelect: () => toggleImeStyle(),
            } satisfies MenuItem,
          ]
        : []),
      {
        id: "show-modifiers",
        label: "Modifier keys",
        checked: showModifiers,
        separatorAbove: !directAlt,
        onSelect: () => toggleShowModifiers(),
      },
      {
        id: "show-function-keys",
        label: "Function keys",
        checked: showFunctionKeys,
        onSelect: () => toggleShowFunctionKeys(),
      },
    ],
    [
      layoutLocale,
      setLayoutLocale,
      imeId,
      phonetic,
      directAlt,
      toggleImeStyle,
      showModifiers,
      showFunctionKeys,
      toggleShowModifiers,
      toggleShowFunctionKeys,
    ],
  );

  function commitImeText(text: string | undefined) {
    if (!text) return;
    const target = useInputMethodStore.getState().lastTarget;
    insertAtTarget(target, text);
  }

  function handleImeSelect(index: number) {
    refreshTarget();
    const { commit } = feedIme({ type: "select", index });
    commitImeText(commit);
  }

  function handleKeyPress(key: KeyboardKey) {
    refreshTarget();
    const target = useInputMethodStore.getState().lastTarget;
    const mods = { ctrl, alt, meta, shift };
    const modsActive = ctrl || alt || meta;
    const useIme = phonetic && mode === "letters" && !modsActive;

    if (key.type === "fn") {
      dispatchChordAtTarget(target, `F${key.n}`, mods);
      if (modsActive) clearChordModifiers();
      return;
    }

    if (key.type === "action") {
      if (key.action === KEY_SHIFT) {
        toggleShift();
        return;
      }
      if (key.action === KEY_CAPS) {
        toggleCaps();
        return;
      }
      if (key.action === KEY_CTRL) {
        toggleCtrl();
        return;
      }
      if (key.action === KEY_ALT) {
        toggleAlt();
        return;
      }
      if (key.action === KEY_META) {
        toggleMeta();
        return;
      }
      if (key.action === KEY_MODE_ABC) {
        setMode("letters");
        return;
      }
      if (key.action === KEY_MODE_123) {
        setMode("symbols");
        return;
      }
      if (key.action === KEY_MODE_EMOJI) {
        setMode("emoji");
        return;
      }
      if (key.action === KEY_TAB) {
        tabAtTarget(target, mods);
        if (modsActive) clearChordModifiers();
        return;
      }
      if (key.action === KEY_ESC) {
        if (useIme && composing) {
          feedIme({ type: "escape" });
          return;
        }
        escapeAtTarget(target, mods);
        if (modsActive) clearChordModifiers();
        return;
      }
      if (key.action === KEY_BACKSPACE) {
        if (modsActive) {
          dispatchChordAtTarget(target, "Backspace", mods);
          clearChordModifiers();
          return;
        }
        if (useIme) {
          const { commit, handled } = feedIme({ type: "backspace" });
          commitImeText(commit);
          if (handled) return;
        }
        backspaceAtTarget(target);
        return;
      }
      if (key.action === KEY_SPACE) {
        if (modsActive) {
          dispatchChordAtTarget(target, " ", mods);
          clearChordModifiers();
          return;
        }
        if (useIme) {
          const { commit, handled } = feedIme({ type: "space" });
          commitImeText(commit);
          if (handled) {
            setShift(false);
            return;
          }
        }
        insertAtTarget(target, " ");
        setShift(false);
        return;
      }
      if (key.action === KEY_ENTER) {
        if (modsActive) {
          dispatchChordAtTarget(target, "Enter", mods);
          clearChordModifiers();
          return;
        }
        if (useIme) {
          const { commit, handled } = feedIme({ type: "enter" });
          commitImeText(commit);
          if (handled) {
            setShift(false);
            return;
          }
        }
        enterAtTarget(target);
        setShift(false);
        return;
      }
      return;
    }

    const output = resolveKeyOutput(key, shift, caps, layoutLocale);
    if (!output) return;

    if (modsActive) {
      const chordKey = output.length === 1 ? output.toLowerCase() : output;
      dispatchChordAtTarget(target, chordKey, mods);
      clearChordModifiers();
      return;
    }

    if (useIme) {
      const { commit, handled } = feedIme({ type: "char", value: output });
      commitImeText(commit);
      if (handled) {
        if (shift && mode === "letters") setShift(false);
        return;
      }
    }

    insertAtTarget(target, output);
    if (shift && mode === "letters") setShift(false);
  }

  return (
    <section
      className={[
        "arco-keyboard",
        `arco-keyboard--${density}`,
        `arco-keyboard--${mode}`,
        showModifiers && "arco-keyboard--modifiers",
        showFunctionKeys && "arco-keyboard--function-keys",
        showImeBar && "arco-keyboard--ime",
        composing && "arco-keyboard--composing",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={i18n.t(I18nKey.OS$KEYBOARD)}
    >
      <header className="arco-keyboard__header">
        <button
          type="button"
          className={[
            "arco-keyboard__emoji-btn",
            mode === "emoji" && "arco-keyboard__emoji-btn--active",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Emoji"
          aria-pressed={mode === "emoji"}
          title="Emoji"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setMode(mode === "emoji" ? "letters" : "emoji")}
        >
          😀
        </button>
        <Menu
          className="arco-keyboard__layout-menu"
          side="top"
          align="end"
          aria-label={i18n.t(I18nKey.APPS$LONGFORMER_LANGUAGE)}
          items={menuItems}
          searchable={false}
          trigger={
            <button
              type="button"
              className="arco-keyboard__layout-btn"
              aria-label={i18n.t(I18nKey.APPS$LONGFORMER_LANGUAGE)}
              title={i18n.t(I18nKey.APPS$LONGFORMER_LANGUAGE)}
              onPointerDown={(event) => event.preventDefault()}
            >
              <Globe size={14} aria-hidden="true" />
            </button>
          }
        />
      </header>
      {showImeBar && (
        <div className="arco-keyboard__ime" aria-live="polite">
          <div
            className={[
              "arco-keyboard__preedit",
              composing && "arco-keyboard__preedit--active",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {composing ? (
              <span className="arco-keyboard__preedit-text">{ime.preedit}</span>
            ) : (
              <span className="arco-keyboard__preedit-placeholder">
                {imeId === "pinyin-zh" ? "拼音" : "ローマ字"}
              </span>
            )}
          </div>
          <div className="arco-keyboard__candidates" role="listbox" aria-label="Candidates">
            {ime.candidates.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                role="option"
                className={[
                  "arco-keyboard__candidate",
                  index === ime.selectedIndex && "arco-keyboard__candidate--selected",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-selected={index === ime.selectedIndex}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => handleImeSelect(index)}
              >
                <span className="arco-keyboard__candidate-index">{index + 1}</span>
                <span className="arco-keyboard__candidate-text">{candidate.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="arco-keyboard__rows">
        {layout.rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="arco-keyboard__row">
            {row.map((key, keyIndex) => {
              const pressed = isKeyPhysicallyPressed(key, pressedIds);
              return (
                <button
                  key={`${rowIndex}-${keyIndex}-${keyboardKeyId(key)}`}
                  type="button"
                  className={keyClassName(key, {
                    shift,
                    caps,
                    ctrl,
                    alt,
                    meta,
                    mode,
                    pressed,
                  })}
                  style={keyStyle(key)}
                  aria-label={displayKeyLabel(key, shift, caps, layoutLocale)}
                  aria-pressed={
                    key.type === "action" &&
                    ((key.action === KEY_SHIFT && shift) ||
                      (key.action === KEY_CAPS && caps) ||
                      (key.action === KEY_CTRL && ctrl) ||
                      (key.action === KEY_ALT && alt) ||
                      (key.action === KEY_META && meta) ||
                      undefined)
                  }
                  data-physical-pressed={pressed || undefined}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => handleKeyPress(key)}
                >
                  {displayKeyLabel(key, shift, caps, layoutLocale)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
