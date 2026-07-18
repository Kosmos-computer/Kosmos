# On-Screen Keyboard & IME — Current State & Roadmap

> Written 2026-07-18. Covers the Arco floating OSK, layout system, physical
> keyboard sync, and CJK input-method shell.
>
> **Status: Phase 1 shipped.** Multi-layout desktop OSK with composition bar,
> basic romaji/pinyin engines, and hardware key bridging. Conversion quality is
> demo-level until dictionaries grow or a real engine is plugged in.

## Why

Arco is an OS shell: text entry should work without assuming a host OS keyboard
or IME. Touch / kiosk / mobile-adjacent surfaces need an on-screen keyboard;
desktop users expect F-keys, modifiers, and chords. CJK users expect
composition + candidates — not a static glyph grid alone.

Layout locale is **independent of app i18n** so switching keyboards never
reloads the shell.

## Design principles

1. **OSK is an input method, not a decoration.** Taps and (when open) hardware
   keys route through the same insert / IME path into a remembered editable.
2. **Layout ≠ language ≠ IME.** `layoutLocale` picks the key grid; `imeId`
   picks the engine (`none`, `romaji-ja`, `pinyin-zh`, `direct-*`). App UI
   language stays separate.
3. **Engines are pure steppers.** `(state, event) → { state, commit? }` so new
   scripts (Hangul, Zhuyin, …) plug in without rewriting the chrome.
4. **Mobile CJK chrome on a desktop shell.** Preedit + candidates live in a
   strip above the keys (Gboard-style), not only as underlined text in the
   field.
5. **Grow dictionaries behind a stable UI.** Tiny starter lexicons are fine;
   swap in Mozc / Rime / larger tables later without changing the bar.

## Current state (Phase 1)

### Shell & chrome

| Capability | Status |
|---|---|
| Floating keyboard above dock | Done |
| Open/close + persist (`arco:input-method-open`) | Done |
| Remember last editable target | Done |
| Emoji / letters / symbols modes | Done |
| Full vs compact density (`max-width: 720px`) | Done |
| Globe menu: layout, modifiers, F-keys, CJK style | Done |
| Modifier row (⌃⌥⌘ / Ctrl Alt Win), sticky + chords | Done |
| Esc, Tab, Caps, F1–F12 | Done |
| Caps XOR shift for letter case | Done |

### Layouts

| Layout | Grid | Notes |
|---|---|---|
| English | QWERTY | Baseline |
| Français | AZERTY + accents | Shift map for FR digit row |
| Español | QWERTY + accent row | áéíóúñü ¿¡ |
| Deutsch | QWERTZ + umlauts | äöüß |
| 日本語 | QWERTY (romaji) or かな grid | Style toggle in globe menu |
| 简体中文 | QWERTY (pinyin) or 常用字 grid | Style toggle in globe menu |

### Physical keyboard

| Capability | Status |
|---|---|
| Highlight matching OSK key while held | Done |
| Phonetic IME: hardware → composition bar | Done |
| Backspace / Esc / Space / Enter on composition | Done |
| Focus lost → type into last editable | Done |
| Mirror host OS IME (`compositionupdate`) | Not started |

### IME

| Capability | Status |
|---|---|
| Composition / candidate strip UI | Done |
| `romaji-ja` → ひらがな + small kanji dict | Done (starter) |
| `pinyin-zh` → candidates | Done (starter) |
| `direct-ja` / `direct-zh` glyph grids | Done |
| Digit keys 1–9 select candidates | Done |
| Large lexicon / language model | Not started |
| Hangul, Zhuyin, Cangjie, … | Not started |
| Latin autocorrect / suggestions | Not started |

### Key files

```
src/components/patterns/OnScreenKeyboard.tsx   # UI
src/os/FloatingKeyboard.tsx                    # Shell mount + target tracking
src/os/inputMethodStore.ts                     # Open, layout, imeId, composition
src/os/keyboardLayouts.ts                      # Grids, shift maps, density
src/os/keyboardInsert.ts                       # Insert / backspace / chords
src/os/physicalKeyHighlight.ts                 # code → OSK key ids
src/os/ime/
  types.ts                     # ImeId, ImeState, events
  engines.ts                   # Pure steppers
  romajiTable.ts               # Romaji → hiragana
  dictionaries.ts              # Starter JA/ZH tables
  usePhysicalKeyboardBridge.ts # Hardware → IME / last target
```

