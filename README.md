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
| `npm run menubar-tasks:auth` | Mint a session token for the macOS menu bar tasks app |
| `npm run menubar-tasks` | Build and open the menu bar tasks app (macOS 13+) |
| `npm run models` | Launch the Arco Models manager (Tauri) |
| `npm run typecheck` | Typecheck client and server configs |
| `npm run generate` | Regenerate prompts/schema after upgrading OpenUI packages |
