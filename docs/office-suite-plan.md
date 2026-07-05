# Office Suite Build-Out Plan (Docs, Sheets, Slides, Drive)

> Working notes for building the office suite as Tier-3 platform apps.
> Written 2026-07-05. Companion to `app-platform-plan.md` (the authoritative
> platform roadmap — this doc is the suite-specific execution plan).
>
> **If you are the agent building the Joplin/Notion notes clone: read the
> "Coordination with the notes clone" section first.** The key asks are
> (1) build on `os.files@1` instead of private storage, and (2) put your
> rich-text editor in a shared `packages/editor-kit/` package so Docs can
> reuse it.

## TLDR

Build in this order: **Files service + `os.files@1` contract → Drive →
Docs → Sheets → Slides.** Drive is a thin UI over an OS-owned file store
that everything else depends on. The load-bearing decision: **documents
live in the OS file store as typed JSON files, not inside each app's
private SQLite** — that keeps apps swappable, lets apps share data, and
makes documents agent-writable. Each app ships as a bundled Tier-3 app
(`apps/<name>/`) like Calendar, with a build step added for real editor
engines.

## Current platform state (verified 2026-07-05)

- Phase 1 of the app platform is **shipped**: manifest (`shared/manifest.ts`),
  installed-app registry (`server/platform/installedAppStore.ts`), grant
  store, `POST /api/bridge` with `x-app-token`, `AppHost` iframe host,
  zero-dep `packages/app-sdk/` (`createAppClient()` → `intents`, `storage`,
  `shell.notify`, `theme`).
- **Only one Tier-3 app exists**: `core.calendar` at `apps/calendar/` —
  no-build vanilla ES modules, styled with `--os-*` tokens, all data via
  `os.calendar@1` intents. It is the reference implementation.
- **Only one capability contract exists**: `os.calendar@1`
  (`shared/capabilities/calendar.ts`), backed by
  `server/services/calendarService.ts` (SQLite).
- Bundled apps are seeded from `./apps/*/manifest.json` on boot by
  `ensureSeeds()`; served at `/apps/<folder>/`; opened as
  `{ type: "installed", appId }` windows (Dock only, not NavRail).
- Storage today: agent workspace (`/api/files`, raw paths under
  `data/workspace/`), per-app SQLite namespaces (`storage:own` →
  `app_<appId>`), system service SQLite (calendar). **No shared virtual
  file store exists yet.** No IndexedDB anywhere.
