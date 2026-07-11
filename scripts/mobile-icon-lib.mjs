/**
 * Shared Kosmos grid-mark SVG builders for mobile launcher icons.
 *
 * Connect: white mark on black tile (remote client).
 * Local:   black mark on white tile (embedded backend on device).
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

export const CELL = 15;
export const LOGO_CELLS = [
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
export const MARK_VIEWBOX = { width: 105, height: 75 };

/** Mark scale inside the 108dp adaptive foreground (66dp safe zone ≈ 61%). */
export const ADAPTIVE_MARK_SCALE = 0.54;

/** Full rounded icon scale inside 108dp canvas for legacy launcher PNGs. */
export const LAUNCHER_ICON_SCALE = 0.68;

export const DENSITIES = {
  "mipmap-mdpi": { launcher: 48, foreground: 108 },
  "mipmap-hdpi": { launcher: 72, foreground: 162 },
  "mipmap-xhdpi": { launcher: 96, foreground: 216 },
  "mipmap-xxhdpi": { launcher: 144, foreground: 324 },
  "mipmap-xxxhdpi": { launcher: 192, foreground: 432 },
};

export const SPLASH = {
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

/** @typedef {"connect" | "local"} MobileIconVariant */

/** @type {Record<MobileIconVariant, { label: string; tileBg: string; mark: string }>} */
export const MOBILE_ICON_VARIANTS = {
  connect: {
    label: "Kosmos Connect",
    tileBg: "#000000",
    mark: "#ffffff",
  },
  local: {
    label: "Kosmos Local",
    tileBg: "#ffffff",
    mark: "#000000",
  },
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
export function adaptiveForegroundSvg(variant) {
  const { mark } = MOBILE_ICON_VARIANTS[variant];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">
  <g transform="translate(54 54)">
    <g transform="${markTransform(ADAPTIVE_MARK_SCALE)}" fill="${mark}">
      ${markRects()}
    </g>
  </g>
</svg>
`;
}

/** Flat launcher icon — rounded tile + mark, padded for circular masks. */
export function launcherSvg(variant) {
  const { tileBg, mark } = MOBILE_ICON_VARIANTS[variant];
  const tile = 108 * LAUNCHER_ICON_SCALE;
  const radius = tile * 0.225;
  const offset = (108 - tile) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">
  <rect x="${offset}" y="${offset}" width="${tile}" height="${tile}" rx="${radius}" ry="${radius}" fill="${tileBg}"/>
  <g transform="translate(54 54)">
    <g transform="${markTransform(ADAPTIVE_MARK_SCALE)}" fill="${mark}">
      ${markRects()}
    </g>
  </g>
</svg>
`;
}

/** Full-bleed desktop-style icon for splash screens and iOS. */
export function fullIconSvg(variant, canvas = 1024) {
  const { tileBg, mark, label } = MOBILE_ICON_VARIANTS[variant];
  const cornerRadius = Math.round(canvas * 0.225);
  const markScale = 6.2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}" role="img" aria-label="${label}">
  <rect width="${canvas}" height="${canvas}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${tileBg}"/>
  <g transform="translate(${canvas / 2} ${canvas / 2})">
    <g transform="scale(${markScale}) translate(${-MARK_VIEWBOX.width / 2} ${-MARK_VIEWBOX.height / 2})" fill="${mark}">
      ${markRects()}
    </g>
  </g>
</svg>
`;
}

export function rasterizeSvg(svgPath, size, dest) {
  fs.mkdirSync(pathDirname(dest), { recursive: true });
  execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${dest}"`, { stdio: "pipe" });
}

export function resizePng(source, size, dest) {
  fs.mkdirSync(pathDirname(dest), { recursive: true });
  if (process.platform === "darwin") {
    execSync(`sips -z ${size} ${size} "${source}" --out "${dest}"`, { stdio: "pipe" });
    return;
  }
  execSync(`convert "${source}" -resize ${size}x${size}! "${dest}"`, { stdio: "pipe" });
}

function pathDirname(dest) {
  return dest.slice(0, dest.lastIndexOf("/"));
}
