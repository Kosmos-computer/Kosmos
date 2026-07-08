import { type ArcoLocale, DEFAULT_LOCALE } from "../i18n";

export const KEY_BACKSPACE = "__BACKSPACE__";
export const KEY_SPACE = "__SPACE__";
export const KEY_ENTER = "__ENTER__";
export const KEY_SHIFT = "__SHIFT__";

export type KeyboardKey =
  | { type: "char"; value: string; label?: string; wide?: number }
  | { type: "action"; action: typeof KEY_BACKSPACE | typeof KEY_SPACE | typeof KEY_ENTER | typeof KEY_SHIFT; label: string; wide?: number };

export type KeyboardLayout = {
  locale: ArcoLocale;
  rows: KeyboardKey[][];
};

function charKeys(values: string[], wide?: number): KeyboardKey[] {
  return values.map((value) => ({ type: "char", value, wide }));
}

function actionKey(
  action: typeof KEY_BACKSPACE | typeof KEY_SPACE | typeof KEY_ENTER | typeof KEY_SHIFT,
  label: string,
  wide?: number,
): KeyboardKey {
  return { type: "action", action, label, wide };
}

function latinRows(locale: ArcoLocale, extras?: KeyboardKey[]): KeyboardLayout["rows"] {
  const row1 =
    locale === "de"
      ? charKeys(["q", "w", "e", "r", "t", "z", "u", "i", "o", "p"])
      : charKeys(["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"]);
  const row2 = charKeys(["a", "s", "d", "f", "g", "h", "j", "k", "l"]);
  const row3Letters =
    locale === "de"
      ? charKeys(["y", "x", "c", "v", "b", "n", "m"])
      : charKeys(["z", "x", "c", "v", "b", "n", "m"]);
  const row3: KeyboardKey[] = [
    actionKey(KEY_SHIFT, "⇧", 1.4),
    ...row3Letters,
    actionKey(KEY_BACKSPACE, "⌫", 1.6),
  ];
  const row4: KeyboardKey[] = [
    ...(extras ?? []),
    actionKey(KEY_SPACE, "Space", 5),
    actionKey(KEY_ENTER, "↵", 1.6),
  ];
  return [row1, row2, row3, row4];
}

const LAYOUTS: Record<ArcoLocale, KeyboardLayout> = {
  en: {
    locale: "en",
    rows: latinRows("en"),
  },
  es: {
    locale: "es",
    rows: [
      charKeys(["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"]),
      ...latinRows("es").slice(0, 3),
      [
        ...charKeys(["@", "#", "€", "&", "-", "_", ".", ",", "?", "!"]),
        actionKey(KEY_SPACE, "Espacio", 3.5),
        actionKey(KEY_ENTER, "↵", 1.6),
      ],
    ],
  },
  de: {
    locale: "de",
    rows: [
      charKeys(["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"]),
      ...latinRows("de").slice(0, 3),
      [
        ...charKeys(["@", "#", "€", "&", "-", "_", ".", ",", "?", "!"]),
        actionKey(KEY_SPACE, "Leerzeichen", 3.5),
        actionKey(KEY_ENTER, "↵", 1.6),
      ],
    ],
  },
  ja: {
    locale: "ja",
    rows: [
      charKeys(["あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ"]),
      charKeys(["さ", "し", "す", "せ", "そ", "た", "ち", "つ", "て", "と"]),
      charKeys(["な", "に", "ぬ", "ね", "の", "は", "ひ", "ふ", "へ", "ほ"]),
      charKeys(["ま", "み", "む", "め", "も", "や", "ゆ", "よ", "わ", "を"]),
      [
        ...charKeys(["ん", "ー", "、", "。", "・", "「", "」", "？"]),
        actionKey(KEY_BACKSPACE, "⌫", 1.4),
        actionKey(KEY_SPACE, "空白", 2.5),
        actionKey(KEY_ENTER, "↵", 1.4),
      ],
    ],
  },
  "zh-CN": {
    locale: "zh-CN",
    rows: [
      charKeys(["的", "一", "是", "不", "了", "在", "人", "有", "我", "他"]),
      charKeys(["这", "个", "们", "中", "来", "上", "大", "为", "和", "国"]),
      charKeys(["地", "到", "以", "说", "时", "要", "就", "出", "会", "可"]),
      charKeys(["你", "对", "生", "能", "而", "子", "那", "得", "于", "着"]),
      [
        ...charKeys(["下", "自", "之", "年", "过", "发", "后", "作", "里", "用"]),
        actionKey(KEY_BACKSPACE, "⌫", 1.4),
        actionKey(KEY_SPACE, "空格", 2),
        actionKey(KEY_ENTER, "↵", 1.4),
      ],
    ],
  },
};

export function resolveKeyboardLocale(locale: string): ArcoLocale {
  if (locale in LAYOUTS) return locale as ArcoLocale;
  const base = locale.split("-")[0];
  if (base && base in LAYOUTS) return base as ArcoLocale;
  return DEFAULT_LOCALE;
}

export function getKeyboardLayout(locale: string): KeyboardLayout {
  return LAYOUTS[resolveKeyboardLocale(locale)];
}

export function displayKeyLabel(key: KeyboardKey, shift: boolean): string {
  if (key.type === "action") return key.label;
  const label = key.label ?? key.value;
  if (!shift) return label;
  if (label.length === 1 && /[a-z]/.test(label)) return label.toUpperCase();
  return label;
}

export function resolveKeyOutput(key: KeyboardKey, shift: boolean): string | null {
  if (key.type === "action") return null;
  const value = key.value;
  if (!shift) return value;
  if (value.length === 1 && /[a-z]/.test(value)) return value.toUpperCase();
  return value;
}
