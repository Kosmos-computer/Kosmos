#!/usr/bin/env node
/**
 * Export the sprite mark library to JSON for tools/sprite-mark-lab.html.
 * Run: npm run sprite-mark:sync
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);

// tsx registers TypeScript — import the library exporter directly.
const { exportSpriteMarkLibraryJson } = await import(
  join(root, "src/components/sprite-mark/library.ts")
);

const json = exportSpriteMarkLibraryJson();
const outPath = join(root, "tools/sprite-mark-library.json");
writeFileSync(outPath, `${JSON.stringify(json, null, 2)}\n`);
console.log(`Wrote ${outPath} (${json.patterns.length} patterns, ${json.sequences.length} sequences)`);
