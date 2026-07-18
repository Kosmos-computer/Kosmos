/**
 * On-screen keyboard layouts — inspired by simple-keyboard's full default/shift
 * layouts and mobile OSKs (letters / 123 / emoji mode pages).
 *
 * Layout locale is independent of app i18n so switching keyboards never
 * reloads the shell.
 */
import { DEFAULT_LOCALE } from "../i18n";

export const KEY_BACKSPACE = "__BACKSPACE__";
export const KEY_SPACE = "__SPACE__";
export const KEY_ENTER = "__ENTER__";
export const KEY_SHIFT = "__SHIFT__";
export const KEY_CAPS = "__CAPS__";
export const KEY_TAB = "__TAB__";
export const KEY_ESC = "__ESC__";
export const KEY_CTRL = "__CTRL__";
export const KEY_ALT = "__ALT__";
export const KEY_META = "__META__";
export const KEY_MODE_ABC = "__MODE_ABC__";
export const KEY_MODE_123 = "__MODE_123__";
export const KEY_MODE_EMOJI = "__MODE_EMOJI__";

export type KeyboardMode = "letters" | "symbols" | "emoji";
export type KeyboardDensity = "full" | "compact";

/** Selectable OSK layouts — may include locales not offered for app UI i18n. */
export const AvailableKeyboardLayouts = [
  { label: "English", value: "en" },
  { label: "Français", value: "fr" },
  { label: "Español", value: "es" },
  { label: "Deutsch", value: "de" },
  { label: "日本語", value: "ja" },
  { label: "简体中文", value: "zh-CN" },
] as const;

export type KeyboardLocale = (typeof AvailableKeyboardLayouts)[number]["value"];

export type ModifierLabels = {
  ctrl: string;
  alt: string;
  meta: string;
};

export type KeyboardLayoutOptions = {
  showModifiers?: boolean;
  modifiers?: ModifierLabels;
  /** Esc + F1–F12 row (default on for full density). */
  showFunctionKeys?: boolean;
  /**
   * CJK letter grid style. Phonetic = Latin QWERTY for romaji/pinyin IME;
   * direct = かな / 常用字 glyph grids (passthrough).
   */
  letterStyle?: "phonetic" | "direct";
};

export type KeyboardAction =
  | typeof KEY_BACKSPACE
  | typeof KEY_SPACE
  | typeof KEY_ENTER
  | typeof KEY_SHIFT
  | typeof KEY_CAPS
  | typeof KEY_TAB
  | typeof KEY_ESC
  | typeof KEY_CTRL
  | typeof KEY_ALT
  | typeof KEY_META
  | typeof KEY_MODE_ABC
  | typeof KEY_MODE_123
  | typeof KEY_MODE_EMOJI;

export type KeyboardKey =
  | { type: "char"; value: string; label?: string; wide?: number }
  | { type: "action"; action: KeyboardAction; label: string; wide?: number }
  | { type: "fn"; n: number; wide?: number };

export type KeyboardLayout = {
  locale: KeyboardLocale;
  density: KeyboardDensity;
  mode: KeyboardMode;
  rows: KeyboardKey[][];
};

/** Shift-layer for full number/punctuation row (simple-keyboard style). */
const SHIFT_MAP: Record<string, string> = {
  "`": "~",
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
  "-": "_",
  "=": "+",
  "[": "{",
  "]": "}",
  "\\": "|",
  ";": ":",
  "'": '"',
  ",": "<",
  ".": ">",
  "/": "?",
};

/** AZERTY FR — unshifted glyphs map to the shifted digit/punct layer. */
const SHIFT_MAP_FR: Record<string, string> = {
  "²": "~",
  "&": "1",
  é: "2",
  '"': "3",
  "'": "4",
  "(": "5",
  "-": "6",
  è: "7",
  _: "8",
  ç: "9",
  à: "0",
  ")": "°",
  "=": "+",
  "^": "¨",
  $: "£",
  ù: "%",
  "*": "µ",
  "<": ">",
  ",": "?",
  ";": ".",
  ":": "/",
  "!": "§",
};

