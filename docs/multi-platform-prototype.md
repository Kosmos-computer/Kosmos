# Multi-platform prototype

Branch `prototype/multi-platform` adds a **Tauri shell** alongside the existing **Electron** desktop app, with shared UI and a unified platform bridge.

## Architecture

```
packages/platform-bridge/   Shared types + Electron/Tauri/web detection
src/                          Shared React OS (Desktop + MobileShell)
server/                       Hono backend (unchanged)
apps/desktop/                 Electron — embedded Node backend (production desktop)
apps/tauri/                   Tauri — cross-platform shell prototype
```

| Shell | Platforms | Backend |
|-------|-----------|---------|
| Electron | macOS, Windows, Linux | Embedded Node (`ELECTRON_RUN_AS_NODE`) |
| Tauri (prototype) | macOS, Windows, Linux, iOS, Android | Local dev server or remote API |
| Web browser | Any | Local dev server |

## Quick start — Tauri desktop (macOS)

**Prerequisites:** Rust toolchain (`rustup`), Tauri CLI deps ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)).

```bash
# Install new workspace deps (once)
npm install

# Backend + web + Tauri shell
npm run tauri:dev:all
```

This runs:

1. Hono server on `:4600`
2. Vite dev server on `:4610` (proxies `/api` → server)
3. Tauri window loading `http://127.0.0.1:4610`

## Test MobileShell in Tauri desktop

Force the mobile chrome profile without resizing the window:

```bash
VITE_ARCO_SHELL_PROFILE=mobile npm run tauri:dev:all
```

## Remote backend (mobile install prototype)

**Bundled Capacitor APK (preferred):** `npm run mobile:bundle` — user enters server URL at first run; switch in **Settings → Server**. See `docs/mobile-sideload.md` § I.

**Build-time / Tauri runtime URL:**

```bash
VITE_ARCO_API_URL=https://your-arco-server.example npm run build
ARCO_API_URL=https://your-arco-server.example npm run tauri:dev
```

**Dev sideload:** `CAP_SERVER_URL=http://YOUR_LAN_IP:4610 npm run mobile:sync` (Mac Vite proxy).

Relative `/api/*`, `/apps/*`, and `/app-sdk.js` requests are prefixed with `apiBase` when using bundled + server profiles.

## Android / iOS (Capacitor — recommended for mobile wrap)

**Best path for Android:** `apps/mobile` — bundled APK or dev sideload.

```bash
npm install --ignore-scripts
npm run mobile:setup          # first time — builds + adds android/
npm run mobile:bundle         # UI in APK; server URL at first run
npm run dev                   # terminal 1 (dev)
npm run mobile:dev:android    # terminal 2 — sync + open Android Studio
```

See `apps/mobile/README.md` and `docs/mobile-chromebook-local-backend.md`.

## Android / iOS (Tauri — alternative)

Mobile targets are scaffolded but require platform SDK setup:

```bash
cd apps/tauri
npm run android:init   # once — needs Android Studio
npm run ios:init       # once — needs Xcode

# With server + web running:
npm run android:dev
npm run ios:dev
```

On iOS/Android, Tauri reports `kind: mobile` → the shell mounts **MobileShell** automatically.

## Platform bridge

UI code should use:

- `getPlatformBridge()` — shell kind, OS, API base
- `isArcoDesktop()` / `getArcoDesktop()` — Electron window chrome (unchanged API)
- `useShellProfile()` — Desktop vs MobileShell selection

Detection order: **Electron preload** → **Tauri invoke** → **web stub**.

## What's not in this prototype

- Node sidecar for offline Tauri desktop (Electron still owns embedded backend)
- Tauri app icons / store signing (bundle disabled for fast iteration)
- Capacitor shell (Tauri chosen to align with `model-manager`)
- Full mobile native integrations (notifications, secure storage plugins)

## Files added

| Path | Purpose |
|------|---------|
| `packages/platform-bridge/` | Cross-platform contracts + bridge resolution |
| `apps/tauri/` | Tauri 2 shell loading root `dist/` |
| `src/os/bootstrapPlatformShell.ts` | Boot-time platform flags + API interceptor |
| `src/os/useShellProfile.ts` | Platform-aware shell selection |
| `docs/multi-platform-prototype.md` | This doc |

## Env vars

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_ARCO_API_URL` | Vite build | Remote API origin |
| `VITE_ARCO_SHELL_PROFILE` | `desktop` \| `mobile` \| `auto` | Force shell chrome |
| `ARCO_API_URL` | Tauri runtime | Overrides API base from Rust |
