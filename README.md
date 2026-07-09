# Arco OS

A generative AI operating system prototype. A desktop shell in the browser where an agent builds live, adaptive apps on demand — combining a windowed OS experience, a generative UI pipeline, and coding/automation agent capabilities.

![screenshot](docs/screenshot.png)

## What it does

- **Desktop shell** — draggable/resizable windows, menu bar, dock, notifications, light/dark themes, persisted window layouts. Small viewports automatically switch to a full-screen mobile shell.
- **Agent chat** — a streaming chat agent with visual tool-call cards. Ask it to build apps, run shell commands, manage files, query databases, or schedule automations.
- **Generative apps** — the agent writes apps in OpenUI Lang (a small declarative UI DSL). Apps are persisted with version history, appear in the dock, and render live data via direct tool calls (no LLM round-trip).
- **Adaptive UIs** — every generated app reflows to its container: row layouts stack in narrow windows, charts resize fluidly, and the same app works from a phone-width panel to a full display. Driven by `ResizeObserver` + container-size attributes + CSS overrides.
- **Coding tools** — sandboxed workspace with `exec`, file read/write/list, and an in-OS Terminal and Files app.
- **Databases** — namespaced SQLite databases usable by both the agent and generated apps.
- **Automations** — cron-scheduled agent runs with prompts, run history, and an Automations manager app.
- **Accounts & locking** — boot splash → login flow, session auth on every API route, role-based permissions (owner/admin/member/viewer), manual + idle lock screen, and in-app account management.
- **OS-owned PIM data** — Calendar (`os.calendar@1`), Tasks (`os.tasks@1`), and Drive/Docs/Sheets (`os.files@1` / `os.docs@1` / `os.sheets@1`) share canonical SQLite stores. Any app or the agent reads and writes the same data — swap the UI without losing state.
- **Tasks** — full Tasks app (list, drawer, due dates, assignees, history) backed by the system store. The agent has `tasks_list`, `tasks_create`, `tasks_update`, `tasks_complete`, `tasks_archive`, and `tasks_delete` tools.
- **Menu bar tasks (macOS)** — native Swift companion app (`apps/menubar-tasks/`) lives in the status bar for quick capture. Tasks sync instantly with Arco and the agent. Build with `npm run menubar-tasks`; authenticate once with `npm run menubar-tasks:auth`.
- **Model hub** — Models app and server-side registry assign models to use-case slots (agent, voice, image, plus custom slots you define). Supports cloud presets, Ollama, and local `llama-server` engines managed by the registry.
- **Memory & world model** — Memory app includes a world-model explorer prototype (entities, relations, ethics/worldview seeds). Ships with the `integral-ethics` agent skill and identity docs under `memory/identity/`.
- **Studio** — coding workspace with file browser, git diffs, integrated terminal, live browser preview, and model selection wired to the hub.
- **Agent extensibility** — dynamic tool registry with per-tool policy (auto / confirm / deny), MCP client (connect external servers) and outward MCP server (expose Arco intents to other agents), installable skills, and ACP/Cursor agent backends.
- **Desktop app** — Electron wrapper bundles the server + UI into a native macOS/Windows app. Dev: `npm run desktop:dev:all`. Production build: `npm run dist:desktop`.
- **Localization** — UI copy in five languages (en, es, de, ja, zh-CN), selectable in Settings. See [`docs/i18n.md`](docs/i18n.md) for patterns, scripts, and translation status.

## Quick start

Requires **Node 22+** (see `.nvmrc`). On a fresh clone:

```bash
npm install        # installs deps; postinstall runs a lightweight readiness check
npm run setup      # seeds .env + data/, generates prompts, builds bundled apps
npm run dev        # starts API server (:4600) + Vite dev server (:4610)
```

Open http://localhost:4610.

`npm run setup:check` prints the same readiness report without modifying anything — useful in CI or after a partial install.

### macOS menu bar tasks

Quick-capture tasks from the status bar without opening Arco:

```bash
npm run dev:server              # keep the API running
npm run menubar-tasks:auth      # once per machine (writes a session token)
npm run menubar-tasks           # builds ArcoMenubarTasks.app and opens it
```

