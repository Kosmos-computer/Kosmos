# Arco on Android — embedded local backend (prototype)

Full Arco stack on the phone: **Capacitor UI + nodejs-mobile sidecar** running the same Hono backend as desktop. This is separate from the **thin client** APK (`npm run mobile:install`) that connects to a remote server.

Play Store policy is out of scope for this prototype — sideload to a Razr or other arm64 device over USB.

## Two APK flavors

| Flavor | App id | Install | Launcher name |
|--------|--------|---------|---------------|
| **Thin client** | `com.arco.os.mobile` | `npm run mobile:install` | **Arco Connect** |
| **Local (embedded Node)** | `com.arco.os.mobile.local` | `npm run mobile:local:install` | **Arco Local** |

Both share the same React UI; local builds set `VITE_ARCO_MOBILE_LOCAL=1` and ship `dist/nodejs/` inside the APK.

## Prerequisites (Mac build machine)

```bash
brew install android-platform-tools openjdk@21
npm run mobile:setup    # first time
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
```

**For Razr / arm64 devices:** rebuild `better-sqlite3` for nodejs-mobile during staging:

```bash
# Android Studio → SDK Manager → NDK, or:
export ANDROID_NDK_HOME="$HOME/Library/Android/sdk/ndk/$(ls "$HOME/Library/Android/sdk/ndk" | tail -1)"
```

Without NDK, staging falls back to host `npm rebuild` (works on Mac only — **will not run on device**).

## Install on Motorola Razr (USB)

1. Enable [Developer options + USB debugging](mobile-sideload.md#enable-developer-options-on-android-phones)
2. Connect USB → **File transfer** → accept RSA prompt
3. On Mac:

```bash
export ANDROID_NDK_HOME=…   # recommended for Razr
npm run mobile:local:install
```

4. Open **Arco Local** on the phone (launcher icon label — not **Arco Connect**)
5. First boot shows “Starting Arco on this device…” while the sidecar boots (can take ~1 minute)
6. Complete the normal Arco **setup wizard** — data lives in app sandbox storage

APK artifact: `public/downloads/arco-os-mobile-local.apk`

## Architecture

```
┌─────────────────────────────────────┐
│  Capacitor WebView (React UI)       │
│  boot → http://127.0.0.1:4600       │
└──────────────┬──────────────────────┘
               │ same device
┌──────────────▼──────────────────────┐
│  nodejs-mobile (CapacitorNodeJS)    │
│  main.mjs → server-boot.mjs         │
│  Hono :4600 + dist/ + SQLite        │
│  ARCO_DATA_DIR = getDataPath()/arco  │
└─────────────────────────────────────┘
```

Staging mirrors desktop Electron bundling (`scripts/mobile-local-stage.mjs`):

- `server/`, `shared/`, `packages/`, `dist/`, bundled apps, production `node_modules`
- esbuild bundle of `server/index.ts` → `server-boot.mjs`
- `better-sqlite3` rebuilt for **android arm64** when NDK is set

## Known prototype limits

| Area | Limit |
|------|--------|
| **child_process** | nodejs-mobile restricts spawning — agent ACP/Codex subprocesses and `/api/exec` may fail |
| **APK size** | Large (~150MB+) due to Node runtime + deps |
| **Node version** | nodejs-mobile ships Node 18 LTS (not Node 22) |
| **Background** | Sidecar runs with app; OS may kill under memory pressure |
| **Local LLM** | No bundled llama/Ollama on phone yet |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run build:mobile:local` | UI build with local-shell flag |
| `node scripts/mobile-local-stage.mjs` | Stage `dist/nodejs/` sidecar |
| `npm run mobile:local:bundle` | Full local APK → `public/downloads/` |
| `npm run mobile:local:install` | USB build + install |
| `SKIP_BUILD=1 npm run mobile:local:install` | Reinstall existing APK |

## See also

- [`apps/mobile/README.md`](../apps/mobile/README.md) — thin client + local overview
- [`docs/mobile-sideload.md`](mobile-sideload.md) — USB debugging, thin client install
- [`docs/mobile-chromebook-local-backend.md`](mobile-chromebook-local-backend.md) — Crostini local backend (Chromebook)
