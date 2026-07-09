# Chromebook local backend — distribution plan

Two install paths for Chromebook users, plus remote servers (Mac Tailscale, Coolify).

**See also:** [`README.md`](../README.md) (Installation by platform) · [`docs/mobile-sideload.md`](mobile-sideload.md) · [`apps/mobile/README.md`](../apps/mobile/README.md)

## Modes at a glance

| Mode | Install | Backend | Best for |
|------|---------|---------|----------|
| **A. Bundled APK (store-style)** | Download APK / Play (future) | User-entered URL (cloud, Mac, or Linux) | Most users |
| **B. Sideload + Linux backend** | APK + Linux setup script | Arco on Crostini (`:4600`) | Offline, local models, full apps |
| **C. PWA in Chrome** | Install from server URL | Same as chosen server | Simplest local+remote switch |
| **D. Dev sideload** | `MOBILE_DEV=1 mobile:chromebook:install` | Mac Vite + backend | Development only |

---

## A. App download (bundled APK) — implemented

```bash
npm run mobile:bundle
# → public/downloads/arco-os-mobile-bundled.apk
CHROMEBOOK_IP=… npm run mobile:chromebook:install   # default: bundled
```

**First run:** user enters server URL manually (no default host).  
**Settings → Server:** save/switch profiles, **Find on network** scans LAN + Chromebook Linux bridge.

**Server types:**

- **Coolify / VPS** — `https://your-domain` (`ARCO_SECURE_COOKIES=1`)
- **Home Mac + Tailscale** — `https://macbook.your-tailnet.ts.net:4600`
- **LAN** — `http://10.0.0.x:4600` (same Wi‑Fi)
- **Chromebook Linux** — `http://100.115.92.2:4600` (after B below)

---

## B. Sideload + local Linux backend (power user)

### Goal

Run models, agent workspace, and apps **on the Chromebook** with data in Linux, not on Mac/cloud.

### Phase 1 — Manual (now)

1. Enable **Linux (Crostini)** on Chromebook.
2. In Linux terminal:

```bash
# Prerequisites: Node 22+, git
git clone …/Arco-Prototype-2 && cd Arco-Prototype-2
npm install --ignore-scripts
npm run build
ARCO_DATA_DIR=$HOME/.arco-local npm start
# listens on :4600 inside Linux
```

3. Install **bundled APK** (A).
4. First run → **Find on network** or enter `http://100.115.92.2:4600`.
5. Complete Arco **setup wizard** (fresh `ARCO_DATA_DIR`).

**Android ↔ Linux:** APK runs in Android; server runs in Linux. Use Linux bridge IP (`100.115.92.2`), not `127.0.0.1`.

### Phase 2 — One-click Linux installer (planned)

Ship `scripts/chromebook-linux-install.sh`:

- Install Node 22 via nodesource/nvm
- Optional Docker path (`deploy/coolify/Dockerfile` style) for reproducible backend
- systemd user service `arco-backend.service` (auto-start on Linux boot)
- Print connection URL for APK/PWA

Host script from Coolify or release artifact:

```bash
curl -fsSL https://your-domain/install/chromebook-linux.sh | bash
```

### Phase 3 — In-app “Run on this Chromebook” wizard (planned)

Settings → Server → **Set up local backend**:

1. Detect Linux available
2. Show copy-paste or `curl | bash` for install script
3. Poll `100.115.92.2:4600/api/auth/status` until up
4. Auto-add **local-linux** profile

### Phase 4 — Local models on Chromebook (planned)

- Ollama in Linux + Arco `llm.provider=ollama`
- Optional `llama.cpp` / Arco local engine where ARM/x86 allows
- Heavier than cloud; target Celeron i3+ / 8GB+ RAM

---

## C. PWA path (simplest local)

1. Run backend in Linux (`npm start`).
2. Chrome → `http://127.0.0.1:4600` (Chrome↔Linux port forward).
3. **Install app** from Chrome menu.

Same server profiles can apply in browser via future PWA localStorage parity.

---

## D. Mac as home server (Tailscale)

On Mac:

```bash
npm run build
ARCO_DATA_DIR=~/arco-home ARCO_SECURE_COOKIES=1 npm start
# expose via Tailscale Serve or Funnel on :4600
```

On Chromebook APK:

- Add profile: `https://<mac-hostname>.<tailnet>.ts.net:4600`
- **Find on network** may discover LAN IP when at home; Tailscale URL works away from home

**Planned:** read Tailscale MagicDNS hints from a small helper or document common hostname pattern in the connect modal.

---

## Technical requirements (done / todo)

| Item | Status |
|------|--------|
| Bundled UI in APK (`VITE_ARCO_MOBILE_BUNDLED`) | Done |
| Server profiles (localStorage) | Done |
| First-run connect modal (manual URL, no default) | Done |
| Network scan (LAN + Linux bridge) | Done |
| Settings → Server | Done |
| CORS + credentials on server | Done |
| `npm run mobile:bundle` | Done |
| Chromebook Linux install script | Planned |
| In-app local backend wizard | Planned |
| `@capacitor/network` for smarter subnet scan | Planned |
| mDNS / Bonjour discovery | Planned |

---

## Recommended rollout

1. **Ship bundled APK** to testers; each enters their Coolify or Tailscale URL.
2. **Document Linux manual setup** (Phase 1) for power users.
3. **Add `chromebook-linux-install.sh`** (Phase 2).
4. **In-app wizard** when Linux detected (Phase 3).

See also: [`mobile-sideload.md`](mobile-sideload.md), [`deploy/coolify/README.md`](../deploy/coolify/README.md).
