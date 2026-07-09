#!/usr/bin/env node
/**
 * Generate Android launcher + splash assets from the shared Arco desktop icon.
 *
 * Adaptive icons (Chrome OS / Android 8+) mask the foreground into a circle.
 * The foreground uses only the white mark, scaled to the 66dp safe zone — not
 * the full 1024 desktop icon which fills the canvas edge-to-edge.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopIconPng = path.join(root, "apps/desktop/build/icon.png");
const desktopIconSvg = path.join(root, "apps/desktop/build/icon.svg");
const resRoot = path.join(root, "apps/mobile/android/app/src/main/res");
const tmpDir = path.join(os.tmpdir(), "arco-mobile-icons");

// Keep in sync with apps/desktop/scripts/generate-icon.mjs
const CELL = 15;
const LOGO_CELLS = [
  [0, 0],
  [3, 0],
  [6, 0],
  [1, 1],
  [3, 1],
  [5, 1],
  [0, 2],
  [2, 2],
  [4, 2],
  [6, 2],
  [1, 3],
  [3, 3],
  [5, 3],
  [0, 4],
  [3, 4],
  [6, 4],
];
const MARK_VIEWBOX = { width: 105, height: 75 };

/** Mark scale inside the 108dp adaptive foreground (66dp safe zone ≈ 61%). */
const ADAPTIVE_MARK_SCALE = 0.54;

/** Full rounded icon scale inside 108dp canvas for legacy launcher PNGs. */
const LAUNCHER_ICON_SCALE = 0.68;

const DENSITIES = {
  "mipmap-mdpi": { launcher: 48, foreground: 108 },
  "mipmap-hdpi": { launcher: 72, foreground: 162 },
  "mipmap-xhdpi": { launcher: 96, foreground: 216 },
  "mipmap-xxhdpi": { launcher: 144, foreground: 324 },
  "mipmap-xxxhdpi": { launcher: 192, foreground: 432 },
};

const SPLASH = {
  "drawable-port-mdpi": 320,
  "drawable-port-hdpi": 480,
  "drawable-port-xhdpi": 720,
  "drawable-port-xxhdpi": 1080,
  "drawable-port-xxxhdpi": 1440,
  "drawable-land-mdpi": 320,
  "drawable-land-hdpi": 480,
  "drawable-land-xhdpi": 720,
  "drawable-land-xxhdpi": 1080,
  "drawable-land-xxxhdpi": 1440,
};

function markRects() {
  return LOGO_CELLS.map(
    ([col, row]) =>
      `<rect x="${col * CELL}" y="${row * CELL}" width="${CELL}" height="${CELL}"/>`,
  ).join("\n      ");
}

function markTransform(scale) {
  const ox = -MARK_VIEWBOX.width / 2;
  const oy = -MARK_VIEWBOX.height / 2;
  return `scale(${scale}) translate(${ox} ${oy})`;
}

/** Transparent foreground layer — mark only, for adaptive icon circle mask. */
function adaptiveForegroundSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">
  <g transform="translate(54 54)">
    <g transform="${markTransform(ADAPTIVE_MARK_SCALE)}" fill="#ffffff">
      ${markRects()}
    </g>
  </g>
</svg>
`;
}

/** Flat launcher icon — black rounded tile + mark, padded for circular masks. */
function launcherSvg() {
  const tile = 108 * LAUNCHER_ICON_SCALE;
  const radius = tile * 0.225;
  const offset = (108 - tile) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">
  <rect x="${offset}" y="${offset}" width="${tile}" height="${tile}" rx="${radius}" ry="${radius}" fill="#000000"/>
  <g transform="translate(54 54)">
    <g transform="${markTransform(ADAPTIVE_MARK_SCALE)}" fill="#ffffff">
      ${markRects()}
    </g>
  </g>
</svg>
`;
}

function ensureSourceIcon() {
  if (fs.existsSync(desktopIconPng)) return desktopIconPng;
  if (fs.existsSync(desktopIconSvg)) {
    execSync(`rsvg-convert -w 1024 -h 1024 "${desktopIconSvg}" -o "${desktopIconPng}"`, {
      stdio: "inherit",
    });
    return desktopIconPng;
  }
  const generator = path.join(root, "apps/desktop/scripts/generate-icon.mjs");
  if (fs.existsSync(generator)) {
    execSync(`node "${generator}"`, { stdio: "inherit", cwd: root });
    if (fs.existsSync(desktopIconPng)) return desktopIconPng;
  }
  throw new Error("Arco icon not found. Run: node apps/desktop/scripts/generate-icon.mjs");
}

function rasterizeSvg(svgPath, size, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${dest}"`, { stdio: "pipe" });
}

function resizePng(source, size, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (process.platform === "darwin") {
    execSync(`sips -z ${size} ${size} "${source}" --out "${dest}"`, { stdio: "pipe" });
    return;
  }
  execSync(`convert "${source}" -resize ${size}x${size}! "${dest}"`, { stdio: "pipe" });
}

function writeBackgroundColor() {
  const colorPath = path.join(resRoot, "values/ic_launcher_background.xml");
  fs.writeFileSync(
    colorPath,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000000</color>
</resources>
`,
  );

  const drawableBg = path.join(resRoot, "drawable/ic_launcher_background.xml");
  fs.writeFileSync(
    drawableBg,
    `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#000000" android:pathData="M0,0h108v108h-108z" />
</vector>
`,
  );
}

fs.mkdirSync(tmpDir, { recursive: true });
const foregroundSvgPath = path.join(tmpDir, "adaptive-foreground.svg");
const launcherSvgPath = path.join(tmpDir, "launcher.svg");
fs.writeFileSync(foregroundSvgPath, adaptiveForegroundSvg());
fs.writeFileSync(launcherSvgPath, launcherSvg());
writeBackgroundColor();

for (const [folder, { launcher, foreground }] of Object.entries(DENSITIES)) {
  const dir = path.join(resRoot, folder);
  fs.mkdirSync(dir, { recursive: true });
  const launcherPath = path.join(dir, "ic_launcher.png");
  const roundPath = path.join(dir, "ic_launcher_round.png");
  const foregroundPath = path.join(dir, "ic_launcher_foreground.png");

  rasterizeSvg(launcherSvgPath, launcher, launcherPath);
  fs.copyFileSync(launcherPath, roundPath);
  rasterizeSvg(foregroundSvgPath, foreground, foregroundPath);
  console.log(`[mobile:icons] ${folder} → launcher ${launcher}px, foreground ${foreground}px`);
}

const splashSource = ensureSourceIcon();
const splashDir = path.join(resRoot, "drawable");
fs.mkdirSync(splashDir, { recursive: true });
resizePng(splashSource, 512, path.join(splashDir, "splash.png"));

for (const [folder, width] of Object.entries(SPLASH)) {
  const dir = path.join(resRoot, folder);
  fs.mkdirSync(dir, { recursive: true });
  resizePng(splashSource, width, path.join(dir, "splash.png"));
}

console.log("[mobile:icons] Done — adaptive foreground uses safe-zone mark scale");