const EMOJI_ROWS: string[][] = [
  ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂"],
  ["😉", "😍", "🥰", "😘", "😗", "😋", "😜", "🤪", "😎", "🤩"],
  ["😢", "😭", "😤", "😠", "🤬", "😱", "😨", "🤗", "🤔", "😴"],
  ["👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "✌️", "🤞", "👋"],
  ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💯", "✨"],
  ["🔥", "⭐", "✅", "❌", "🎉", "🎊", "🎈", "🎁", "🏆", "🚀"],
];

function charKeys(values: string[], wide?: number): KeyboardKey[] {
  return values.map((value) => ({ type: "char", value, wide }));
}

function actionKey(action: KeyboardAction, label: string, wide?: number): KeyboardKey {
  return { type: "action", action, label, wide };
}

function fnKey(n: number): KeyboardKey {
  return { type: "fn", n };
}

function functionRow(): KeyboardKey[] {
  return Array.from({ length: 12 }, (_, i) => fnKey(i + 1));
}

function shiftMapFor(locale: KeyboardLocale): Record<string, string> {
  return locale === "fr" ? SHIFT_MAP_FR : SHIFT_MAP;
}

/** Platform-aware modifier labels (macOS symbols vs Win/Linux words). */
export function modifierLabelsForOs(os: string): ModifierLabels {
  const apple =
    os === "darwin" ||
    os === "ios" ||
    (os === "web" &&
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent));
  if (apple) return { ctrl: "⌃", alt: "⌥", meta: "⌘" };
  if (os === "linux") return { ctrl: "Ctrl", alt: "Alt", meta: "Super" };
  return { ctrl: "Ctrl", alt: "Alt", meta: "Win" };
}

function modifierKeys(labels: ModifierLabels): KeyboardKey[] {
  return [
    actionKey(KEY_CTRL, labels.ctrl, 1.1),
    actionKey(KEY_ALT, labels.alt, 1.1),
    actionKey(KEY_META, labels.meta, 1.1),
  ];
}

function modeBar(
  spaceLabel: string,
  spaceWide: number,
  modifiers?: ModifierLabels,
): KeyboardKey[] {
  return [
    actionKey(KEY_MODE_123, "123", 1.3),
    ...(modifiers ? modifierKeys(modifiers) : []),
    actionKey(KEY_SPACE, spaceLabel, modifiers ? Math.max(2.8, spaceWide - 1.5) : spaceWide),
    actionKey(KEY_ENTER, "↵", 1.5),
  ];
}

function lettersBar(
  spaceLabel: string,
  spaceWide: number,
  modifiers?: ModifierLabels,
): KeyboardKey[] {
  return [
    actionKey(KEY_MODE_ABC, "ABC", 1.3),
    ...(modifiers ? modifierKeys(modifiers) : []),
    actionKey(KEY_SPACE, spaceLabel, modifiers ? Math.max(2.8, spaceWide - 1.5) : spaceWide),
    actionKey(KEY_ENTER, "↵", 1.5),
  ];
}

function emojiBar(modifiers?: ModifierLabels): KeyboardKey[] {
  return [
    actionKey(KEY_MODE_ABC, "ABC", 1.4),
    actionKey(KEY_MODE_123, "123", 1.3),
    ...(modifiers ? modifierKeys(modifiers) : []),
    actionKey(KEY_SPACE, "Space", modifiers ? 2.5 : 4),
    actionKey(KEY_BACKSPACE, "⌫", 1.5),
  ];
}

function spaceLabelFor(locale: KeyboardLocale): string {
  if (locale === "fr") return "Espace";
  if (locale === "es") return "Espacio";
  if (locale === "de") return "Leerzeichen";
  if (locale === "ja") return "空白";
  if (locale === "zh-CN") return "空格";
  return "Space";
}

