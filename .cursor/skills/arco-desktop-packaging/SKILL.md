---
name: arco-desktop-packaging
description: Build, verify, and debug the Arco OS Electron desktop app (dmg/zip). Use when packaging the desktop app, fixing installable build crashes, missing bundled files, native module errors, or backend port conflicts on launch.
---

# Arco Desktop Packaging

## When to use

- User asks to build/install/test the Electron desktop app
- Packaged app crashes on open ("backend stopped unexpectedly")
- Missing `dist/`, `node_modules`, or native libs in the bundle
- Verifying a release before shipping

## Build pipeline (always follow in order)

```bash
# Full release (generate prompts, UI build, stage, verify, dmg+zip)
npm run dist:desktop

# Unpacked .app only (faster iteration)
npm run pack -w @arco/desktop
```

Pipeline steps (automated in scripts):

1. `validate-packaging.mjs` — repo build outputs exist
2. `stage-packaging.mjs` — copy runtime into `apps/desktop/pack-staging/arco` (electron-builder ignores gitignored `dist/` and `node_modules/`)
3. `verify-packaging.mjs` — file tree + smoke test (boot backend on free port)
4. `electron-builder` — produce `.app`, `.dmg`, `.zip`

## Verification commands

```bash
# Staged bundle: files + smoke test
npm run verify:desktop

# Built .app after packaging
npm run verify:desktop:app
```

**Always run verify after fixing packaging bugs.** The smoke test catches issues file checks miss (SQLite load failures, import errors, bind errors).

## Common failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Backend exit code 1, port 4600 busy | Dev server (`npm run dev`) already on :4600 | Desktop app auto-picks next free port via `resolveServerPort()` in `apps/desktop/src/serverProcess.ts`. Rebuild shell if fix not in bundle. |
| Missing `dist/` in bundle | electron-builder respects `.gitignore` | Must stage via `stage-packaging.mjs`; never bundle directly from repo root |
| `@esbuild/darwin-arm64` not found | esbuild optional dep missing | Stage script runs `npm install tsx esbuild` |
| `better_sqlite3.node` not found | Native module not rebuilt for Electron | Stage script runs `electron-rebuild -w better-sqlite3` |
| 404 in window, backend OK | UI not in bundle | Confirm `pack-staging/arco/dist/index.html` exists before electron-builder |

## Key paths

| Path | Purpose |
|------|---------|
| `apps/desktop/scripts/stage-packaging.mjs` | Assemble runtime bundle |
| `apps/desktop/scripts/verify-packaging.mjs` | Verify + smoke test |
| `apps/desktop/scripts/packaging-manifest.mjs` | Required file list |
| `apps/desktop/pack-staging/arco/` | Staged runtime (input to electron-builder) |
| `apps/desktop/release/mac-arm64/Arco OS.app` | Unpacked macOS app |
| `apps/desktop/release/*.dmg` | Installer |

## Debug a crash

1. Run `npm run verify:desktop` — if smoke test fails, fix staging before rebuilding electron shell
2. Check port conflict: `lsof -i :4600`
3. Manual server boot from bundle:
   ```bash
   APP="apps/desktop/release/mac-arm64/Arco OS.app"
   ARCO="$APP/Contents/Resources/arco"
   cd "$ARCO" && ELECTRON_RUN_AS_NODE=1 PORT=4700 ARCO_PACKAGED=1 NODE_ENV=production \
     "$APP/Contents/MacOS/Arco OS" node_modules/tsx/dist/cli.mjs server/index.ts
   ```
4. Rebuild electron shell only (after TS changes, skip restage if pack-staging unchanged):
   ```bash
   npm run build -w @arco/desktop && cd apps/desktop && npx electron-builder --dir
   ```

## Launch for user testing

```bash
open "apps/desktop/release/mac-arm64/Arco OS.app"
# or install from dmg:
open "apps/desktop/release/Arco OS-0.1.0-arm64.dmg"
```

## Local models (llama-server)

Packaged app data: `~/Library/Application Support/@arco/desktop/data/`  
GGUF store (shared with dev): `~/Library/Application Support/arco-models/models/`

**Requires:** `llama-server` on PATH or at `/opt/homebrew/bin/llama-server` (`brew install llama.cpp`)

```bash
# Configure settings + verify GGUFs + warm-start llama-server
npm run setup:desktop:local-models

# Then relaunch Arco OS (backend starts llama on :4650 when agent.chat uses a local model)
open "apps/desktop/release/mac-arm64/Arco OS.app"
```

Verify llama is up: `curl http://127.0.0.1:4650/health`

Packaged backend gets `ARCO_LLAMA_SERVER` and Homebrew `PATH` via `serverProcess.ts`.

## Deferred: production macOS signing (not needed while testing)

**Status (Paul): internal testing only — unsigned CI builds are fine for now.** Revisit before shipping to anyone outside the team or relying on auto-update in the wild.

Unsigned macOS builds work for local/internal testing (Right-click → Open, or allow in System Settings). For production releases, Gatekeeper and auto-update install need **signed + notarized** builds.

When ready, add these **GitHub repo secrets** (requires Apple Developer Program ~$99/yr + Developer ID `.p12`):

| Secret | Purpose |
|--------|---------|
| `DESKTOP_CSC_LINK` | Base64-encoded Developer ID Application `.p12` |
| `DESKTOP_CSC_KEY_PASSWORD` | `.p12` password |
| `DESKTOP_APPLE_ID` | Apple ID email |
| `DESKTOP_APPLE_APP_PASSWORD` | App-specific password from appleid.apple.com |
| `DESKTOP_APPLE_TEAM_ID` | Team ID from developer.apple.com → Membership |

CI already passes these to `electron-builder` (see `.github/workflows/publish-desktop.yml` and `apps/desktop/scripts/verify-signing-config.mjs`). No code changes needed — just add the secrets and the next release will be signed.

## Do not

- Bundle from repo root `extraResources` without staging (gitignore drops `dist/`, `node_modules/`)
- Skip `verify-packaging.mjs --smoke` before shipping
- Use `npmRebuild: true` without fixing monorepo postinstall conflicts (use staged `node_modules` instead)
- Edit `package.json` version fields directly — use `npm run version:sync` (see `arco-versioning` skill)
