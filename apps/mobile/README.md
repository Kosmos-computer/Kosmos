# Arco OS — Capacitor mobile shell

Android/iOS WebView wrap around the shared Arco Vite UI (`MobileShell`).

| Doc | Contents |
|-----|----------|
| [`docs/mobile-sideload.md`](../../docs/mobile-sideload.md) | All install paths (USB, ADB, PWA, emulator) |
| [`docs/mobile-chromebook-local-backend.md`](../../docs/mobile-chromebook-local-backend.md) | Cloud / Tailscale / Linux-on-Chromebook architecture |

---

## Two APK modes

| Mode | Build | Server | Switch URL without reinstall? |
|------|-------|--------|------------------------------|
| **Bundled (recommended)** | `npm run mobile:bundle` | User enters URL at first run | Yes — **Settings → Server** |
| **Dev sideload** | `MOBILE_DEV=1` + `CAP_SERVER_URL=…` | Mac Vite `:4610` + Mac `data/` | No — rebuild/resync |

Bundled APK ships the UI inside the app (`VITE_ARCO_MOBILE_BUNDLED=1`). **No default server host** — you type Coolify domain, Tailscale URL, LAN IP, etc. at first run.

---

## Quick reference

| Goal | Command |
|------|---------|
| First-time Android project | `npm run mobile:setup` |
| **Bundled APK** (production-like) | `npm run mobile:bundle` |
| Install on Chromebook (Wi‑Fi ADB) | `CHROMEBOOK_IP=… npm run mobile:chromebook:install` |
| Dev Chromebook sideload | `MOBILE_DEV=1 CAP_SERVER_URL=https://MAC:4610 CHROMEBOOK_IP=… npm run mobile:chromebook:install` |
| Android phone USB dev | `npm run dev` + `npm run mobile:install` |
| Chromebook PWA (no APK) | `npm run dev:chromebook` → open `https://MAC:4610` in Chrome |
| Dev APK download page | `npm run dev:chromebook` → `/mobile-install.html` |
| Dev APK file only | `npm run mobile:apk` |
| Regenerate launcher icons | `npm run mobile:icons` |
| Emulator | `npm run dev` + `npm run mobile:dev:android` |

### Prerequisites (build machine)

```bash
brew install android-platform-tools   # adb
brew install openjdk@21               # Gradle (Java 25 fails Capacitor compile)
npm run mobile:setup                  # first time
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
```

---

## Server profiles (bundled APK)

1. **First run** — Connect to Arco modal: enter server URL, optional label, **Test & connect**.
2. **Find on this network** — scans LAN subnets, common home IPs, and Chromebook Linux bridge (`http://100.115.92.2:4600`).
3. **Settings → Server** — add/switch/remove profiles; switching reloads the app (separate login per server).

**Example server URLs:**

| Backend | URL |
|---------|-----|
| Coolify / VPS | `https://your-domain.example` |
| Home Mac + Tailscale | `https://macbook.your-tailnet.ts.net:4600` |
| Same Wi‑Fi LAN | `http://10.0.0.12:4600` |
| Chromebook Linux | `http://100.115.92.2:4600` |

Hosted servers need `ARCO_SECURE_COOKIES=1` and the repo’s CORS middleware (`server/cors.ts`).

---

## Build outputs

| Artifact | Path |
|----------|------|
| Bundled APK | `public/downloads/arco-os-mobile-bundled.apk` |
| Dev APK (Vite URL baked in) | `public/downloads/arco-os-mobile.apk` |
| Gradle debug APK | `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` |

---

## Architecture

| Piece | Role |
|-------|------|
| `../../dist` | Shared Vite build (bundled into APK or loaded from dev server) |
| `@arco/platform-bridge` | Capacitor → `kind: mobile` → `MobileShell` |
| `src/os/server/serverProfileStore.ts` | Saved server URLs + active profile |
| `CAP_SERVER_URL` | Dev only — WebView loads Mac Vite (omit for bundled) |
| `VITE_ARCO_MOBILE_BUNDLED` | Set in `.env.mobile` — enables first-run server picker |

See [`docs/multi-platform-prototype.md`](../../docs/multi-platform-prototype.md).
