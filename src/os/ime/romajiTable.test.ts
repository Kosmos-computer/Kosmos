import { describe, expect, it } from "vitest";
import { flushRomaji, romajiToHiragana } from "./romajiTable";
import { applyIme, emptyImeState } from "./index";

describe("romajiToHiragana", () => {
  it("converts basic mora", () => {
    expect(romajiToHiragana("ka")).toEqual({ hiragana: "か", rest: "" });
    expect(romajiToHiragana("shi")).toEqual({ hiragana: "し", rest: "" });
    expect(romajiToHiragana("kyo")).toEqual({ hiragana: "きょ", rest: "" });
  });

  it("keeps incomplete romaji in rest", () => {
    expect(romajiToHiragana("k")).toEqual({ hiragana: "", rest: "k" });
    expect(romajiToHiragana("ky")).toEqual({ hiragana: "", rest: "ky" });
  });

  it("handles sokuon", () => {
    expect(romajiToHiragana("kka")).toEqual({ hiragana: "っか", rest: "" });
  });

  it("flushes trailing n", () => {
    expect(flushRomaji("n")).toBe("ん");
    expect(flushRomaji("konnichiha")).toBe("こんにちは");
  });
});

describe("romaji-ja IME", () => {
  it("composes then commits a dictionary word", () => {
    let state = emptyImeState("romaji-ja");
    for (const ch of "watashi") {
      const step = applyIme(state, { type: "char", value: ch });
      state = step.state;
      expect(step.handled).toBe(true);
      expect(step.commit).toBeUndefined();
    }
    expect(state.preedit).toBe("わたし");
    expect(state.candidates.some((c) => c.text === "私")).toBe(true);

    const commit = applyIme(state, { type: "select", index: 0 });
    expect(commit.commit).toBe("私");
    expect(commit.state.preedit).toBe("");
  });
});