Look for the **checklist icon** in the menu bar (it may be under the `>>` overflow). Tasks sync with the Tasks app and the agent via `os.tasks@1`. See `apps/menubar-tasks/README.md` for details.

### First run: install wizard

On first load Arco shows a boot splash, then an **install wizard**: choose how models run (mock, cloud, local, or Ollama), optionally connect a cloud API key, and create the **owner** account (username + password, 8+ characters). Settings from the wizard are saved to `data/settings.json`. There's no email — accounts are local to your Arco data dir.

If machine setup is incomplete, the welcome step lists what's missing and asks you to run `npm run setup` from the repo root, then refresh.

To start over, stop the server and delete `data/users.json` and `data/auth-sessions.json`.

## Installation by platform

Arco is one codebase with several **shells** (wrappers). The backend and apps live in this repo; some experiences are separate distribution layers.

| Platform | Shell | Backend | Best for |
| --- | --- | --- | --- |
| **Browser** | Vite dev / production build | Local or hosted | Development, any device with Chrome |
| **macOS / Windows / Linux** | Electron (`apps/desktop`) | Embedded Node | Primary desktop app |
| **Android phone** | Capacitor (`apps/mobile`) | User-chosen server (bundled APK) or dev Mac | Sideload APK |
| **Chromebook** | Bundled APK, PWA, or dev sideload | Coolify / Tailscale Mac / LAN / Linux on device | No Play Store needed |
| **SteamOS** | [kosmos-steamos](../kosmos-steamos) (sibling repo) | Arco Hono server | Steam Deck / Steam Machine desktop mode |
| **iOS** | Capacitor (scaffold) | Hosted API | Not packaged yet |

See also: [`docs/mobile-sideload.md`](docs/mobile-sideload.md), [`docs/mobile-chromebook-local-backend.md`](docs/mobile-chromebook-local-backend.md), [`docs/multi-platform-prototype.md`](docs/multi-platform-prototype.md), [`apps/mobile/README.md`](apps/mobile/README.md).

### Browser (development)

Default path — works on any machine with Node 22+:

```bash
npm install
npm run setup
npm run dev
```

Open http://localhost:4610.

For **Chromebook / tablet on your LAN**, bind to the network with HTTPS (required for installs and some Chrome downloads):

```bash
npm run dev:chromebook
```

Then on the device: `https://YOUR_MAC_IP:4610` (accept the self-signed certificate once).

### macOS, Windows, and Linux (desktop app)

Native desktop with embedded backend — no separate Node install for end users.

**Development:**

```bash
npm run desktop:dev:all    # server + web + Electron
```

**Production build:**

```bash
npm run dist:desktop       # macOS: DMG/ZIP; also Windows NSIS, Linux AppImage
```

Install the artifact from `apps/desktop/release/`. See [`apps/desktop/`](apps/desktop/) and [`.cursor/skills/arco-desktop-packaging/SKILL.md`](.cursor/skills/arco-desktop-packaging/SKILL.md) for packaging details.

**macOS menu bar companion** (optional): [`apps/menubar-tasks/README.md`](apps/menubar-tasks/README.md) — quick tasks from the status bar.

### Android phone and Chromebook (mobile shell)

Capacitor WebView around the shared UI (`MobileShell`). **No Play Store required.**

**Full guides:** [`docs/mobile-sideload.md`](docs/mobile-sideload.md) · [`docs/mobile-chromebook-local-backend.md`](docs/mobile-chromebook-local-backend.md) · [`apps/mobile/README.md`](apps/mobile/README.md)

#### Bundled APK (recommended — independent client)

UI ships inside the APK. **You enter the server URL at first run** (no default host). Switch backends in **Settings → Server** without reinstalling.

Each server is a separate Arco instance (own accounts, drive, sessions): Coolify/VPS, home Mac over Tailscale, LAN IP, or Chromebook Linux backend.

**Build machine (one-time):**

```bash
brew install android-platform-tools openjdk@21
npm run mobile:setup          # first time — adds apps/mobile/android/
```

