import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeWallpaper } from "./wallpapers.js";

describe("normalizeWallpaper", () => {
  it("keeps known static and animated wallpaper ids", () => {
    assert.equal(normalizeWallpaper("forest"), "forest");
    assert.equal(normalizeWallpaper("starfield"), "starfield");
  });

  it("uses a static wallpaper when the preference is missing or invalid", () => {
    assert.equal(normalizeWallpaper(null), "aurora");
    assert.equal(normalizeWallpaper(""), "aurora");
    assert.equal(normalizeWallpaper("retired-wallpaper"), "aurora");
  });
});