## Roadmap

### Phase 2 — Make CJK actually usable

Priority: conversion quality and candidate UX.

- [ ] Expand pinyin dictionary (common words + phrases; tone-optional)
- [ ] Expand Japanese readings → kanji (or embed a compact open lexicon)
- [ ] Candidate paging / “more” expand (horizontal strip → multi-row)
- [ ] Space cycles candidates (JP desktop habit) vs commit (configurable)
- [ ] Better longest-match / segmentation for multi-syllable pinyin
- [ ] Persist recent / frequent candidates per `imeId`
- [ ] Unit tests for engine edge cases (ん, sokuon, apostrophe, flush)

**Exit:** Typing everyday JP/ZH phrases on the OSK feels usable without a host IME.

### Phase 3 — More scripts & layouts

- [ ] Korean Hangul jamo composition engine (`hangul-ko`)
- [ ] Traditional Chinese paths (Zhuyin / Bopomofo; optional Cangjie later)
- [ ] Additional Latin layouts as needed (IT, PT, Nordic, …)
- [ ] JIS-ish kana layout refinements for `direct-ja`
- [ ] RTL layout support if/when Arabic / Hebrew OSK is in scope

**Exit:** Globe menu covers the locales Arco ships in UI i18n, plus common extras.

### Phase 4 — Deeper engine integration (optional)

Keep the same OSK chrome; replace steppers behind `ImeId`.

- [ ] Evaluate embedding **librime** / **Mozc** (WASM or native via desktop bridge)
- [ ] Schema/user packaging story (downloadable IME packs)
- [ ] Fallback: ship larger static JSON/SQLite dictionaries if WASM cost is high
- [ ] License review for redistributed lexicons

**Exit:** One “power” CJK engine path with quality comparable to a phone IME.

### Phase 5 — Latin intelligence & polish

- [ ] Optional suggestion strip for `en` / `fr` / `es` / `de` (autocorrect)
- [ ] Long-press key → accent popup (mobile pattern)
- [ ] Key repeat for Backspace / arrows (if arrows added)
- [ ] One-handed / floating resize / drag position
- [ ] Sound / haptic hooks via platform bridge (desktop optional)
- [ ] A11y: announce candidates, better `aria` on composition

**Exit:** OSK feels finished for daily Latin + CJK use in the shell.

### Phase 6 — Host OS coexistence

- [ ] When physical typing uses the **system** IME, mirror preedit/candidates into the OSK bar (`compositionstart` / `update` / `end`)
- [ ] Clear policy: OSK phonetic IME **or** system IME, not both fighting
- [ ] Desktop: respect fullscreen / keyboard shortcut conflicts

**Exit:** No double-composition surprises; OSK bar can reflect either engine.

## Non-goals (for now)

- Replacing the host OS IME for all apps outside Arco
- Handwriting / voice input (separate features)
- Per-app keyboard themes beyond Arco design tokens
- Shipping a full proprietary cloud IME

## Open questions

1. **Dictionary strategy** — grow static tables in-repo, or invest in WASM Rime/Mozc sooner?
2. **Default for 日本語** — romaji (current) vs かな for touch-first profiles?
3. **Space behavior** — commit vs cycle candidates; one setting or per-IME?
4. **Should the Keyboard app** (`apps/keyboard`) share this OSK/IME stack 1:1 or stay a lab surface?

## References

- [simple-keyboard layoutCandidates](https://hodgef.com/simple-keyboard/documentation/options/layoutcandidates/) — web OSK candidate UX
- [google/mozc](https://github.com/google/mozc) — production JP IME + Android candidate views
- [fcitx5-android](https://github.com/fcitx5-android/fcitx5-android) — multi-engine mobile IME + expandable candidates
- [rime / librime](https://github.com/rime/librime) — schema-driven engines; preedit vs candidate split
- [FusionIME](https://github.com/Lee0701/FusionIME) — bundled CJKV engines in one keyboard app
