/**
 * Tiny starter dictionaries for phonetic IMEs.
 * Replace / grow with real lexicons later (Mozc, Rime schemas, etc.).
 */

/** Hiragana reading → candidate surface forms (kanji / kana variants). */
export const JA_READING_CANDIDATES: Record<string, string[]> = {
  わたし: ["私", "わたし", "ワタシ"],
  あなた: ["あなた", "貴方", "アナタ"],
  こんにちは: ["こんにちは", "今日は", "こんにちわ"],
  ありがとう: ["ありがとう", "有難う", "アリガトウ"],
  東京: ["東京", "とうきょう"],
  とうきょう: ["東京", "とうきょう", "トウキョウ"],
  日本: ["日本", "にほん", "にっぽん"],
  にほん: ["日本", "にほん", "ニホン"],
  にっぽん: ["日本", "にっぽん"],
  かんじ: ["漢字", "かんじ", "カンジ"],
  はい: ["はい", "はい。", "ハイ"],
  いいえ: ["いいえ", "イイエ"],
  おはよう: ["おはよう", "お早う", "オハヨウ"],
  さようなら: ["さようなら", "サヨウナラ"],
  すき: ["好き", "すき", "スキ"],
  きらい: ["嫌い", "きらい"],
  たべる: ["食べる", "たべる"],
  のむ: ["飲む", "のむ"],
  いく: ["行く", "いく", "イク"],
  くる: ["来る", "くる"],
  する: ["する", "為る"],
  です: ["です", "デス"],
  ます: ["ます", "マス"],
  これ: ["これ", "此れ", "コレ"],
  それ: ["それ", "其れ", "ソレ"],
  あれ: ["あれ", "彼れ", "アレ"],
  なに: ["何", "なに", "ナニ"],
  なん: ["何", "なん"],
  ひと: ["人", "ひと", "ヒト"],
  ひ: ["日", "火", "ひ"],
  つき: ["月", "つき"],
  みず: ["水", "みず"],
  ひまわり: ["向日葵", "ひまわり"],
};

/** Pinyin (no tones) → hanzi candidates. */
export const ZH_PINYIN_CANDIDATES: Record<string, string[]> = {
  ni: ["你", "尼", "泥", "逆"],
  hao: ["好", "号", "毫", "豪"],
  nihao: ["你好", "倪浩"],
  wo: ["我", "窝", "蜗"],
  ta: ["他", "她", "它", "塔"],
  de: ["的", "得", "地", "德"],
  shi: ["是", "时", "事", "十", "市"],
  bu: ["不", "部", "步", "布"],
  le: ["了", "乐", "勒"],
  zai: ["在", "再", "载"],
  you: ["有", "又", "友", "右"],
  ren: ["人", "认", "任"],
  zhong: ["中", "种", "重"],
  guo: ["国", "过", "果"],
  woaini: ["我爱你"],
  xiexie: ["谢谢", "谢谢"],
  duibuqi: ["对不起"],
  zaijian: ["再见"],
  beijing: ["北京"],
  shanghai: ["上海"],
  zhongguo: ["中国"],
  shenme: ["什么"],
  weishenme: ["为什么"],
  zenme: ["怎么"],
  keyi: ["可以"],
  xihuan: ["喜欢"],
  jintian: ["今天"],
  mingtian: ["明天"],
  zuotian: ["昨天"],
  pengyou: ["朋友"],
  xuesheng: ["学生"],
  laoshi: ["老师"],
  diannao: ["电脑"],
  shouji: ["手机"],
};

export function candidatesForReading(
  dict: Record<string, string[]>,
  reading: string,
): string[] {
  if (!reading) return [];
  const exact = dict[reading];
  if (exact) return exact;
  // Prefix fallback: longest matching key that equals the reading prefix.
  let bestKey = "";
  for (const key of Object.keys(dict)) {
    if (reading.startsWith(key) && key.length > bestKey.length) bestKey = key;
  }
  return bestKey ? (dict[bestKey] ?? []) : [];
}
