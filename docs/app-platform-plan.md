# App Platform Plan

How Arco becomes an OS that third parties (and we, and the agent) can extend
with apps — calendar, mail, docs, sheets, and whatever comes next — such that
apps:

- **(a)** can live outside the shell's runtime (separate repos, separate processes),
- **(b)** talk to each other, and the agent can create, modify, and operate them
  under a permission model,
- **(c)** are swappable: any conforming implementation can replace a core app,
- **(d)** are shareable: people or bots can distribute them.

> Lineage: this plan folds in the original concept docs from the UI Experiments
> repo — `DESIGN-SYSTEM-SPEC.md` (trust tiers §10.7, logic ladder D9, security
> D10, portability §10.8) and `Project-planning.md` (entity store, one agent
> runtime). Arco-Prototype-2 is the fresh build of that thinking; what carries
> over are the architecture decisions, not the OpenClaw-era mechanics.

## Design principles

1. **Contracts over implementations.** The OS defines versioned capability
   contracts (`os.calendar@1`). Apps declare which they implement. Nothing —
   not other apps, not the agent — ever binds to a specific app; they bind to
   "the current calendar provider." Swapping is repointing a registry entry.
   (Model: Android intents/default apps, not VS Code's flat API.)
2. **One choke point.** Every privileged call from any app or the agent flows
   through a single typed bridge with a caller identity attached. Permissions,
   audit, and rate limiting live there and nowhere else. The AI is never the
   security boundary (D10): the model emits requests; deterministic code
   validates and executes them.
3. **The tier determines the execution container, not the integration
   surface.** Every app — declarative or full code, ours or third-party —
   carries the same manifest, identity, grants, contracts, intents, tool
   contributions, and event bus. Only the runtime and the trust/review cost
   differ by tier.
4. **OS owns PIM data.** Calendar events, contacts, mail, files are system
   data services (like EventKit / content providers). Apps — however beefy —
   are clients of those stores. This is what makes swapping lossless and
   cross-app data sharing sane.
5. **No private shell APIs.** Core apps use the same SDK, manifest, and bridge
   as third-party apps — just preinstalled and pre-granted. Whatever Mail
   needs from the shell, a third-party mail app gets too. The moment core apps
   get a privileged side channel, swappability and the third-party story die.
6. **Typed intents on the wire, never natural language** between system
   components (inference-economy design center). Intent dispatch is
   deterministic; the model is only in the loop when judgment is required.
7. **The platform boundary is brand-free.** Anything a third-party app binds
   to — manifest ids, contract ids, the SDK, the wire protocol, headers,
   grant keys — carries no product name, so the product can be renamed
   without breaking installed apps. Contracts are `os.*` (`os.calendar@1`),
   core app ids are `core.*` (`core.calendar`), the bridge header is
   `x-app-token`, the SDK is `app-sdk` served at `/app-sdk.js`, and theme
   tokens cross into apps as `--os-*`. Shell internals (CSS variables,
   localStorage keys) may stay branded — they're one grep away from a rename;
   the boundary is not.

## The app spectrum

Apps are categorized by **how they come to exist and how much executes** —
power, trust cost, and review cost scale together along one axis
(spec §10.7 trust tiers + D9 logic ladder):

| Category | What it is | How the AI makes/changes it | Trust & review | In Arco today |
| --- | --- | --- | --- | --- |
| **Inline generated UI** | Ephemeral OpenUI in a chat message | Streams it per turn | Schema validation | Shipped (chat) |
| **Declarative apps (Tier 1–2)** | Persisted OpenUI/manifest data: blocks, `$state`, SQL bindings, declared **action intents** | `app_create` / `app_update` — small data patches, versioned | Nothing executes (T1); intents capability-scoped (T2); automated review; fully themed | Shipped as Tier 1 (`StoredApp`); Tier 2 = the gap |
| **Declarative + WASM functions (L3)** | Tier 2 plus small named functions run in a WASM host with manifest-declared capabilities | Agent writes the function; manifest declares its grants | Capability audit, not code audit | Future (post-v1) |
| **Independent code apps (Tier 3)** | Real codebases: own repo, build, release cycle. Run sandboxed (iframe now; headless process optional) and integrate via the SDK | Human-built, **or** agent-built via Studio (`exec`/`write_file` scaffolds a project and registers it) | Sandboxed + badged; grants at install; heaviest review for sharing | `WebAppSurface` is the embryo |

**Where things land:** the AI-generated long tail (trackers, dashboards,
utilities) defaults to declarative — cheap to refine, share, review, theme.
**Core suite apps that need real engines — Docs, Sheets, Mail — are
independent Tier-3 code apps**, first-class citizens, not an escape hatch.
Calendar can start as a modest code app too; its value lives in the system
data service either way.

**The honest trade at Tier 3:** the agent refines code in Studio rather than
patching a manifest, and theming becomes opt-in — the shell forwards its
design tokens into app frames as `--os-*` custom properties and the SDK
exposes a theme hook, but an app that ignores them is allowed to; it just
reads as external.

## Intents and contracts — one vocabulary, two views

Two granularities, one permission system (they compose; don't build two
parallel vocabularies):

- **Capability contracts** (`os.calendar@1`) are the *provider-side*
  grouping: what an app `implements`, what the default-provider registry
  points at, the unit of swappability.
- **Action intents** (`calendar.event.create`) are the *caller-side* units:
  what gets granted, confirmed, and audited. A contract is a named bundle of
  intents plus event topics.

Three kinds of callers emit the same intents through the same bridge: a
button in a declarative app, a Tier-3 app calling the SDK, and the agent
invoking a tool. One grant table, one audit log, one confirmation flow.

## Existing seams we build on

| Existing piece | Becomes |
| --- | --- |
| `WebApp` + `webAppStore` (`shared/types.ts`) | `AppManifest` + installed-app registry |
| `WebAppSurface.tsx` (iframe + launch probe) | `AppHost` (iframe + bridge injection + theme tokens) |
| `WindowKind` (`windowStore.ts`) | gains `{ type: "installed"; appId: string }` |
| `StoredApp` + `appStore` (generated apps) | Tier-1 declarative apps; gain intent grants (Tier 2) |
| `agentTools[]` (`server/agent/tools.ts`) | system tools + dynamic app-contributed tools |
| `/api/tools/invoke` (`invokeRuntimeTool`) | generalized `/api/bridge` with caller identity + grants |
| `confirm_required` SSE flow | reused for first-use permission prompts + agent `confirm` policies |
| `Capability` / `ROLE_CAPABILITIES` (user auth) | stays user-level; app/agent grants are parallel tables |
| `server/bus.ts` EventEmitter | OS event bus with manifest-declared topics |
| Studio + `exec` + `write_file` | the agent's Tier-3 app factory |
| Dock sections (system / generated / web) | system / generated / **installed** |

---

## Phase 1 — Kernel: manifest, bridge, permissions

*Goal: any app — declarative or code — can call OS APIs through a checked
bridge with an identity. No new user-visible features yet.*

### 1.1 `AppManifest` (in `shared/manifest.ts`)

```ts
interface AppManifest {
  id: string;                    // reverse-dns, e.g. "core.calendar"
  name: string;
  version: string;               // semver
  icon?: string;                 // lucide name or bundled asset
  tier: "declarative" | "code"; // wasm later
  entry:
    | { kind: "openui"; appId: string }        // declarative: StoredApp ref
    | { kind: "url"; url: string }             // code: remote/dev-server
    | { kind: "bundle"; path: string };        // code: locally served build
  headless?: { command: string };              // optional background process
  implements?: ContractId[];     // e.g. ["os.calendar@1"]
  permissions: PermissionRequest[];            // consumed intents + resources
  tools?: ToolContribution[];    // exposed to the agent (JSON-schema, MCP-shaped)
  events?: { emits: string[]; subscribes: string[] };
}

type PermissionRequest =
  | { kind: "intent"; id: string }             // "calendar.event.create"
  | { kind: "contract"; id: ContractId; access: "read" | "write" }
  | { kind: "storage"; scope: "own" | string }
  | { kind: "network"; hosts: string[] }
  | { kind: "shell"; features: ("notify" | "windows" | "clipboard")[] };
```

### 1.2 Server: registry + grants + bridge

- `server/platform/installedAppStore.ts` — installed manifests (file-backed),
  install/uninstall/enable. Core apps ship as seeded, pre-granted entries.
- `server/platform/grantStore.ts` — `(appId, permission) → granted | denied |
  ask`, plus `(agent, appId, toolOrIntent) → auto | confirm | deny`.
- `POST /api/bridge` — generalizes `invokeRuntimeTool`: `{ method, params }`,
  caller identity from a per-window session token minted at launch (never
  from the app's own claim). Checks grants, dispatches, appends to an audit
  log. Agent tool calls route through the same dispatch with agent identity.

### 1.3 Client: `AppHost` + SDK

- `src/apps/appview/AppHost.tsx` — evolves `WebAppSurface`: launch/probe UX,
  plus bridge injection (postMessage, request ids, origin-checked) and theme
  token forwarding (shell `--arco-*` remapped to brand-free `--os-*` at the
  boundary). Client-side calls (open window, notify) are handled in the host
  after a grant check.
- `packages/app-sdk/` — `app-sdk` (`createAppClient()`): typed promise-based
  client — `intents`, `storage`, `capabilities`, `events`, `window`, `theme`.
  Zero dependencies.

### 1.4 Consent UI

Install-time grant sheet (plain-language permissions), per-app panel in
Settings, first-use `ask` prompts via the existing confirmation pattern.

**Exit criteria:** a demo app from a separate origin installs, appears in the
dock, reads/writes its own namespaced storage through the bridge, and a
denied permission is visibly blocked and logged.

---

## Phase 2 — Capabilities: contracts, providers, system data services

*Goal: swappability is real. Pilot contract: calendar.*

- `shared/capabilities/` — one module per contract (types + JSON schema for
  intents and events): `os.calendar@1` (CRUD + list-by-range + event
  topics), `os.files@1` (formalize existing files API). Integer-versioned;
  breaking change = `@2`.
- `server/capabilities/registry.ts` — `contractId → providerAppId | "system"`
  with defaults; "Default apps" panel in Settings.
- `server/services/calendarService.ts` — SQLite-backed canonical event store;
  the *system provider* for `os.calendar@1`.
- Event bus: extend `server/bus.ts` into manifest-gated topics surfaced
  through the bridge (SSE per app window).
- **Tier-2 declarative apps land here:** generated apps gain an implicit
  low-trust grant set and may declare action intents — the agent's durable
  apps can now use system calendar/contacts like any other caller.
- **First core app: Calendar** — built as a real platform app using only the
  SDK; preinstalled by seeding the installed-app store.

**Exit criteria:** two calendar implementations swap in Settings with zero
data loss; a declarative app and the agent both read events through the same
contract and notice no difference.

---

## Phase 3 — Agent integration: dynamic tools + operating apps

- `agentTools` becomes `systemTools + appTools(installed, grants)`,
  names namespaced, contributions MCP-shaped (so external MCP servers can be
  wrapped as headless apps later, and Arco apps are exposable outward).
- Per `(appId, tool/intent)` agent policy: `auto | confirm | deny` — reads
  default `auto`, writes/sends default `confirm`; headless automation runs
  treat `confirm` as `deny` (matches current `interactive` semantics).
- The agent prefers contract-level invocation ("create a calendar event" →
  whoever the provider is) over app-specific tools, so its behavior survives
  swaps.
- The agent as **app factory** both ways: `app_create`/`app_update` for
  declarative apps (existing), and a documented Studio flow for scaffolding
  Tier-3 apps (generate project → register manifest → grant sheet).
- Optional SDK hook for cursor-driveability (`ui.snapshot` over postMessage)
  since installed-app windows are opaque to the DOM cursor. Tools remain the
  primary agent surface.

**Exit criteria:** "Schedule lunch with Sam on Friday" works via the contract
tool, prompts for confirmation, lands in the audit log, and still works after
swapping calendar providers.

---

## Phase 4 — Suite build-out, sharing, distribution

- **Contracts and core apps in dependency order:** `os.contacts@1` →
  `os.mail@1` (independent Tier-3 app + headless sync process — first real
  test of the headless entry) → `os.docs@1` / `os.sheets@1` (independent
  Tier-3 apps over document-typed file contracts; these need real engines).
- **Sharing (apps are data where possible):** declarative apps export/import
  as signed, semver'd manifests — npm-for-manifests distribution (any git
  URL), version pinning, rollback. Tier-3 apps ship as URL or bundle installs
  with the heavier-review badge. Later rung: export declarative apps as MCP
  Apps for other AI ecosystems (spec §10.8 rung 5).
- **Later, deliberately deferred:** WASM function host (L3), marketplace
  directory + code signing, per-app resource quotas, cross-origin CSP
  hardening review.

---

## Risks / open questions

- **iframe sandbox vs. `allow-same-origin`:** installed remote code apps need
  a distinct origin (or serving proxy) so the sandbox actually isolates.
  Decide in Phase 1.
- **Contract design debt:** `os.calendar@1` stays minimal (CRUD + list by
  range) until a second consumer demands more. First-draft contracts are
  always wrong.
- **Theming at Tier 3** is opt-in by design — accept visual divergence,
  badge it, make the token hook easy.
- **Inference economy:** precompile what's stable (manifest → tool defs at
  install time, not per agent turn); intent dispatch is deterministic code.
- **Model-manager precedent:** the Tauri model-manager stays a sibling; if it
  needs shell presence it becomes a headless app with a settings surface.
