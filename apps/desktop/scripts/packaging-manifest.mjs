/** Shared list of paths required inside the bundled arco runtime (pack-staging/arco or .app/Contents/Resources/arco). */

export const COPY_PATHS = [
  "dist",
  "server",
  "shared",
  "packages",
  "skills",
  "package.json",
  "package-lock.json",
];

export const APP_DIRS = ["calculator", "calendar", "docs", "drive", "menubar-tasks"];

/** Paths that must exist after staging — relative to the arco runtime root. */
export const RUNTIME_REQUIRED = [
  { id: "ui", path: "dist/index.html", hint: "Run npm run build from the repo root." },
  { id: "docs", path: "apps/docs/dist/index.html", hint: "Run npm run build:apps." },
  { id: "server", path: "server/index.ts", hint: "Server sources missing from stage." },
  { id: "app_prompt", path: "server/generated/app-prompt.md", hint: "Run npm run generate." },
  { id: "chat_prompt", path: "server/generated/chat-prompt.md", hint: "Run npm run generate." },
  { id: "openui_schema", path: "server/generated/openui-schema.json", hint: "Run npm run generate." },
  { id: "scripts_lib", path: "scripts/lib/installChecks.ts", hint: "scripts/lib not staged." },
  { id: "tsx", path: "node_modules/tsx/dist/cli.mjs", hint: "tsx missing — rerun stage-packaging." },
  { id: "esbuild", path: "node_modules/esbuild/package.json", hint: "esbuild missing — rerun stage-packaging." },
  { id: "hono", path: "node_modules/hono/package.json", hint: "Production deps missing — npm ci failed during staging." },
  { id: "sqlite_pkg", path: "node_modules/better-sqlite3/package.json", hint: "better-sqlite3 missing from staged node_modules." },
];

/** Platform-specific esbuild native binary package (installed as optional dep of esbuild). */
export function esbuildPlatformPackage(platform = process.platform, arch = process.arch) {
  const map = {
    "darwin-arm64": "@esbuild/darwin-arm64",
    "darwin-x64": "@esbuild/darwin-x64",
    "linux-arm64": "@esbuild/linux-arm64",
    "linux-x64": "@esbuild/linux-x64",
    "win32-x64": "@esbuild/win32-x64",
    "win32-arm64": "@esbuild/win32-arm64",
    "win32-ia32": "@esbuild/win32-ia32",
  };
  return map[`${platform}-${arch}`] ?? null;
}

/** Known locations for a compiled better-sqlite3 native addon. */
export function findSqliteNative(root, fs, path) {
  const candidates = [
    "node_modules/better-sqlite3/build/Release/better_sqlite3.node",
    "node_modules/better-sqlite3/build/better_sqlite3.node",
  ];
  for (const relative of candidates) {
    const full = path.join(root, relative);
    if (fs.existsSync(full)) return relative;
  }
  return null;
}