function latinLetterRows(
  locale: KeyboardLocale,
  density: KeyboardDensity,
  modifiers?: ModifierLabels,
  showFunctionKeys?: boolean,
): KeyboardLayout["rows"] {
  const spaceLabel = spaceLabelFor(locale);

  if (locale === "fr") {
    const azertyTop = ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"];
    const azertyMid = ["q", "s", "d", "f", "g", "h", "j", "k", "l", "m"];
    const azertyBottom = ["w", "x", "c", "v", "b", "n"];

    if (density === "full") {
      return [
        ...(showFunctionKeys ? [functionRow()] : []),
        [
          actionKey(KEY_ESC, "esc"),
          ...charKeys(["²", "&", "é", '"', "'", "(", "-", "è", "_", "ç", "à", ")", "="]),
        ],
        [actionKey(KEY_TAB, "tab", 1.4), ...charKeys(azertyTop), ...charKeys(["^", "$"])],
        [actionKey(KEY_CAPS, "caps", 1.6), ...charKeys(azertyMid), ...charKeys(["ù", "*"])],
        [
          actionKey(KEY_SHIFT, "⇧", 1.5),
          ...charKeys(["<", ...azertyBottom]),
          ...charKeys([",", ";", ":", "!"]),
          actionKey(KEY_BACKSPACE, "⌫", 1.6),
        ],
        modeBar(spaceLabel, 5, modifiers),
      ];
    }

    return [
      ...(showFunctionKeys ? [functionRow()] : []),
      [actionKey(KEY_ESC, "esc", 1.2), actionKey(KEY_TAB, "tab", 1.2), ...charKeys(azertyTop)],
      [actionKey(KEY_CAPS, "caps", 1.4), ...charKeys(azertyMid)],
      [
        actionKey(KEY_SHIFT, "⇧", 1.5),
        ...charKeys(azertyBottom),
        actionKey(KEY_BACKSPACE, "⌫", 1.6),
      ],
      modeBar(spaceLabel, 4.5, modifiers),
    ];
  }

  const qwertyTop =
    locale === "de"
      ? ["q", "w", "e", "r", "t", "z", "u", "i", "o", "p"]
      : ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
  const mid = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
  const bottomLetters =
    locale === "de"
      ? ["y", "x", "c", "v", "b", "n", "m"]
      : ["z", "x", "c", "v", "b", "n", "m"];

  if (density === "full") {
    return [
      ...(showFunctionKeys ? [functionRow()] : []),
      [actionKey(KEY_ESC, "esc"), ...charKeys(["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="])],
      [actionKey(KEY_TAB, "tab", 1.4), ...charKeys(qwertyTop), ...charKeys(["[", "]", "\\"])],
      [actionKey(KEY_CAPS, "caps", 1.6), ...charKeys(mid), ...charKeys([";", "'"])],
      [
        actionKey(KEY_SHIFT, "⇧", 1.5),
        ...charKeys(bottomLetters),
        ...charKeys([",", ".", "/"]),
        actionKey(KEY_BACKSPACE, "⌫", 1.6),
      ],
      modeBar(spaceLabel, 5, modifiers),
    ];
  }

  return [
    ...(showFunctionKeys ? [functionRow()] : []),
    [
      actionKey(KEY_ESC, "esc", 1.2),
      actionKey(KEY_TAB, "tab", 1.2),
      ...charKeys(qwertyTop),
    ],
    [actionKey(KEY_CAPS, "caps", 1.4), ...charKeys(mid)],
    [
      actionKey(KEY_SHIFT, "⇧", 1.5),
      ...charKeys(bottomLetters),
      actionKey(KEY_BACKSPACE, "⌫", 1.6),
    ],
    modeBar(spaceLabel, 4.5, modifiers),
  ];
}