**Build and install:**

```bash
npm run mobile:bundle
# → public/downloads/arco-os-mobile-bundled.apk

npm run mobile:install              # USB Android phone (bundled; server at first run)
CHROMEBOOK_IP=10.0.0.47 npm run mobile:chromebook:install   # Wi‑Fi ADB to Chromebook
# or: adb install -r public/downloads/arco-os-mobile-bundled.apk
```

**First run on device:** Connect to Arco → enter server URL (e.g. `https://your-coolify-domain`, `https://macbook.tailnet.ts.net:4600`, `http://10.0.0.12:4600`) → optional **Find on this network** (detects your Wi‑Fi subnet on Android and Chromebook) → sign in or complete setup wizard on that server.

**Hosted server:** deploy with `ARCO_SECURE_COOKIES=1` and CORS enabled (included in `server/cors.ts`). See [`deploy/coolify/README.md`](deploy/coolify/README.md).

#### Dev sideload (Mac Vite + shared backend)

For development only — app loads UI from your Mac; uses Mac `data/` (not independent).

```bash
npm run dev:chromebook                                              # terminal 1
MOBILE_DEV=1 CAP_SERVER_URL=https://YOUR_MAC_IP:4610 \
  CHROMEBOOK_IP=10.0.0.47 npm run mobile:chromebook:install         # terminal 2
```

USB phone dev:

```bash
npm run dev && npm run mobile:install:dev
```

#### Chromebook install methods

| Method | When to use |
|--------|-------------|
| **Bundled APK** | Production-like; pick any server URL in app |
| **PWA in Chrome** | Easiest; no APK; point browser at a running server |
| **ADB from Mac over Wi‑Fi** | Sideload APK; no Developer Mode |
| **Download ZIP/APK** | From `dev:chromebook` download page |
| **Linux backend on device** | Power users — Arco in Crostini + APK → `http://100.115.92.2:4600` |

**PWA (any Chromebook, same Wi‑Fi as server):**

```bash
npm run dev:chromebook    # or npm start on a reachable host
```

Chrome → `https://YOUR_SERVER:4610` → **Install app**.

**ADB sideload (one-time on Chromebook: Settings → Linux → Develop Android apps → ADB debugging):**

```bash
CHROMEBOOK_IP=10.0.0.47 npm run mobile:chromebook:install
```

**Home Mac as server (Tailscale):** on Mac run `npm run build && ARCO_DATA_DIR=~/arco-home ARCO_SECURE_COOKIES=1 npm start`, expose `:4600` via Tailscale; in the mobile app add `https://your-mac.tailnet-name.ts.net:4600`.

See [`docs/mobile-chromebook-local-backend.md`](docs/mobile-chromebook-local-backend.md) for Linux-on-Chromebook and distribution roadmap.

### Android phone (USB quick reference)

```bash
npm run mobile:install        # Bundled APK — server URL at first run (recommended)
npm run mobile:install:dev    # Dev sideload — USB + adb reverse; run npm run dev on Mac
npm run mobile:apk            # APK only → public/downloads/
npm run mobile:icons          # Regenerate launcher icons from desktop brand mark
```

