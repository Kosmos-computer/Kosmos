# Mobile sideload guide

Install Arco OS on **Android phones** and **Chromebooks** without the Play Store. Branch: `prototype/mobile-sideload`.

The mobile shell is a **Capacitor WebView** around the shared Arco UI. It does **not** run the Node backend on the device — your Mac/PC or a hosted server runs `npm run dev` / `npm start`.

**Fresh APK ≠ fresh Arco instance** unless you use a **bundled APK** (`npm run mobile:bundle`) and connect to a **new** server (empty `ARCO_DATA_DIR`). Dev sideload (`MOBILE_DEV=1`) loads UI from your Mac and shares Mac `data/`.

**Bundled APK (recommended):** UI ships in the app; you enter the server URL at first run (no default host). Switch servers in **Settings → Server** without reinstalling.

```bash
npm run mobile:bundle
CHROMEBOOK_IP=10.0.0.47 npm run mobile:chromebook:install
```

**Dev sideload** (Mac Vite, shared backend):

```bash
MOBILE_DEV=1 CAP_SERVER_URL=https://YOUR_MAC_IP:4610 CHROMEBOOK_IP=… npm run mobile:chromebook:install
npm run dev:chromebook   # keep running
```

See [`mobile-chromebook-local-backend.md`](mobile-chromebook-local-backend.md) for cloud / Tailscale / Linux-on-Chromebook plans.

---

## Before you start

### On your build machine (Mac/PC)

```bash
git checkout prototype/mobile-sideload
npm install --ignore-scripts
brew install android-platform-tools   # adb
brew install openjdk@21               # Gradle (Capacitor Android needs Java 21)
```

First-time Android project:

```bash
npm run mobile:setup
```

### Find your Mac’s LAN IP

```bash
ipconfig getifaddr en0    # Wi‑Fi on Mac
```

Example: `10.0.0.12`. Use this as `YOUR_MAC_IP` below.

### Start the backend (required for dev installs)

| Command | Use when |
|---------|----------|
| `npm run dev` | Local browser, USB phone (`adb reverse`) |
| `npm run dev:chromebook` | Chromebook browser, APK download, Chromebook ADB — **HTTPS on LAN** |

`dev:chromebook` serves `https://YOUR_MAC_IP:4610` (self-signed cert). Devices on the same Wi‑Fi must accept the certificate once.

---

## Choose your path

