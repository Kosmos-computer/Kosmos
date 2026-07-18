/**
 * Longest-first romaji → hiragana table for a basic JP IME.
 * Incomplete suffixes stay in `raw` until a mora completes.
 *
 * Syllabic ん is handled specially (not as a plain table row) so that
 * `konnichiha` → こんにちは rather than こんいちは.
 */

/** Sorted longest-first so greedy matching prefers きゃ over き+ゃ. */
export const ROMAJI_TO_HIRAGANA: ReadonlyArray<readonly [string, string]> = (
  [
    // digraphs / youon
    ["kya", "きゃ"],
    ["kyu", "きゅ"],
    ["kyo", "きょ"],
    ["gya", "ぎゃ"],
    ["gyu", "ぎゅ"],
    ["gyo", "ぎょ"],
    ["sha", "しゃ"],
    ["shu", "しゅ"],
    ["sho", "しょ"],
    ["ja", "じゃ"],
    ["ju", "じゅ"],
    ["jo", "じょ"],
    ["cha", "ちゃ"],
    ["chu", "ちゅ"],
    ["cho", "ちょ"],
    ["nya", "にゃ"],
    ["nyu", "にゅ"],
    ["nyo", "にょ"],
    ["hya", "ひゃ"],
    ["hyu", "ひゅ"],
    ["hyo", "ひょ"],
    ["bya", "びゃ"],
    ["byu", "びゅ"],
    ["byo", "びょ"],
    ["pya", "ぴゃ"],
    ["pyu", "ぴゅ"],
    ["pyo", "ぴょ"],
    ["mya", "みゃ"],
    ["myu", "みゅ"],
    ["myo", "みょ"],
    ["rya", "りゃ"],
    ["ryu", "りゅ"],
    ["ryo", "りょ"],
    ["tsu", "つ"],
    ["shi", "し"],
    ["chi", "ち"],
    ["fu", "ふ"],
    // sokuon (small tsu) — double consonant
    ["kk", "っk"],
    ["ss", "っs"],
    ["tt", "っt"],
    ["pp", "っp"],
    ["cc", "っc"],
    // basic gojuon
    ["ka", "か"],
    ["ki", "き"],
    ["ku", "く"],
    ["ke", "け"],
    ["ko", "こ"],
    ["ga", "が"],
    ["gi", "ぎ"],
    ["gu", "ぐ"],
    ["ge", "げ"],
    ["go", "ご"],
    ["sa", "さ"],
    ["su", "す"],
    ["se", "せ"],
    ["so", "そ"],
    ["za", "ざ"],
    ["ji", "じ"],
    ["zu", "ず"],
    ["ze", "ぜ"],
    ["zo", "ぞ"],
    ["ta", "た"],
    ["te", "て"],
    ["to", "と"],
    ["da", "だ"],
    ["de", "で"],
    ["do", "ど"],
    ["na", "な"],
    ["ni", "に"],
    ["nu", "ぬ"],
    ["ne", "ね"],
    ["no", "の"],
    ["ha", "は"],
    ["hi", "ひ"],
    ["he", "へ"],
    ["ho", "ほ"],
    ["ba", "ば"],
    ["bi", "び"],
    ["bu", "ぶ"],
    ["be", "べ"],
    ["bo", "ぼ"],
    ["pa", "ぱ"],
    ["pi", "ぴ"],
    ["pu", "ぷ"],
    ["pe", "ぺ"],
    ["po", "ぽ"],
    ["ma", "ま"],
    ["mi", "み"],
    ["mu", "む"],
    ["me", "め"],
    ["mo", "も"],
    ["ya", "や"],
    ["yu", "ゆ"],
    ["yo", "よ"],
    ["ra", "ら"],
    ["ri", "り"],
    ["ru", "る"],
    ["re", "れ"],
    ["ro", "ろ"],
    ["wa", "わ"],
    ["wo", "を"],
    ["a", "あ"],
    ["i", "い"],
    ["u", "う"],
    ["e", "え"],
    ["o", "お"],
    ["-", "ー"],
  ] as const
).slice().sort((a, b) => b[0].length - a[0].length);

function trySyllabicN(src: string): { hira: string; rest: string } | null {
  if (!src.startsWith("n") && !src.startsWith("n'")) return null;

  // Explicit n' → ん
  if (src.startsWith("n'")) return { hira: "ん", rest: src.slice(2) };

  if (src.length < 2) return null; // lone n — wait for more input

  const next = src[1]!;

  // nn → ん, leaving the second n to form na/ni/… or another ん
  if (next === "n") return { hira: "ん", rest: src.slice(1) };

  // n before consonant (not y) → ん (n+y is nya/nyu/nyo)
  if (!"aiueoy".includes(next)) return { hira: "ん", rest: src.slice(1) };

  return null; // n + vowel/y — let table match na/ni/…/nya
}

/**
 * Convert a romaji buffer to hiragana + leftover incomplete romaji.
 * Trailing lone `n` stays in leftover until finalized by flushRomaji.
 */
export function romajiToHiragana(input: string): { hiragana: string; rest: string } {
  let src = input.toLowerCase();
  let out = "";

  while (src.length > 0) {
    const syllabic = trySyllabicN(src);
    if (syllabic) {
      out += syllabic.hira;
      src = syllabic.rest;
      continue;
    }

    let matched = false;
    for (const [roma, hira] of ROMAJI_TO_HIRAGANA) {
      if (!src.startsWith(roma)) continue;
      // Sokuon markers like っk leave the consonant for the next mora.
      if (hira.startsWith("っ") && hira.length > 1) {
        out += "っ";
        src = hira.slice(1) + src.slice(roma.length);
      } else {
        out += hira;
        src = src.slice(roma.length);
      }
      matched = true;
      break;
    }
    if (!matched) break;
  }

  return { hiragana: out, rest: src };
}

/** Force-flush trailing `n` → ん (space / enter / commit). */
export function flushRomaji(input: string): string {
  const { hiragana, rest } = romajiToHiragana(input);
  if (rest === "n") return hiragana + "ん";
  return hiragana + rest;
}
