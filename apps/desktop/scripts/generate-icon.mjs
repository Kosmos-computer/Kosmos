/**
 * Build Electron app icons from the Arco square-grid brand mark.
 * Outputs icon.svg, icon.png (1024), and icon.icns (macOS) under apps/desktop/build/.
 */
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(ROOT, "build");

// Keep in sync with src/components/spriteMarkSquares.ts
const SIZE = 15;

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

const VIEWBOX = { width: 105, height: 75 };
const CANVAS = 1024;
const CORNER_RADIUS = 230;
const MARK_SCALE = 6.2;

const rects = LOGO_CELLS.map(
  ([col, row]) =>
    `<rect x="${col * SIZE}" y="${row * SIZE}" width="${SIZE}" height="${SIZE}"/>`,
).join("\n      ");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}" role="img" aria-label="Arco OS">
  <rect width="${CANVAS}" height="${CANVAS}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="#000000"/>
  <g transform="translate(${CANVAS / 2} ${CANVAS / 2})">
    <g transform="scale(${MARK_SCALE}) translate(${-VIEWBOX.width / 2} ${-VIEWBOX.height / 2})" fill="#ffffff">
      ${rects}
    </g>
  </g>
</svg>
`;

mkdirSync(BUILD, { recursive: true });

const svgPath = join(BUILD, "icon.svg");
const pngPath = join(BUILD, "icon.png");
const icnsPath = join(BUILD, "icon.icns");
const iconsetPath = join(BUILD, "icon.iconset");

writeFileSync(svgPath, svg);

execSync(`rsvg-convert -w ${CANVAS} -h ${CANVAS} "${svgPath}" -o "${pngPath}"`, {
  stdio: "inherit",
});

if (process.platform === "darwin") {
  rmSync(iconsetPath, { recursive: true, force: true });
  mkdirSync(iconsetPath, { recursive: true });

  const sizes = [16, 32, 128, 256, 512];
  for (const size of sizes) {
    execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${join(iconsetPath, `icon_${size}x${size}.png`)}"`, {
      stdio: "inherit",
    });
    const retina = size * 2;
    execSync(
      `rsvg-convert -w ${retina} -h ${retina} "${svgPath}" -o "${join(iconsetPath, `icon_${size}x${size}@2x.png`)}"`,
      { stdio: "inherit" },
    );
  }

  execSync(`iconutil -c icns "${iconsetPath}" -o "${icnsPath}"`, { stdio: "inherit" });
  rmSync(iconsetPath, { recursive: true, force: true });
}

console.log(`Generated ${svgPath}`);
console.log(`Generated ${pngPath}`);
if (process.platform === "darwin") console.log(`Generated ${icnsPath}`);