First-time USB setup (Developer options, USB debugging): [`docs/mobile-sideload.md` § Enable Developer options](docs/mobile-sideload.md#enable-developer-options-on-android-phones).

### SteamOS (Steam Deck / Steam Machine)

Use the sibling **`kosmos-steamos`** repo (distribution layer for SteamOS Desktop Mode — Arco apps via embed, not a fork):

```bash
# kosmos-steamos/ with Arco-Prototype-2 as sibling (see upstream/config.json)
npm install
npm run dev:stack                 # Arco backend + UI + Kosmos shell

# On SteamOS Desktop Mode
npm run build:desktop
./platform/steamos/install.sh --session
```

See `kosmos-steamos/README.md` and `kosmos-steamos/docs/upstream-sync.md` for install and catalog sync.

### Hosted / server-only

Run the API + built UI without a native shell (Docker, VPS, homelab):

```bash
npm run build
npm start                         # serves :4600
```

Or use `Dockerfile` / `Dockerfile.prod`. **Mobile bundled APK:** users enter this host at first run in the app (Settings → Server). Deploy with `ARCO_SECURE_COOKIES=1` for HTTPS. See [`deploy/coolify/README.md`](deploy/coolify/README.md).

### iOS and Tauri (experimental)

| Target | Status | Notes |
| --- | --- | --- |
| **iOS** | Scaffold | `apps/mobile` — `npm run cap -w @arco/mobile add ios` after Xcode setup |
| **Tauri desktop/mobile** | Prototype branch | `apps/tauri` — alternative cross-platform shell; see `docs/multi-platform-prototype.md` |

### Dependencies

| Component | Required? | Notes |
| --- | --- | --- |
| **Node.js 22+** | Yes | `engines` in package.json; use `nvm use` with `.nvmrc` |
| **npm install** | Yes | Compiles `better-sqlite3`; macOS needs Xcode CLT, Linux needs build tools |
| **npm run setup** | Yes (first run) | Copies `.env`, generates prompts, builds bundled apps |
| **LLM API key** | No | Mock provider works offline; add a key in the wizard or Settings |
| **Python 3.11+** | No | For `npm run voice` |
| **Voice venv** | No | `npm run setup -- --with-voice` |
| **Ollama** | No | Local models via Ollama preset |
| **llama-server + Rust** | No | Arco Models local path (`npm run models`) |

### Accounts, roles, and locking

- **Sign in** — password login sets an HttpOnly session cookie (30-day sliding expiry). Passwords are scrypt-hashed; the server stores only session-token digests.
- **Lock** — the lock icon in the menu bar (or 15 minutes of inactivity) locks the session: the API refuses everything until you re-enter your password. Your windows and state survive the lock.
- **Roles** — routes are guarded by capabilities expanded from a role (see `shared/types.ts`):

  | Role | Can |
  | --- | --- |
  | **Owner** | Everything, including managing accounts |
  | **Admin** | Everything except managing accounts |
  | **Member** | Chat, build apps, files, git — no terminal, settings, or accounts |
  | **Viewer** | Read-only file access |

- **Manage accounts** — Settings → Accounts (owners only): add users, change roles, reset passwords, delete. The last owner can't be deleted or demoted. Everyone can change their own password under Settings → Password.
- **Hosting caution** — the agent executes shell commands with the server's authority, so treat any account with chat access as trusted. Before exposing Arco beyond localhost: serve over HTTPS and set `ARCO_SECURE_COOKIES=1`, and run the server in a container/VM. Per-user capability enforcement inside the agent loop is not implemented yet.

### Configuring the LLM

Two options:

1. **Settings app** (in the dock) — pick a provider preset (OpenAI, Anthropic, OpenRouter, Ollama, or custom), paste an API key, choose a model. Stored in `data/settings.json`.
2. **Environment** — copy `.env.example` to `.env` and set `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`.

There is also a built-in `mock` provider (selectable in Settings) that runs a scripted demo turn with no API key — useful for trying the shell offline.

## Architecture

```
scripts/generate-prompts.ts   Generates chat/app prompts + OpenUI schema from @openuidev/react-ui
shared/types.ts               Types shared by client and server
server/
  index.ts                    Hono API server + SSE chat streaming
  auth/                       Accounts (scrypt), sessions, capability middleware, auth routes
  agent/loop.ts               Multi-turn agent loop (LLM → tools → LLM …)
  agent/tools.ts              All agent tools (apps, files, exec, db, automations, os_ui)
  agent/llm.ts                OpenAI-compatible streaming client + mock provider
  lint/lint-openui.ts         Validates generated OpenUI code before saving
  stores/                     Disk persistence: apps (versioned), sessions, automations, SQLite
  automations/scheduler.ts    node-cron scheduling of headless agent runs
src/
  os/                         Desktop shell: window manager, dock, menu bar, mobile shell
  os/auth/                    Boot splash, login/setup/lock screens, auth store + gate
  apps/chat/                  Chat app: streaming, tool cards, inline generative UI
  apps/appview/               Generated-app renderer + AdaptiveSurface (container sizing)
  apps/…                      Apps library, Automations, Files, Terminal, Settings
  styles/                     Design tokens, OS chrome, adaptive reflow rules
data/                         Runtime state (gitignored): apps, sessions, dbs, workspace
```

### Voice (os.voice@1)

A fully-local, full-duplex voice pipeline lives in `voice-server/` (Python +
Pipecat): Silero VAD + Smart Turn v3 for turn-taking and barge-in, Whisper
(MLX) for STT, Kokoro for TTS. The browser side (`src/voice/`) owns a single
echo-cancelled WebRTC session; the swappable face rig (`src/face-rig/`)
animates from the live audio. The mic button in Chat lights up when the voice
server is running.

Setup (once): `cd voice-server && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
(Python 3.11+; first run downloads ~1–2 GB of models). Then `npm run voice`
— or `npm run dev:all` to launch server, web, and voice together.

Every pipeline stage (STT, TTS, turn-taking, and the "brain" — any
OpenAI-compatible endpoint, including the Arco agent itself via
`POST /v1/chat/completions`) is a config slot; see `voice-server/README.md`
for engine swapping.

### How adaptive apps work

1. `AdaptiveSurface` measures each app container with a `ResizeObserver` and sets `data-arco-size="compact" | "medium" | "expanded"`.
2. `src/styles/adaptive.css` overrides OpenUI's inline flex styles per size class — row stacks become columns in compact containers, wrap in medium ones.
3. The app-authoring prompt instructs the model to design vertically stackable groups, lead with key content, and avoid fixed widths, so apps degrade gracefully by construction.

## Scripts

| Command | Description |
| --- | --- |
| `npm run setup` | First-install setup (env, prompts, bundled apps) |
| `npm run setup:check` | Print install readiness without changing files |
| `npm run dev` | Server + web dev servers with hot reload |
| `npm run dev:all` | Server + web + voice server together |
| `npm run voice` | Voice server only (see `voice-server/README.md` for setup) |
| `npm run build` | Production client build to `dist/` |
| `npm start` | Serve the production build + API from one process |
| `npm run desktop` | Build and launch the Electron desktop app |
| `npm run desktop:dev:all` | Server + web + Electron desktop together |
| `npm run dist:desktop` | Build a distributable desktop package (DMG/ZIP on macOS) |
| `npm run dev:chromebook` | Server + HTTPS Vite on LAN (`:4610`) for Chromebook/tablet dev |
| `npm run dev:mobile` | Server + HTTP Vite on LAN (`:4610`) — alternative to HTTPS for WebView |
| `npm run mobile:setup` | First-time Capacitor Android project setup |
| `npm run mobile:bundle` | Bundled APK — UI in app, server URL chosen at first run |
| `npm run mobile:install` | USB phone (bundled): build + install; server profiles at first run |
| `npm run mobile:install:dev` | USB phone (dev): build + `adb reverse` + install against Mac Vite |
| `npm run mobile:chromebook:install` | Install on Chromebook over Wi‑Fi ADB (`CHROMEBOOK_IP=…`; bundled by default) |
| `npm run mobile:apk` | Dev APK + copy to `public/downloads/` (loads from Mac Vite when synced) |
| `npm run mobile:icons` | Regenerate Android launcher icons from desktop brand mark |
| `npm run mobile:sync` | Copy web build into Android project |
| `npm run menubar-tasks:auth` | Mint a session token for the macOS menu bar tasks app |
| `npm run menubar-tasks` | Build and open the menu bar tasks app (macOS 13+) |
| `npm run models` | Launch the Arco Models manager (Tauri) |
| `npm run typecheck` | Typecheck client and server configs |
| `npm run make-i18n` | Regenerate locale bundles and `I18nKey` enum from `translation.json` |
| `npm run check-translation-completeness` | Verify all keys exist in every language; warn on untranslated placeholders |
| `npm run generate` | Regenerate prompts/schema after upgrading OpenUI packages |
