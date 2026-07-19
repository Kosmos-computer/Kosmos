import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeWallpaper } from "./wallpapers.js";

describe("normalizeWallpaper", () => {
  it("keeps known photo, static, and animated wallpaper ids", () => {
    assert.equal(normalizeWallpaper("space"), "space");
    assert.equal(normalizeWallpaper("forest"), "forest");
    assert.equal(normalizeWallpaper("starfield"), "starfield");
    assert.equal(normalizeWallpaper("overworld"), "overworld");
  });

  it("maps the legacy galaxy id to space", () => {
    assert.equal(normalizeWallpaper("galaxy"), "space");
  });

  it("uses the space photo when the preference is missing or invalid", () => {
    assert.equal(normalizeWallpaper(null), "space");
    assert.equal(normalizeWallpaper(""), "space");
    assert.equal(normalizeWallpaper("retired-wallpaper"), "space");
  });
});