function symbolsRows(density: KeyboardDensity, modifiers?: ModifierLabels): KeyboardLayout["rows"] {
  if (density === "full") {
    return [
      charKeys(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]),
      charKeys(["-", "/", ":", ";", "(", ")", "$", "&", "@", '"']),
      charKeys(["[", "]", "{", "}", "#", "%", "^", "*", "+", "="]),
      [
        ...charKeys(["_", "\\", "|", "~", "<", ">", "€", "£", "¥"]),
        actionKey(KEY_BACKSPACE, "⌫", 1.6),
      ],
      lettersBar("Space", 5, modifiers),
    ];
  }

  return [
    charKeys(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]),
    charKeys(["-", "/", ":", ";", "(", ")", "$", "&", "@", '"']),
    [
      ...charKeys([".", ",", "?", "!", "'", "#", "%", "*", "+"]),
      actionKey(KEY_BACKSPACE, "⌫", 1.4),
    ],
    lettersBar("Space", 4.5, modifiers),
  ];
}

function emojiRows(modifiers?: ModifierLabels): KeyboardLayout["rows"] {
  return [...EMOJI_ROWS.map((row) => charKeys(row)), emojiBar(modifiers)];
}

function withLeadingAccentRow(
  rows: KeyboardLayout["rows"],
  accents: KeyboardKey[],
  showFunctionKeys?: boolean,
): KeyboardLayout["rows"] {
  if (showFunctionKeys && rows.length > 0) {
    return [rows[0]!, accents, ...rows.slice(1)];
  }
  return [accents, ...rows];
}

function specialtyLetterRows(
  locale: "ja" | "zh-CN",
  density: KeyboardDensity,
  modifiers?: ModifierLabels,
  showFunctionKeys?: boolean,
): KeyboardLayout["rows"] {
  const navRow: KeyboardKey[] = [
    actionKey(KEY_ESC, "esc", 1.2),
    actionKey(KEY_TAB, "tab", 1.3),
    actionKey(KEY_CAPS, "caps", 1.4),
    actionKey(KEY_BACKSPACE, "⌫", 1.5),
  ];

  if (locale === "ja") {
    return [
      ...(showFunctionKeys ? [functionRow()] : []),
      charKeys(["あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ"]),
      charKeys(["さ", "し", "す", "せ", "そ", "た", "ち", "つ", "て", "と"]),
      charKeys(["な", "に", "ぬ", "ね", "の", "は", "ひ", "ふ", "へ", "ほ"]),
      charKeys(["ま", "み", "む", "め", "も", "や", "ゆ", "よ", "わ", "を"]),
      [
        ...charKeys(density === "full" ? ["ん", "ー", "、", "。", "・", "「", "」", "？", "！"] : ["ん", "ー", "、", "。", "？", "！"]),
      ],
      navRow,
      modeBar("空白", density === "full" ? 4.5 : 3.5, modifiers),
    ];
  }

  return [
    ...(showFunctionKeys ? [functionRow()] : []),
    charKeys(["的", "一", "是", "不", "了", "在", "人", "有", "我", "他"]),
    charKeys(["这", "个", "们", "中", "来", "上", "大", "为", "和", "国"]),
    charKeys(["地", "到", "以", "说", "时", "要", "就", "出", "会", "可"]),
    charKeys(["你", "对", "生", "能", "而", "子", "那", "得", "于", "着"]),
    charKeys(["下", "自", "之", "年", "过", "发", "后", "作", "里", "用"]),
    navRow,
    modeBar("空格", density === "full" ? 4 : 3.5, modifiers),
  ];
}

