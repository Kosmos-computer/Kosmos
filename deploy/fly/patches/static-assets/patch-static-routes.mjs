/**
 * Surgical patch for older tenant `server/index.ts` images.
 *
 * Dist-patch ships a new shell that loads `/wallpapers/*.jpg` (and
 * `/downloads/*`) from Vite's public/ copy in dist/. Older runtimes only
 * mounted `/assets/*` + `/locales/*` before the SPA catch-all, so those
 * URLs returned index.html and looked like broken/missing images.
 */
import fs from "node:fs";

const target = process.argv[2];
if (!target) {
  console.error("usage: patch-static-routes.mjs <path-to-server-index.ts>");
  process.exit(1);
}

const src = fs.readFileSync(target, "utf8");
if (src.includes('app.use("/wallpapers/*"')) {
  console.log(`[patch-static-routes] already patched: ${target}`);
  process.exit(0);
}

const anchor = '  app.use("/locales/*", serveStatic({ root: shellDistRoot }));\n';
if (!src.includes(anchor)) {
  console.error(`[patch-static-routes] anchor not found in ${target}`);
  process.exit(1);
}

const insert =
  anchor +
  '  app.use("/wallpapers/*", serveStatic({ root: shellDistRoot }));\n' +
  '  app.use("/downloads/*", serveStatic({ root: shellDistRoot }));\n';

fs.writeFileSync(target, src.replace(anchor, insert));
console.log(`[patch-static-routes] added /wallpapers + /downloads static routes in ${target}`);
