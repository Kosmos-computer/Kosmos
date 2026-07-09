# Arco OS — Capacitor mobile shell

Android/iOS WebView wrap around the shared Arco Vite UI (`MobileShell`).

## Prerequisites

- **Android Studio** (SDK + emulator) or a physical device with USB debugging
- **JDK 17** for Gradle (Java 21+ may fail — set `JAVA_HOME` to JDK 17 in Android Studio)
- Arco backend running on your dev machine (`npm run dev`)

## Quick start (USB — directly from your machine)

Best for sideloading without the Play Store or Wi‑Fi config.

**One-time:**
```bash
brew install android-platform-tools   # adb
npm run mobile:setup                  # if android/ not created yet
```

**Phone:** Enable Developer options → USB debugging → connect USB → accept fingerprint.

**Install from Mac:**
```bash
npm run mobile:install
```

**Run:**
```bash
npm run dev        # terminal 1 — backend :4600 + Vite :4610
# open "Arco OS" on the phone
```

`mobile:install` uses **`adb reverse`** so the phone's `127.0.0.1:4610` tunnels to your Mac — no LAN IP needed.

Reinstall after code changes:
```bash
npm run mobile:install
# or faster: SKIP_BUILD=1 npm run mobile:install
```

## Quick start (Android emulator)

From repo root:

```bash
npm install --ignore-scripts
npm run mobile:setup          # build mobile bundle + add Android project (first time)
npm run dev                   # terminal 1 — backend :4600 + Vite :4610
npm run mobile:dev:android    # terminal 2 — sync + open Android Studio
```

In Android Studio: pick an emulator → Run.

The emulator loads `http://10.0.2.2:4610` (host Vite). Vite proxies `/api` → `:4600`.

## Physical device (same Wi‑Fi)

```bash
# Find your machine IP, e.g. 192.168.1.42
CAP_SERVER_URL=http://192.168.1.42:4610 npm run mobile:sync
npm run mobile:open:android
```

Ensure the device can reach ports 4610 and 4600 on your machine.

## Offline / static bundle (remote API)

```bash
VITE_ARCO_SHELL_PROFILE=mobile \
VITE_ARCO_API_URL=https://your-arco-server.example \
npm run build:mobile

npm run mobile:sync
npm run mobile:open:android
```

## Architecture

| Piece | Role |
|-------|------|
| `../../dist` | Shared Vite build (same as Electron/Tauri) |
| `@arco/platform-bridge` | Detects Capacitor → `kind: mobile` → `MobileShell` |
| `VITE_ARCO_API_URL` | Remote backend when not using Vite dev proxy |

See [multi-platform prototype guide](../../docs/multi-platform-prototype.md).