function letterRows(
  locale: KeyboardLocale,
  density: KeyboardDensity,
  modifiers?: ModifierLabels,
  showFunctionKeys?: boolean,
  letterStyle: "phonetic" | "direct" = "phonetic",
): KeyboardLayout["rows"] {
  // Direct CJK grids — no IME composition (tap glyph → insert).
  if ((locale === "ja" || locale === "zh-CN") && letterStyle === "direct") {
    return specialtyLetterRows(locale, density, modifiers, showFunctionKeys);
  }

  // Phonetic ja/zh use the same Latin QWERTY base as English (romaji / pinyin).
  const latinLocale: KeyboardLocale =
    locale === "ja" || locale === "zh-CN" ? "en" : locale;
  const base = latinLetterRows(latinLocale, density, modifiers, showFunctionKeys).map((row) =>
    // Relabel space for CJK even when keys are English QWERTY.
    locale === "ja" || locale === "zh-CN"
      ? row.map((key) =>
          key.type === "action" && key.action === KEY_SPACE
            ? { ...key, label: spaceLabelFor(locale) }
            : key,
        )
      : row,
  );

  if (locale === "fr") {
    return withLeadingAccentRow(
      base,
      charKeys(["â", "ê", "î", "ô", "û", "ë", "ï", "ü", "ÿ", "œ", "æ", "«", "»"]),
      showFunctionKeys,
    );
  }
  if (locale === "es") {
    return withLeadingAccentRow(
      base,
      charKeys(["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"]),
      showFunctionKeys,
    );
  }
  if (locale === "de") {
    return withLeadingAccentRow(base, charKeys(["ä", "ö", "ü", "ß"]), showFunctionKeys);
  }

  return base;
}

export function resolveKeyboardLocale(locale: string): KeyboardLocale {
  if (
    locale === "en" ||
    locale === "fr" ||
    locale === "es" ||
    locale === "de" ||
    locale === "ja" ||
    locale === "zh-CN"
  ) {
    return locale;
  }
  const base = locale.split("-")[0];
  if (base === "en" || base === "fr" || base === "es" || base === "de" || base === "ja" || base === "zh") {
    return base === "zh" ? "zh-CN" : base;
  }
  return DEFAULT_LOCALE;
}

export function getKeyboardLayout(
  locale: string,
  density: KeyboardDensity = "full",
  mode: KeyboardMode = "letters",
  options?: KeyboardLayoutOptions,
): KeyboardLayout {
  const resolved = resolveKeyboardLocale(locale);
  const modifiers = options?.showModifiers ? (options.modifiers ?? modifierLabelsForOs("web")) : undefined;
  // Full desktop shows F-keys by default; compact only when the setting is on.
  const showFunctionKeys = options?.showFunctionKeys ?? density === "full";
  const letterStyle = options?.letterStyle ?? "phonetic";
  const rows =
    mode === "emoji"
      ? emojiRows(modifiers)
      : mode === "symbols"
        ? symbolsRows(density, modifiers)
        : letterRows(resolved, density, modifiers, showFunctionKeys, letterStyle);

  return { locale: resolved, density, mode, rows };
}

/** Caps XOR shift for letters — matches physical keyboard behavior. */
export function letterShiftActive(shift: boolean, caps: boolean): boolean {
  return caps ? !shift : shift;
}

function caseLetter(label: string, upper: boolean, locale: KeyboardLocale): string {
  if (label.length !== 1) return label;
  // Letters only — punctuation stays on the shift map.
  if (!/\p{L}/u.test(label)) return label;
  return upper ? label.toLocaleUpperCase(locale) : label.toLocaleLowerCase(locale);
}

export function displayKeyLabel(
  key: KeyboardKey,
  shift: boolean,
  caps = false,
  locale: KeyboardLocale = DEFAULT_LOCALE,
): string {
  if (key.type === "fn") return `F${key.n}`;
  if (key.type === "action") return key.label;
  const label = key.label ?? key.value;
  const upper = letterShiftActive(shift, caps);
  const shiftMap = shiftMapFor(locale);
  if (upper && shiftMap[label]) return shiftMap[label];
  return caseLetter(label, upper, locale);
}

export function resolveKeyOutput(
  key: KeyboardKey,
  shift: boolean,
  caps = false,
  locale: KeyboardLocale = DEFAULT_LOCALE,
): string | null {
  if (key.type === "action" || key.type === "fn") return null;
  const value = key.value;
  const upper = letterShiftActive(shift, caps);
  const shiftMap = shiftMapFor(locale);
  if (upper && shiftMap[value]) return shiftMap[value];
  return caseLetter(value, upper, locale);
}

export function keyboardKeyId(key: KeyboardKey): string {
  if (key.type === "fn") return `F${key.n}`;
  if (key.type === "action") return key.action;
  return key.value;
}
