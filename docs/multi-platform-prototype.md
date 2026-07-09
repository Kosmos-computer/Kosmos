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

Point the shell at a hosted Arco server instead of localhost:

```bash
# Build with remote API
VITE_ARCO_API_URL=https://your-arco-server.example npm run build

# Or at runtime via Tauri env
ARCO_API_URL=https://your-arco-server.example npm run tauri:dev
```

Relative `/api/*`, `/apps/*`, and `/app-sdk.js` requests are prefixed with `apiBase`.

## Android / iOS (Capacitor — recommended for mobile wrap)

**Best path for Android:** `apps/mobile` Capacitor shell — loads shared `dist/`, forces `MobileShell`, dev server on emulator via `10.0.2.2:4610`.

```bash
npm install --ignore-scripts
npm run mobile:setup          # first time — builds + adds android/
npm run dev                   # terminal 1
npm run mobile:dev:android    # terminal 2 — sync + open Android Studio
```

Physical device: `CAP_SERVER_URL=http://YOUR_LAN_IP:4610 npm run mobile:sync`

See `apps/mobile/README.md`.

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