- No rich-text, grid, or canvas engines exist in the repo. Monaco is in
  Studio (code editing only). OpenUI declarative apps are Tier-1 and
  explicitly *not* the vehicle for office apps (per `app-platform-plan.md`:
  "Core suite apps that need real engines — Docs, Sheets, Mail — are
  independent Tier-3 code apps").
- Installed-app windows are **opaque to the agent cursor** — the agent must
  operate suite apps through contract intents/tools, never the DOM.
- Platform boundary is brand-free: contract ids `os.*`, core app ids
  `core.*`, theme tokens `--os-*`. Keep that discipline in everything below.

## Step 0 — Platform prerequisites (before any suite app)

### 0.1 `os.files@1` contract + files service

The foundation for the entire suite. Follow the calendar pattern exactly:

- `shared/capabilities/files.ts` — types + JSON schemas for intents and
  events. Suggested surface (keep it minimal; first-draft contracts are
  always wrong, per the platform plan):
  - `files.list` (by parent folder), `files.get`, `files.search`
  - `files.create` (file or folder), `files.move`, `files.rename`,
    `files.trash`, `files.restore`, `files.delete`
  - `files.content.read`, `files.content.write`
  - Metadata entity: `{ id, name, parentId, mimeType, size, createdAt,
    updatedAt, starred, trashed }`
  - Event topics: `files.changed` (create/update/move/trash) over the
    existing `server/bus.ts` bus, surfaced per app window via SSE
- `server/services/filesService.ts` — SQLite-backed canonical store
  (metadata in SQLite, content as blobs in SQLite or files on disk under
  `data/`), the *system provider* for `os.files@1`.
- Register in the capability/intent registry alongside `os.calendar@1` so
  grants + audit work through the existing bridge choke point.

**Document typing convention:** office documents are files with typed JSON
content and dedicated mime types:

- Docs: `application/x-os-doc+json`
- Sheets: `application/x-os-sheet+json`
- Slides: `application/x-os-slides+json`
- Notes (notion clone): same store, its own type if needed

This is what makes the file store the interoperability layer: Drive lists
everything, each editor app registers for its type(s), the agent reads and
writes documents as structured JSON through `files.content.*` intents.

### 0.2 Build pipeline for Tier-3 bundles

Calendar is no-build vanilla JS; that won't carry TipTap or a spreadsheet
engine. Add a convention:

- `apps/<name>/src/` + per-app Vite config → build to `apps/<name>/dist/`
- `manifest.json` stays at the app root (so `ensureSeeds()` is untouched);
  `entry: { kind: "bundle", path: "<name>/dist" }` or keep `index.html` at
  the root referencing built assets — whichever is less invasive to the
  static server.
- Root `package.json` scripts: `build:apps` running each app build;
  dev-mode alternative is `entry.kind: "url"` pointing at a per-app Vite
  dev server.

### 0.3 Shared app UI kit — `packages/app-ui/`

Drive/Docs/Sheets/Slides all need the same toolbar, menus, dialogs,
list/grid primitives, styled against `--os-*` tokens (the SDK forwards
them; see `apps/calendar/styles.css` for the pattern). Build once for
Drive, reuse three times. Pick one framework for suite apps (React, since
the build step exists anyway and the shell team knows it) — but keep it
*inside the iframe*; the platform boundary is still SDK + postMessage.

## Stage 1 — Drive (`core.drive`)

Pure client of `os.files@1` — no engine, no private storage. Validates the
files contract end to end.

- Views: list + grid, folder navigation/breadcrumbs, rename/move/trash/
  restore, search, starred.
- "Open with…": resolve a file's mime type to the app implementing the
  matching contract via the default-provider registry
  (`server/capabilities/registry.ts`). Opening a doc file opens
  `core.docs` with that file id (suggested convention: pass target file id
  as a launch param — needs a small window-open param plumb-through in
  `windowStore` / `AppHost`, or an intent the editor app polls on ready).
- Permissions: `{ kind: "contract", id: "os.files@1", access: "read" }`,
  `write`, `{ kind: "shell", features: ["notify"] }`.
- **Exit criterion:** a file created by the agent through the bridge
  appears in Drive live (event bus), and Drive operations round-trip.

## Stage 2 — Docs (`core.docs`)

- **Engine: TipTap (ProseMirror, MIT).** Mature, extensible, JSON-native
  document model, Yjs-compatible later if collaboration ever matters
  (don't build CRDT now — single-user local OS).
- **Shared editor package:** extract the rich-text editor into
  `packages/editor-kit/` consumed by BOTH the notes clone and Docs. Two
  ProseMirror integrations in one codebase would be a maintenance mistake.
- Document format: TipTap JSON stored via `files.content.write` as
  `application/x-os-doc+json`. Images stored as sibling files in the file
  store, referenced by file id.
- Contract `os.docs@1` stays thin — `docs.create`, `docs.open`,
  `docs.export` — because content travels through `os.files@1`. Publish
  the document JSON schema in `shared/capabilities/` so the agent can
  author/edit docs directly.
- v1 scope: headings, lists, bold/italic/code, links, images, tables.
  Explicitly out: comments, revision history, realtime collab.
- **Exit criterion:** create, edit, close, reopen a formatted document;
  the file is visible and openable from Drive; the agent can create a doc
  via intents.

## Stage 3 — Sheets (`core.sheets`)

Engine trade-offs (decide at build time, wrap whichever choice behind our
own document format so it's swappable):

| Option | License | Trade-off |
| --- | --- | --- |
| **Fortune-sheet** (Luckysheet successor) | MIT | Complete UI + formula engine; fastest path; opinionated, moderate maintenance |
| HyperFormula (engine only) | **GPLv3** | Best formula engine; license is a problem if this ever ships non-GPL |
| Univer | Apache-2.0 | Full office framework (sheets/docs/slides) but heavy; fights our theming and per-contract architecture |
| Own grid (e.g. Glide Data Grid, MIT) + own formula parser | MIT | Most control, most work |

**Recommendation: Fortune-sheet** for the prototype. Store as
`application/x-os-sheet+json` (our schema, converted at the engine
boundary — do not persist the engine's native format directly).

- Contract `os.sheets@1`: thin like docs, plus one agent-critical intent:
  **`sheets.query`** — read a range as structured data so agent workflows
  consume spreadsheet data without touching the opaque iframe. Consider
  `sheets.write_range` as the write twin.
- **Exit criterion:** formulas recalculate; file round-trips through
  Drive; agent reads a range via intent.

## Stage 4 — Slides (`core.slides`)

No good MIT off-the-shelf slide editor exists (tldraw has a watermark
license; Univer slides are immature). Build custom — smaller than it
sounds:

- Deck = ordered list of slides; slide = absolutely-positioned boxes
  (text / image / shape) on a fixed-ratio canvas. **DOM-based, not
  `<canvas>`** — accessible, themeable, cheap.
- Text boxes reuse `packages/editor-kit/` (TipTap) — this is why Slides
  goes last: it inherits the editor and UI-kit maturity from Docs/Sheets.
- v1 scope: box editing, drag/resize, slide-sorter rail, present mode
  (fullscreen + arrow keys), a few layout templates. Stored as
  `application/x-os-slides+json`.
- **Exit criterion:** build and present a deck; text boxes use editor-kit;
  deck opens from Drive.

## Coordination with the notes clone (Joplin/Notion agent)

1. **Storage:** build notes on `os.files@1` (once it lands), NOT on
   `storage:own` private SQLite. Notes should be visible in Drive and
   readable/writable by the agent through the same contract as everything
   else. If you need note-specific indexes (links graph, tags), a private
   SQLite index *derived from* file-store content is fine — the file store
   stays canonical.
2. **Editor:** put the rich-text editor in `packages/editor-kit/`
   (TipTap-based), designed for reuse: exported as a framework component +
   plain JSON document schema, no notes-specific concepts baked into the
   core (page links / tags live in extensions layered on top).
3. **Scope split (recommended):** Notes and Docs stay **separate apps** on
   one editor package and one file store — notes = quick capture + linked
   pages; docs = standalone formatted documents. Revisit if they converge.
4. **App shape:** follow the same Tier-3 conventions as this plan —
   `apps/<name>/` bundle, manifest permissions via contracts, `--os-*`
   theming, no private shell APIs.

## Cross-cutting: agent integration

Suite windows are opaque to the agent cursor, so **contracts are the
agent's only good surface.** As each contract lands, expose its intents as
agent tools (platform plan Phase 3). Design every document format to be
agent-writable: clean, versioned JSON schemas published in
`shared/capabilities/`. The agent authoring and editing documents is the
point of building this suite in Arco rather than pointing at Google Docs.

## Sequencing summary

| Stage | Work | Done when |
| --- | --- | --- |
| 0 | `os.files@1` + filesService; app build pipeline; `packages/app-ui/` | Contract callable via bridge with grants + audit |
| 1 | Drive | Agent-created file appears live in Drive; open/rename/move/trash work |
| 2 | `packages/editor-kit/` (shared with notes clone) + Docs | Formatted doc round-trips; openable from Drive; agent-creatable |
| 3 | Sheets (Fortune-sheet) | Formulas recalc; agent reads a range via `sheets.query` |
| 4 | Slides | Deck builds + presents; text boxes use editor-kit |

## Open questions / risks

- **Launch params:** opening a specific file in an editor app needs a way
  to pass a file id at window open — small plumb-through in
  `windowStore`/`AppHost`, or a "pending open" intent. Decide in Stage 1.
- **Blob storage:** SQLite blobs vs. on-disk files under `data/` for file
  content — decide in Stage 0 (on-disk is simpler for large media).
- **Contract minimalism:** keep `os.docs/sheets/slides@1` thin; the
  content schema, versioned separately, does the heavy lifting. First-draft
  contracts are always wrong — don't over-specify before a second consumer
  exists.
- **Fortune-sheet lock-in:** mitigated by converting to our own persisted
  schema at the boundary, but the conversion layer is real work — budget
  for it.
- **Per-app build step** changes the "no-build bundle" simplicity of the
  calendar reference app — document the new convention when it lands so
  future apps (and agents) follow it.
