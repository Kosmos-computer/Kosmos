# Mobile sideload prototype

First installable Android build of Arco OS — sideload to **Android phones** and **Chromebooks** (with Play Store / Android app support). No Play Store required.

## One-time setup (your Mac)

```bash
brew install android-platform-tools   # adb
npm install --ignore-scripts
```

**Phone or Chromebook:** Settings → Developer options → **USB debugging** ON.

Connect USB → accept the fingerprint prompt.

## Install from your machine

```bash
git checkout prototype/mobile-sideload
npm run mobile:setup      # first time only
npm run mobile:install    # build APK + adb install
```

## Run

```bash
npm run dev               # terminal 1 — backend :4600 + UI :4610 on your Mac
```

Open **Arco OS** on the device. USB dev uses `adb reverse` — the app talks to your Mac over the cable.

## Reinstall after changes

```bash
npm run mobile:install
# or skip vite rebuild:
SKIP_BUILD=1 npm run mobile:install
```

## Chromebook

| Method | Steps |
|--------|--------|
| **Android app (same APK)** | USB debugging ON → `npm run mobile:install` |
| **Browser (any Chromebook)** | `npm run dev` → open `http://YOUR_MAC_IP:4610` in Chrome → Install app |

Wider screen on Chromebook? Rebuild with desktop shell:

```bash
VITE_ARCO_SHELL_PROFILE=desktop npm run build:mobile
npm run mobile:install
```

## Production / no USB dev server

Point at a hosted backend when building:

```bash
VITE_ARCO_SHELL_PROFILE=mobile \
VITE_ARCO_API_URL=https://your-arco-server.example \
npm run build:mobile

SKIP_BUILD=1 npm run mobile:install
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `adb not found` | `brew install android-platform-tools` |
| `no device` | USB debugging, accept RSA prompt, try `adb devices` |
| Gradle Java error | Use **JDK 17** in Android Studio settings |
| Blank app | Is `npm run dev` running on your Mac? |
| Chromebook can't reach Mac | Use browser + LAN IP instead of USB |

See also: `apps/mobile/README.md`, `docs/multi-platform-prototype.md`.