| Situation | Recommended method | Section |
|-----------|-------------------|---------|
| **Independent client (any server)** | **Bundled APK** + enter URL at first run | [I](#i-bundled-apk--server-profiles) |
| Chromebook, no APK needed | Browser / PWA install | [A](#a-chromebook-browser--pwa-no-apk) |
| Chromebook, sideload APK | ADB from Mac (bundled default) | [F](#f-chromebook-adb-from-mac-over-wi‑fi) |
| Chromebook, download in browser | HTTPS download page (ZIP) | [E](#e-chromebook-download-apkzip-in-browser) |
| Chromebook, local backend | Linux in Crostini + bundled APK | [mobile-chromebook-local-backend.md](mobile-chromebook-local-backend.md) |
| Android phone, USB cable | `npm run mobile:install` (bundled) or `mobile:install:dev` | [B](#b-android-phone-usb) |
| Android phone, bundled APK | `npm run mobile:bundle` + transfer APK | [I](#i-bundled-apk--server-profiles) |
| Android emulator on Mac | Android Studio / emulator | [D](#d-android-emulator) |
| Dev against Mac Vite | `MOBILE_DEV=1` sideload | [J](#j-dev-sideload-mac-vite) |
| Managed / school Chromebook | Browser PWA only | [A](#a-chromebook-browser--pwa-no-apk) |

---

## A. Chromebook — browser / PWA (no APK)

**Best for:** any Chromebook, school devices, no Developer Mode, no ADB.

1. On Mac:
   ```bash
   npm run dev:chromebook
   ```
2. On Chromebook (same Wi‑Fi), open Chrome:
   ```
   https://YOUR_MAC_IP:4610
   ```
3. Certificate warning → **Advanced → Proceed to YOUR_MAC_IP**
4. Chrome menu **⋮** → **Install app** / **Add to shelf**

Arco runs like a native app. Keep `dev:chromebook` running on the Mac.

---

## Enable Developer options on Android (phones)

**Best for:** first-time USB sideload when **Developer options** is not visible in Settings.

Developer options is hidden until you unlock it. Steps below work on stock Android and Motorola (e.g. Razr 2024); other OEMs use the same **Build number** tap.

### 1. Unlock Developer options

1. Open **Settings**
2. Scroll down and tap **About phone**
3. Find **Build number** (near the bottom)
4. Tap **Build number** **7 times** quickly
5. Enter your PIN/pattern if prompted
6. Confirm the toast: **You are now a developer!**

**Can’t find Build number?** Use the search bar at the top of Settings and type `build number`.

### 2. Open Developer options

Go back to **Settings**, then either:

- Search for `developer`, or
- **System → Developer options**

On some phones (including Motorola): **Settings → System → Advanced → Developer options**.

### 3. Enable USB debugging

Inside **Developer options**:

1. Turn **Developer options** ON (toggle at the top)
2. Scroll to **USB debugging** → turn it ON
3. Tap **Allow** on the confirmation dialog

### 4. Set USB mode (Mac must see the phone in `adb`)

1. Connect the phone to your Mac with a data-capable USB cable
2. Pull down the notification shade
3. Tap the **USB** / **Charging this device via USB** notification
4. Choose **File transfer** (or **Transfer files**) — not **Charging only**
5. When **Allow USB debugging?** appears → tap **Allow** (optional: **Always allow from this computer**)

Verify on Mac:

```bash
adb devices
# should show your phone as "device" (not empty, not "unauthorized")
```

| `adb devices` | Action |
|---------------|--------|
| empty list | Enable USB debugging; set USB to File transfer; try another cable/port |
| `unauthorized` | Unlock phone; accept **Allow USB debugging** prompt |
| `device` | Ready — run `npm run mobile:install` |

---

## B. Android phone — USB

**Best for:** personal phone — bundled APK with server profiles (same as Chromebook), or dev sideload against Mac Vite.

### Bundled (recommended)

1. Phone: **USB debugging** ON (see [Enable Developer options](#enable-developer-options-on-android-phones))
2. Connect USB → accept **Allow USB debugging**
3. On Mac:
   ```bash
   npm run mobile:install
   ```
4. Open **Arco OS** → **Connect to Arco** → enter server URL or **Find on this network**, then sign in.

Switch servers later in **Settings → Server** without reinstalling.

### Dev sideload (Mac Vite)

1. Phone: USB debugging ON, connect USB
2. On Mac:
   ```bash
   npm run dev              # terminal 1
   npm run mobile:install:dev   # terminal 2
   ```
3. Open **Arco OS** on the phone

`mobile:install:dev` uses **`adb reverse`** — the phone hits `127.0.0.1:4610` on your Mac through the cable (no LAN IP needed). No server profile UI in this mode.

Reinstall after changes:

```bash
npm run mobile:install:dev
# faster: SKIP_BUILD=1 MOBILE_DEV=1 npm run mobile:install
```

---

## C. Android phone — Wi‑Fi only

**Best for:** no USB cable, same Wi‑Fi as Mac.

1. On Mac:
   ```bash
   npm run dev:chromebook
   npm run mobile:apk
   ```
2. Transfer `public/downloads/arco-os-mobile.apk` to the phone (AirDrop, Drive, email)
3. On phone, open the APK → allow **Install unknown apps** for Files/Drive
4. Open **Arco OS**

Or rebuild/sync with explicit server URL before `mobile:apk`:

```bash
CAP_SERVER_URL=https://YOUR_MAC_IP:4610 npm run mobile:sync
# then gradle + copy — or use npm run mobile:apk
```

---

## D. Android emulator

1. ```bash
   npm run mobile:setup
   npm run dev                   # terminal 1
   npm run mobile:dev:android    # terminal 2 — opens Android Studio
   ```
2. Run on an emulator in Android Studio

Emulator uses `http://10.0.2.2:4610` → host Vite (set via `CAP_SERVER_URL` in `mobile:sync` defaults).

---

## E. Chromebook — download APK/ZIP in browser

**Best for:** sideload without Mac ADB, when ADB debugging is hard to enable.

Chrome **blocks `.apk` downloads** from HTTP and often from self-signed HTTPS. Use the **ZIP workaround**:

1. Mac: `npm run dev:chromebook`
2. Chromebook Chrome:
   ```
   https://YOUR_MAC_IP:4610/mobile-install.html
   ```
3. Accept certificate warning
4. Tap **Download ZIP (Chromebook — recommended)**
5. **Files → Downloads** → rename `arco-os-mobile.zip` → `arco-os-mobile.apk`
6. Tap the `.apk` to install

**If Chrome says “turn on Developer Mode”:** tapping APK in Files often requires Developer Mode (factory reset). **Do not use that path** — use [F](#f-chromebook-adb-from-mac-over-wi‑fi) or [A](#a-chromebook-browser--pwa-no-apk) instead.

---

## F. Chromebook — ADB from Mac over Wi‑Fi

**Best for:** installed Android app icon without Developer Mode (after **ADB debugging** is enabled).

### One-time on Chromebook

1. Finish **Linux** setup (Settings → search “Linux”)
2. **Settings → Linux development environment → Develop Android apps**
3. Turn on **Enable ADB debugging** → **Restart** → **Confirm**

If **Develop Android apps** is missing: your device may not support it (managed/school Chromebook, older model) → use [A](#a-chromebook-browser--pwa-no-apk).

### Install from Mac (bundled — default)

```bash
CHROMEBOOK_IP=10.0.0.47 npm run mobile:chromebook:install
```

Uses `npm run mobile:bundle` — UI in APK, **no Mac dev server required** after install. First open → enter your server URL.

### Install from Mac (dev — Mac Vite)

```bash
npm run dev:chromebook          # terminal 1 — keep running
MOBILE_DEV=1 CAP_SERVER_URL=https://YOUR_MAC_IP:4610 \
  CHROMEBOOK_IP=10.0.0.47 npm run mobile:chromebook:install   # terminal 2
```

   Or manually (dev):
   ```bash
   npm run dev:chromebook
   adb connect CHROMEBOOK_IP:5555    # e.g. adb connect 10.0.0.47:5555
   # Accept "Allow USB debugging?" on Chromebook → check Always allow
   CAP_SERVER_URL=https://YOUR_MAC_IP:4610 npm run mobile:sync
   export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
   cd apps/mobile/android && ./gradlew assembleDebug
   adb -s CHROMEBOOK_IP:5555 install -r app/build/outputs/apk/debug/app-debug.apk
   ```

2. Open **Arco OS** on the Chromebook

Find Chromebook IP: **Settings → Network → Wi‑Fi → your network → IP address**, or check `adb devices` after connect.

### ADB status meanings

| `adb devices` | Action |
|---------------|--------|
| `unauthorized` | Look at Chromebook screen → tap **Allow** |
| `device` | Ready — run install |
| `Connection refused` | ADB debugging off, or wrong IP |
| empty | Wrong IP, or not on same Wi‑Fi |

---

## G. Chromebook — ADB from Linux terminal

**Best for:** installing without Mac ADB, after ADB debugging is on.

Run in the Chromebook **Terminal** app (Linux), not on Mac:

```bash
sudo apt update && sudo apt install -y android-tools-adb
adb connect 100.115.92.2:5555
# Allow on Chromebook when prompted
adb install arco-os-mobile.apk
# if needed: adb -s emulator-5554 install arco-os-mobile.apk
```

Put the APK in **Linux files** (drag from Downloads in Files app).

---

## I. Bundled APK + server profiles

**Best for:** production-like installs; Coolify, Tailscale Mac, LAN, or Chromebook Linux — **without** rebuilding the APK to change server.

### Build

```bash
npm run mobile:bundle
# → public/downloads/arco-os-mobile-bundled.apk
```

Install via ADB, Chromebook Wi‑Fi install, or file transfer.

### First run

1. Open **Arco OS** — **Connect to Arco** screen (no pre-filled URL).
2. Enter server root URL, e.g. `https://your-coolify-domain`, `https://macbook.tailnet.ts.net:4600`, `http://10.0.0.12:4600`.
3. Optional label → **Test & connect**.
4. Or tap **Find on this network** to scan your Wi‑Fi subnet, LAN, and (on Chromebook) the Linux bridge.
5. Complete login or setup wizard **on that server** (each server has its own data).

### Switch servers later

**Settings → Server** — add profiles, **Switch**, or **Find on network**. App reloads; sign in again on the new instance.

### Server requirements

- Reachable `/api/auth/status` from the device
- HTTPS hosts: `ARCO_SECURE_COOKIES=1` on server
- Cross-origin: CORS enabled (included in `server/cors.ts` — redeploy hosted servers after pulling this change)

---

## J. Dev sideload (Mac Vite)

**Best for:** development — UI loads from Mac; shares Mac `data/users.json`.

```bash
npm run dev:chromebook
MOBILE_DEV=1 CAP_SERVER_URL=https://YOUR_MAC_IP:4610 CHROMEBOOK_IP=… npm run mobile:chromebook:install
```

No server profile UI in this mode (same-origin Vite proxy). Blank WebView with HTTPS? Debug APK includes self-signed cert bypass; or use `npm run dev:mobile` + `http://` URL.

---

## H. Production / hosted backend (legacy build-time URL)

Prefer [bundled APK + server profiles (I)](#i-bundled-apk--server-profiles) instead of baking URL at build time.

**Legacy:** hardcode API at sync time:

```bash
VITE_ARCO_SHELL_PROFILE=mobile \
VITE_ARCO_API_URL=https://your-arco-server.example \
npm run build:mobile

CAP_SERVER_URL=https://your-arco-server.example npm run mobile:sync
npm run mobile:apk
```

---

## Build commands reference

| Command | What it does |
|---------|----------------|
| `npm run mobile:setup` | First-time Capacitor + `android/` project |
| `npm run mobile:bundle` | **Bundled APK** — UI in app, server at first run |
| `npm run mobile:install` | USB phone (bundled): build + install + server profiles at first run |
| `npm run mobile:install:dev` | USB phone (dev): build + `adb reverse` + install |
| `npm run mobile:chromebook:install` | Chromebook Wi‑Fi ADB (bundled by default) |
| `npm run mobile:apk` | Dev APK → `public/downloads/` (Vite URL when synced) |
| `npm run mobile:icons` | Regenerate launcher icons (adaptive safe zone) |
| `npm run mobile:sync` | Copy web build into Android project |
| `npm run dev:chromebook` | HTTPS Vite on LAN + backend (dev) |
| `npm run dev:mobile` | HTTP Vite on LAN + backend (dev alt) |

### Environment variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `MOBILE_DEV` | `1` | Phone/Chromebook install loads from Mac Vite (not bundled) |
| `MOBILE_BUNDLED` | `1` | Force bundled build in install scripts |
| `CAP_SERVER_URL` | `https://10.0.0.12:4610` | Dev: WebView entry URL at `mobile:sync` |
| `CHROMEBOOK_IP` | `10.0.0.47` | Wi‑Fi ADB target for `mobile:chromebook:install` |
| `VITE_ARCO_MOBILE_BUNDLED` | `1` | In `.env.mobile` — first-run server picker |
| `VITE_ARCO_SHELL_PROFILE` | `mobile` / `desktop` | Force MobileShell vs Desktop |
| `SKIP_BUILD` | `1` | Skip Vite rebuild in `mobile:install` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Insecure download blocked** | Use `https://` not `http://`; run `npm run dev:chromebook`; download **ZIP** not APK |
| **No certificate warning** | Close old tabs; open fresh `https://YOUR_MAC_IP:4610/mobile-install.html` |
| **Developer Mode required** (tap APK in Files) | Don’t use Files tap — use [F](#f-chromebook-adb-from-mac-over-wi‑fi) or [A](#a-chromebook-browser--pwa-no-apk) |
| **`adb not found`** | `brew install android-platform-tools` |
| **`adb devices` empty** (phone plugged in) | [Enable Developer options](#enable-developer-options-on-android-phones) — USB debugging + **File transfer** mode |
| **`unauthorized`** | Accept RSA prompt on device |
| **`Connection refused` :5555** | Enable ADB debugging; same Wi‑Fi; retry after reboot |
| **Gradle Java error** | `export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home` |
| **Blank app after install (dev HTTPS)** | Use bundled APK, or `MOBILE_DEV=1` + running `dev:chromebook`, or `dev:mobile` + HTTP |
| **Webpage not available** (USB dev) | Mac Vite must match APK URL: `npm run dev` → `http://127.0.0.1:4610`; `npm run dev:chromebook` → `https://127.0.0.1:4610`. Re-run `npm run mobile:install` (auto-detects) or set `CAP_SERVER_URL` |
| **No setup wizard on “fresh” APK** | Dev sideload uses Mac `data/` — use bundled APK + empty server, or clear server data |
| **Can't connect to server** | Test URL in browser; redeploy server with CORS; HTTPS needs `ARCO_SECURE_COOKIES=1` |
| **Wrong launcher icon (circle)** | `npm run mobile:icons` then rebuild APK |
| **Switch server** | Settings → Server (bundled APK only) |
| **Chromebook can’t reach Mac** | Mac firewall off or allow Node; verify `https://YOUR_MAC_IP:4610` in Chrome first |
| **School/work Chromebook** | ADB/Linux often blocked → [A](#a-chromebook-browser--pwa-no-apk) only |
| **Linux `xdg-open` fails** | Don’t use Linux terminal to open browser — use Chrome directly |

---

## Wider layout on Chromebook (desktop shell)

```bash
VITE_ARCO_SHELL_PROFILE=desktop npm run build:mobile
CAP_SERVER_URL=https://YOUR_MAC_IP:4610 npm run mobile:sync
npm run mobile:chromebook:install
```

---

## Related docs

- [`apps/mobile/README.md`](../apps/mobile/README.md) — Capacitor project + server profiles
- [`docs/mobile-chromebook-local-backend.md`](mobile-chromebook-local-backend.md) — Linux backend, Tailscale, distribution plan
- [`docs/multi-platform-prototype.md`](multi-platform-prototype.md) — platform bridge architecture
- [`deploy/coolify/README.md`](../deploy/coolify/README.md) — hosted server deploy
- [`README.md`](../README.md) — all platforms (Electron, SteamOS, etc.)
