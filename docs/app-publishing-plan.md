# App Publishing Plan

> How a cloud Kosmos instance goes from “build inside the OS” to “people visit
> this at a URL” — including apps that have their own users, databases, and
> runtimes (WordPress-class workloads), and the longer arc where Kosmos
> *becomes* the product being shipped.
>
> Written 2026-07-13. Builds on `saas-plan.md` (one VM per tenant),
> `drive-sharing-plan.md` (public token surfaces), and `app-platform-plan.md`
> (app tiers + distribution).

## North star

People install Kosmos first. From there it can:

1. **Become the software** — the generated / installed app *is* what visitors
   use; Kosmos is the editor, runtime, and host.
2. **Be the always-on agentic backend** — Kosmos keeps running as the brain
   (agent, tools, memory, ops) while the public surface is a product it built
   and continues to maintain.
3. **Host third-party stacks** — install WordPress, a Next.js app, a Postgres
   service, etc. inside the instance; Kosmos publishes and operates them the
   same way it publishes a declarative OpenUI app.

Publishing is the product seam that makes all three feel like one motion:
**build → Publish → share a link → visitors use it.**

## Goals

1. **Publish button** — one-click (or agent-driven) creation of a public
   address for an app or workload.
2. **View permissions** — invite-only, anyone with the link, password-protected
   (and later: domain allowlists / org SSO).
3. **Stable addresses** — human-friendly URLs, not only opaque tokens.
4. **Stateful products** — first-class support when the published thing has
   its *own* users, DB, sessions, and admin — without collapsing those into
   Kosmos OS accounts.
5. **Safe public surface** — visitors never get the OS shell, agent, or
   sibling apps unless explicitly granted.

## Non-goals (v1)

- Multi-tenant shared processes across customers (still one Firecracker /
  machine per Kosmos tenant — see `saas-plan.md`).
- Marketplace billing for third-party published apps.
- Custom domains for every publication (defer; wildcard subdomains first).
- Turning every published app into a full SaaS control plane for *its*
  customers (that is the app’s job; we provide hosting + identity gates).
- Replacing Coolify/Dokku as a general VPS PaaS (git-deploy anything,
  multi-server fleet). Kosmos absorbs **app management UX**; hosting
  plumbing stays pluggable — see “Kosmos vs Coolify” below.

## Current baseline

| Layer | Status |
| --- | --- |
| Cloud tenant (`kosmos-<slug>.fly.dev`) | Shipped — full OS per customer |
| Build declarative apps (`app_create` / `StoredApp`) | Shipped — inside authenticated OS only |
| Tier-3 / Studio projects | Partial — run in dock / iframe; no public host |
| Drive public shares (`/s/:token`, password, expiry) | Shipped — files/folders only |
| Instance roles (`owner` / `admin` / `member` / `viewer`) | Shipped — OS seats, not app viewers |
| Coolify / Docker ops | Partial — deploy *elsewhere*; not first-party publish |
| App publish / public app URL | **Not started** |
| Workload runtime (sidecar containers + DB) | **Not started** as a platform concept |

## Conceptual model

Three identities must stay distinct:

| Identity | Who | Scope |
| --- | --- | --- |
| **Operator** | Kosmos instance user (owner/admin/member) | Builds, publishes, manages the OS |
| **Viewer** | Person granted access to a *publication* | Sees the published surface; no shell |
| **End-user** | Account inside the *product* (e.g. WP subscriber, app signup) | Owned by the app’s auth + DB |

```
┌──────────────────────────────────────────────────────────────────┐
│  Kosmos tenant (operator plane)                                  │
│  Agent · Studio · Drive · Settings · dock apps                   │
│  Publications registry · Workload supervisor                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │ Publish
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Public gateway (visitor plane)                                  │
│  Auth gate: invite | link | password                             │
│  Route → Publication target                                      │
└───────────────┬──────────────────────────┬───────────────────────┘
                │                          │
                ▼                          ▼
┌───────────────────────────┐  ┌───────────────────────────────────┐
│  Native / declarative app │  │  Workload (containerized product) │
│  StoredApp / Tier-3 iframe│  │  WordPress, Next, API, Postgres…  │
│  OS-owned or app SQLite   │  │  Own users, sessions, DB volume   │
└───────────────────────────┘  └───────────────────────────────────┘
```

**Rule:** Publishing controls *who may reach the front door*. The app behind
the door owns *who may sign up / post / buy* once inside.

---

## Publication object

A first-class record (mirror Drive’s `shareService` pattern):

```ts
type PublicationVisibility =
  | { mode: "invite" }           // ACL of emails / kosmos users
  | { mode: "link" }             // anyone with token or slug URL
  | { mode: "password"; hash: string };

type PublicationTarget =
  | { kind: "stored_app"; appId: string; revision?: string }
  | { kind: "installed_app"; appId: string }      // Tier-3 manifest
  | { kind: "workload"; workloadId: string }      // containerized stack
  | { kind: "static"; rootFileId: string };       // Drive folder / build output

interface Publication {
  id: string;
  slug: string;                  // expense-tracker
  token: string;                 // opaque fallback / revoke handle
  target: PublicationTarget;
  visibility: PublicationVisibility;
  invites?: string[];            // emails or user ids when mode = invite
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  status: "draft" | "live" | "suspended";
}
```

### URLs (phased)

| Phase | Shape | Notes |
| --- | --- | --- |
| MVP | `https://kosmos-<tenant>.fly.dev/p/<token>` | Same host as Drive `/s/` |
| v1 | `https://kosmos-<tenant>.fly.dev/p/<slug>` | Pretty path; token still works |
| v1.5 | `https://<slug>.<tenant>.kosmos.app` | Wildcard DNS + edge route |
| v2 | `https://app.customer.com` | Custom domain → one publication |

Public routes are a **locked-down gateway**: no bridge to shell, no agent
tools, no Drive outside the publication root, no Settings.

---

## Custom domains

Custom domains attach to a **publication**, not to the whole Kosmos OS.
`kosmos-<tenant>.fly.dev` (and later `<tenant>.kosmos.app`) remains the
operator console; `app.customer.com` is the product front door.

Today: tenants only have `*.fly.dev` (`deploy/fly/SAAS.md`). Control plane
lists custom domains as deferred. This section is the target design.

### Domain ladder

```
1. Platform path     kosmos-acme.fly.dev/p/expense
2. Platform host     expense.acme.kosmos.app          (we own DNS + cert)
3. Custom domain     expense.acme.com                 (customer owns DNS)
4. Apex (optional)   acme.com                        → same publication
```

Platform hosts (1–2) need no customer DNS. Custom domains (3–4) need
verify → certify → route.

### Where routing lives

Do **not** terminate arbitrary customer domains on every tenant machine
directly at first (cert sprawl, Fly certificate limits, Host confusion with
the OS). Prefer an **edge router** owned by the control plane:

```
Visitor → app.customer.com
            │
            ▼
┌─────────────────────────────────────────┐
│  Edge (control plane / Fly app / Caddy) │
│  Host → { tenantId, publicationId }     │
│  TLS cert for app.customer.com          │
└──────────────────┬──────────────────────┘
                   │ proxy (internal / private)
                   ▼
┌─────────────────────────────────────────┐
│  Tenant machine                         │
│  Public gateway serves that publication │
│  (same code path as /p/:slug)           │
└─────────────────────────────────────────┘
```

The edge looks up `Host` in a global domain table; the tenant only knows
“serve publication X as public.” OS cookies and `/api/*` operator routes
never bind to the custom hostname.

### Domain record

```ts
interface CustomDomain {
  id: string;
  hostname: string;              // app.acme.com (normalized, lowercase)
  tenantId: string;
  publicationId: string;         // exactly one live target
  status:
    | "pending_dns"              // waiting for customer records
    | "pending_cert"             // DNS ok, ACME in flight
    | "active"
    | "error";
  verifyToken: string;           // for TXT _kosmos-challenge.<host>
  targetCname: string;           // e.g. domains.kosmos.app
  certExpiresAt?: string;
  createdAt: string;
}
```

Stored in the **control plane** (global uniqueness of hostnames). Tenant
mirrors a read-only copy or receives a webhook/config push when status
becomes `active`.

### Customer DNS setup

| Record | Name | Value | Purpose |
| --- | --- | --- | --- |
| **CNAME** | `app` (or host) | `domains.kosmos.app` | Traffic → our edge |
| **TXT** | `_kosmos-challenge.app` | `verifyToken` | Prove domain ownership |

**Apex (`acme.com`):** CNAMEs are often disallowed. Options:

1. Recommend `www` + redirect apex → `www` at their DNS provider, or
2. Support **ALIAS/ANAME** where the DNS host allows it, or
3. Later: publish A/AAAA to anycast edge IPs (harder operationally).

v1: **subdomains only** (CNAME). Apex as Phase 5 follow-on.

### Verification + TLS flow

1. Operator: Publication → **Custom domain** → enter `app.acme.com`.
2. Control plane creates `CustomDomain` (`pending_dns`), shows CNAME + TXT.
3. Poll (or webhook) until TXT matches and CNAME points at `domains.kosmos.app`.
4. Issue cert via ACME (Fly certs API, Caddy `on-demand` TLS, or
   Let’s Encrypt DNS-01 if we control a challenge helper).
5. Mark `active`; edge starts routing `Host: app.acme.com` → tenant
   publication proxy.
6. Renewal: edge owns renewals; alert tenant on failure; auto-suspend
   route if cert expires (publication still reachable on platform URL).

### Mapping rules

| Rule | Why |
| --- | --- |
| One hostname → one publication | Avoid ambiguous Host routing |
| One publication → many hostnames | OK (`app.com` + `www.app.com`) |
| Hostname globally unique | Enforced in control plane |
| Removing domain ≠ unpublish | Only detaches the alias |
| Suspended publication | Edge returns 404/503 even if DNS still points at us |

### Workloads + Host headers

WordPress / many apps care about the public hostname (`WP_HOME`,
`ALLOWED_HOSTS`, Next `NEXTAUTH_URL`).

On domain activate / primary-domain change:

1. Set workload env (`PUBLIC_URL`, `VIRTUAL_HOST`, etc.) from the
   **primary** custom domain (or platform slug URL if none).
2. Optionally run a recipe hook (`workload.on_domain_change`) so the agent
   or installer rewrites app config.
3. Edge forwards `Host: app.acme.com` (and `X-Forwarded-Proto: https`) so
   the app generates correct absolute links.

Platform URL (`/p/slug`) remains a valid alternate; apps that hard-require a
single canonical host should set primary domain explicitly.

### Operator UX

- Publish dialog → **Domains**: platform URL (always) + add custom domain.
- Status chips: Waiting for DNS · Issuing certificate · Active · Error.
- “Copy DNS records” · “Check again” · “Remove domain”.
- Agent tools: `domains.add`, `domains.status`, `domains.remove` (operator
  only; confirm on remove).

### Security

1. Never activate a domain without TXT proof (prevents stealing someone
   else’s hostname that already CNAMEs to us).
2. Custom Host never unlocks operator session cookies (cookie
   `Domain` stays on `*.kosmos.app` / tenant fly.dev).
3. Rate-limit cert issuance per tenant (ACME abuse).
4. If tenant is suspended for billing, edge returns maintenance for all of
   that tenant’s custom domains.

### Phasing (domains specifically)

| Step | Deliverable |
| --- | --- |
| D0 | Platform paths `/p/:token` only |
| D1 | Wildcard `*.<tenant>.kosmos.app` (we own DNS + wildcard cert) |
| D2 | Custom subdomain CNAME + TXT + edge TLS + Host → publication |
| D3 | Apex / ALIAS; multi-domain; domain-change hooks for workloads |
| D4 | Optional BYO cert upload (enterprise) |

D1 unblocks “nice URLs” without customer DNS. D2 is real custom domains.

### Self-hosted deployments (own server / Coolify / VPS)

Self-hosters already bring DNS and TLS. There is **no Kosmos control-plane
edge** — the instance *is* the edge. Publishing still works; domain plumbing
is local.

**Today:** one hostname points at the whole OS (e.g. Coolify →
`https://kosmos.tiru.fm` with `ARCO_SECURE_COOKIES=1`). That remains the
operator URL.

**With publishing, three patterns:**

#### 1. Path on the existing domain (default, zero DNS)

```
https://kosmos.example.com/p/expense
https://kosmos.example.com/p/<token>
```

Same Compose / Coolify app they already run. No extra certificates. Best
default for self-host MVP — mirrors SaaS `/p/:slug` without needing
`*.kosmos.app`.

#### 2. Extra hostnames → same Kosmos container (recommended for custom domains)

Operator adds `app.example.com` (and optionally `www`) in Coolify / Caddy /
Traefik, all proxying to the Kosmos service. Inside Kosmos, a **local**
domain table maps Host → publication:

```
Visitor → app.example.com
            │
            ▼
┌─────────────────────────────────────────┐
│  Their reverse proxy (Coolify / Caddy)  │
│  TLS for app.example.com (their ACME)   │
│  proxy_pass → kosmos:4600               │
└──────────────────┬──────────────────────┘
                   │ Host: app.example.com
                   ▼
┌─────────────────────────────────────────┐
│  Kosmos public gateway                  │
│  local CustomDomain → publicationId     │
│  (OS routes still only on primary host) │
└─────────────────────────────────────────┘
```

Differences from SaaS cloud:

| Concern | Cloud SaaS | Self-host |
| --- | --- | --- |
| Domain registry | Control plane (global) | Instance DB (`domains` on this box) |
| TLS | Our edge ACME | Coolify / Caddy / Traefik |
| Ownership proof | TXT challenge (multi-tenant) | Optional — operator controls the box; “Add domain” + “I pointed DNS here” is enough |
| CNAME target | `domains.kosmos.app` | Their server A/AAAA or Coolify hostname |
| Primary OS URL | `kosmos-<slug>.fly.dev` | Whatever they set as `ARCO_WEB_ORIGIN` |

UI can still show “add these DNS records” (A/CNAME to this server) and a
connectivity check (`Host` probe), but we do not need a global verify token
unless they want defense-in-depth.

Cookie rule unchanged: operator session cookies stay bound to the **primary**
OS host (`ARCO_WEB_ORIGIN`), not to publication hostnames.

#### 3. Workload as its own Coolify app (escape hatch)

Agent/ops already scaffolds Coolify apps and deploys elsewhere
(`deploy/coolify/`, ops tools). A WordPress stack can get its **own**
Coolify service + domain, completely outside `/p/`.

Tradeoff: Kosmos publication ACL (invite / link / password) and unified
Publish UI do **not** wrap that traffic unless they reverse-proxy *through*
Kosmos (pattern 2) or we later add an external “publication points at URL”
target. Prefer pattern 2 when they want Kosmos gates; use pattern 3 when
they want classic “this VPS runs WP on `blog.example.com`” and Kosmos is
only the installer/ops brain.

#### Self-host URL ladder

| Phase | Shape |
| --- | --- |
| MVP | `https://<primary>/p/<token\|slug>` |
| v1 | Extra hosts on same proxy → local Host map |
| Optional | Workload direct on Coolify domain (no Kosmos gate) |

SaaS `*.<tenant>.kosmos.app` does **not** apply; self-hosters use their own
zones end-to-end.

#### Config sketch

```bash
# Primary operator URL (already used for OAuth, cookies)
ARCO_WEB_ORIGIN=https://kosmos.example.com

# Optional: comma-separated hosts allowed as publication front doors
# (also managed via UI → stored in data/, not only env)
ARCO_PUBLICATION_HOSTS=app.example.com,www.example.com
```

Gateway: if `Host` is primary → normal OS. If `Host` is a mapped publication
domain → public app surface only. Unknown Host → 404.

---

## Publish button (operator UX)

Entry points:

1. Studio / App chrome → **Publish**
2. Workload detail → **Publish**
3. Agent tool `publications.create` / `publications.update` / `publications.revoke`

Flow:

1. Choose target (current app revision / workload / static build).
2. Choose visibility (invite / link / password).
3. Optional: slug, expiry.
4. Copy URL · open preview as viewer · revoke anytime.

Reuse Drive’s share modal patterns (`ShareLinkModal`, password + expiry).

---

## User journeys: install, then publish

One mental model for operators:

> **Install** puts the app on *my* Kosmos (dock / Workloads).  
> **Publish** puts a front door on the internet (with visibility rules).

Install never implies public. Publish never implies a full OS seat for visitors.

### Path A — Ask the agent to build it (declarative)

**Today (install half works):** chat → `app_create` → app in dock.  
**Publish:** Phase 1 of this plan.

1. Operator: “Build me an expense tracker.”
2. Agent creates a `StoredApp`; it appears in the dock / Apps.
3. Operator opens it, iterates with the agent (`app_update`).
4. Operator clicks **Publish** (or: “Publish this with a password”).
5. Chooses visibility → gets `https://…/p/expense` (or token URL).
6. Visitors use the public renderer; operator keeps editing inside the OS.

Best for: trackers, dashboards, internal tools, MVPs.

### Path B — Install a Kosmos / Tier-3 app (manifest)

**Target:** catalog, URL, or Drive bundle → grant sheet → dock.  
(See `app-platform-plan.md` Phase 6 distribution.)

1. Operator opens **Apps → Install** (or agent: “Install this app from URL”).
2. Manifest reviewed; capabilities granted; app registered.
3. App runs in `AppHost` (sandboxed) for the operator.
4. **Publish** → public AppHost for that revision (no shell / limited bridge).
5. Optional: pin revision so live visitors don’t see half-finished Studio edits.

Best for: shareable Kosmos-native apps, third-party OpenUI/Tier-3 packages.

### Path C — Install a classic stack (WordPress, Next, etc.)

**Target:** Workloads + recipes (Phase 4). Replaces “scaffold a Coolify app and leave Kosmos.”

1. Operator (or agent): **Apps → Install recipe → WordPress**  
   (or “Install WordPress with MySQL”).
2. Kosmos creates a `Workload` (services + volumes + env), starts it, waits
   for healthcheck.
3. Operator opens **Preview** (authenticated) — configures WP admin, themes.
4. **Publish** on the workload → publication proxies to `internalPort`.
5. Visibility: link / password / invite (outer door). WP users remain WP users.
6. Optional: attach `blog.example.com` (custom domain).

Best for: real products with their own DB and end-user accounts.

### Path D — Build in Studio, then promote

1. Agent scaffolds a project in Studio (`write_file` / `exec`).
2. Register as installed app **or** as a workload (Node server + DB).
3. Iterate privately (only operators see it).
4. **Publish** when ready; later **Republish** / rollback to a revision.

Best for: custom code that outgrew declarative apps.

### Where the buttons live

| Step | UI | Agent |
| --- | --- | --- |
| Install recipe / catalog | Apps library · Install | `workload.create`, `apps.install` |
| Build new | Chat · Studio | `app_create`, Studio tools |
| Preview (private) | Open in dock / Workload preview | — |
| Go live | **Publish** on app or workload | `publications.create` |
| Share access | Publish dialog (invite / link / password) | `publications.update` |
| Custom domain | Publish → Domains | `domains.add` |
| Unpublish | Revoke / suspend | `publications.revoke` |

### Happy-path sketch (WordPress)

```
Operator                Kosmos                         Visitors
   │                       │                               │
   │  Install WordPress    │                               │
   ├──────────────────────►│ workload.create + start       │
   │                       │                               │
   │  Preview (auth)       │                               │
   ├──────────────────────►│ proxy loopback :8080          │
   │                       │                               │
   │  Publish · link+pw    │                               │
   ├──────────────────────►│ publications.create           │
   │  ← URL /p/blog        │                               │
   │                       │     open URL + password       │
   │                       │◄──────────────────────────────┤
   │                       │ gate OK → proxy WP            │
   │                       ├──────────────────────────────►│
   │                       │     WP signup / read posts    │
```

### What “installed” means vs “published”

| State | Who can open it | Where |
| --- | --- | --- |
| Installed only | Operators (instance roles) | Dock / Workloads / Studio |
| Published | Viewers who pass visibility | `/p/…` or custom domain |
| Published + app accounts | End-users of that product | Inside the app after the gate |

An app can stay installed forever without ever being published (private tools).
A publication can be revoked without uninstalling (product offline, still
editable).

---

## Handling apps with their own users + database

This is the WordPress / “real product” case. Publishing must **not** pretend
those users are Kosmos viewers.

### Workloads

Introduce a **Workload** as a supervised process graph on the tenant machine
(or nested containers when the host supports them):

```ts
interface Workload {
  id: string;
  name: string;
  kind: "compose" | "single" | "static";
  // e.g. docker-compose-ish: wordpress + mysql
  services: WorkloadService[];
  volumes: { name: string; mount: string }[];
  env: Record<string, string>;       // secrets via OS secret store
  healthcheck?: { url: string };
  internalPort: number;              // what the public gateway proxies to
  adminUrl?: string;                 // e.g. /wp-admin — operators only
  status: "stopped" | "starting" | "running" | "unhealthy";
}
```

Examples:

| Product | Services | End-user auth | Data |
| --- | --- | --- | --- |
| WordPress blog | `wordpress` + `mysql` | WP users / roles | MySQL volume |
| Next.js SaaS | `web` + `postgres` + `redis` | App auth (Clerk, Lucia, …) | Postgres volume |
| Declarative tracker | none (StoredApp) | optional OS intents | OS SQLite / app bindings |
| Static marketing site | nginx / static root | none | Drive / build dir |

### Two doors, one publish

For a WordPress-class publication:

| Door | Audience | Gate |
| --- | --- | --- |
| **Publication gate** | Anyone hitting the Kosmos URL | invite / link / password (Kosmos) |
| **App gate** | Sign-in / wp-admin / checkout | Owned by WordPress (or Next auth) |

Typical setups:

1. **Public product, private Kosmos** — visibility `link` or open; WP handles
   its own membership. Kosmos gate is effectively “is this publication live?”
2. **Private beta** — visibility `invite` or `password` *in front of* WP.
   Only invited people even see the WP login page.
3. **Operator-only admin** — `/wp-admin` (or workload `adminUrl`) requires a
   Kosmos operator session *in addition to* WP admin auth. Public gateway
   strips or blocks admin paths for anonymous viewers.

### Data ownership

| Concern | Owner |
| --- | --- |
| Publication ACL, slug, live/suspended | Kosmos (`publications` store) |
| App users, posts, orders, schema | Workload volumes / DB |
| Operator backups | Kosmos snapshots volume + workload volumes together |
| Agent access to DB | Via workload tools (`workload.exec`, `workload.logs`, optional
  SQL proxy with confirm) — never exposed on the public gateway |

### Migrations & “installed inside Kosmos”

Install path (agent or UI):

1. `workload.create` from a recipe (WordPress, Postgres, Node app template).
2. Agent fills env, starts services, runs healthcheck.
3. Operator opens internal preview (loopback / authenticated proxy).
4. **Publish** attaches a Publication → gateway reverse-proxies to
   `internalPort`.
5. End-users register *inside* the app; operators manage the stack in Kosmos.

This is how Kosmos “installs WordPress” without WordPress becoming an OS
user directory.

### Databases

- Prefer **one DB service per workload** (compose service), not a shared
  multi-tenant Postgres across customers (isolation stays at the VM boundary).
- Optional later: managed add-on DBs provisioned by the control plane and
  attached as env — still scoped to one tenant.
- Declarative apps keep using OS-owned SQLite / bindings unless they graduate
  to a workload.

---

## Auth matrix (who sees what)

| Actor | OS desktop | Publication URL | Workload admin | App signup/data |
| --- | --- | --- | --- | --- |
| Operator (owner/admin) | Yes | Yes | Yes (extra gate) | Via app |
| Instance member/viewer | Per role | If invited / link | No by default | Via app |
| Invited publication viewer | No | Yes | No | Via app |
| Anyone with link | No | If visibility allows | No | Via app |
| Password holder | No | After challenge | No | Via app |
| App end-user (WP account) | No | Must pass publication gate first | No | Yes |

Invite implementation (v1): email list + magic link that sets a
`publication_viewer` cookie scoped to that publication id. Not a full OS seat.

---

## Kosmos vs Coolify — replace, absorb, or partner?

**Verdict: do not rebuild Coolify as a general PaaS. Do absorb the *app
management product* into Kosmos so operators rarely leave the OS.**

Coolify (and Railway / Render / Dokku) solve **host infrastructure**: multi-app
Docker on a VPS, git deploys, TLS, proxy, DB add-ons, server fleet. Kosmos
solves **building and running a product with an agent**. Collapsing those into
one megaproduct is a trap — years of proxy/ACME/edge cases for little brand
leverage, while SaaS Fly tenants often cannot safely expose a Docker socket
anyway.

What *is* a good idea: **Workloads + Publish as the control plane UX**, with
pluggable runtimes underneath.

```
┌─────────────────────────────────────────────────────────────┐
│  Kosmos (what humans + agent use)                           │
│  Apps · Workloads · Publish · Domains · Logs · Env · Agent  │
└────────────────────────────┬────────────────────────────────┘
                             │ WorkloadProvider API
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ Embedded      │  │ Docker (socket) │  │ External PaaS    │
│ supervisor    │  │ sibling compose │  │ Coolify / Fly /  │
│ (processes on │  │ on same host    │  │ Railway adapter  │
│  tenant VM)   │  │                 │  │                  │
└───────────────┘  └─────────────────┘  └──────────────────┘
```

### What Kosmos should own (replace Coolify *for the operator*)

| Capability | In Kosmos |
| --- | --- |
| List / start / stop / restart apps | Workloads UI + agent tools |
| Env + secrets | OS secret store, per workload |
| Logs / health | Workload detail |
| Publish + visibility + URL | Publications |
| Domains (map host → app) | Domains UX (local or control-plane edge) |
| Install recipes (WordPress, Next, …) | Agent + recipe catalog |
| “This is my product” mental model | Dock / Studio / Publish — one place |

Day-to-day, self-hosters and cloud tenants manage products **inside Kosmos**,
not by opening Coolify for every restart.

### What Kosmos should not own (keep Coolify / host / Fly)

| Capability | Keep outside |
| --- | --- |
| Installing Kosmos itself on bare metal | Coolify / Docker / Fly provisioner |
| Host OS updates, firewall, multi-server | Hosting layer |
| Wildcard TLS for the *machine* Kosmos runs on | Caddy / Coolify / Fly |
| Unrelated apps on the same VPS next to Kosmos | Coolify stays useful as the *host* |
| Global multi-tenant domain edge (SaaS) | Control plane |

Coolify becomes **how you run Kosmos** (and optionally an adapter for heavy
compose), not **where you manage Kosmos-built products**.

### Provider modes by environment

| Environment | Default runtime | Coolify role |
| --- | --- | --- |
| Desktop / local | Embedded supervisor (or Docker Desktop if present) | None |
| Cloud SaaS (Fly microVM) | Embedded supervisor / sidecars on the tenant volume | None — no Docker-in-VM requirement |
| Self-host with Docker socket | Docker provider (`ARCO_OPS_ENABLED`) | Optional; Kosmos drives compose directly |
| Self-host already on Coolify | Docker provider **or** Coolify adapter (today’s `coolify_create_app`) | Host for Kosmos; fade as primary app UI |

Today’s ops tools (`deployOps`, Kosmos Ops MCP) already scaffold Coolify apps
outward. The migration path is: same tools target a `Workload` record first;
Coolify folder layout becomes one backend implementation, then optional.

### When “replace Coolify” *is* wrong

- User wants one VPS with Kosmos **plus** five unrelated services they already
  manage in Coolify → keep Coolify as the host panel; Kosmos manages its own
  workloads only.
- Building ACME, git webhooks, and multi-node scheduling inside Kosmos before
  Publish/Workloads are excellent → premature PaaS.
- Expecting every Fly tenant to mount `docker.sock` → breaks the SaaS
  isolation model.

### Product framing

> Coolify (or Fly) is the **power outlet**. Kosmos is the **appliance** —
> and increasingly the workshop that builds other appliances. You don’t
> rewire the house to toast bread; you also don’t open the fuse box every
> time you want to change the toast settings.

Long-term, a polished Workloads surface can make Coolify feel unnecessary
*for Kosmos users’ apps*. That is success. Competing with Coolify for
“deploy any Git repo on any server” is not the goal.

---

## Kosmos becomes the product (future arc)

Publishing is the thin edge of a larger shift: **Kosmos is the default
place software comes from**, not a separate IDE that exports somewhere else.

### Mode A — Kosmos *is* the app

- Long-tail products stay declarative or Tier-3-in-OS.
- Publish serves the app from the tenant with a public renderer.
- Data stays in OS stores or a small app DB.
- Best for: internal tools, trackers, client portals, agent-built MVPs.

### Mode B — Kosmos is the always-on agentic backend

- Public site / API is a workload (or static + API).
- Kosmos agent remains running (or wake-on-event) to:
  - ship updates (`app_update`, `workload.deploy`)
  - triage issues from mail/Slack channels
  - run scheduled jobs, backups, migrations
  - talk to end-user support under operator policy
- The publication URL is the product; the OS URL is the factory + ops console.
- Best for: products that need ongoing intelligence, not just a static host.

### Mode C — Kosmos hosts a classic stack

- WordPress / Rails / Docker Compose recipes.
- Agent installs and maintains; humans use familiar admin UIs.
- Publish + workload proxy provide the public address and optional outer ACL.
- Best for: “I want the thing I already know, but Kosmos operates it.”

These modes share one Publish primitive so the operator never learns three
hosting products.

### Instance lifecycle implication

Over time a tenant may look less like “an OS I log into” and more like
“the production system for my product,” with:

- Primary DNS → publications
- OS UI → operators only (or SSO for the team)
- Agent → SRE + product engineer on call 24/7
- Billing → still the Kosmos control plane (compute + credits), while the
  *product’s* billing stays inside the app

Cold-start / auto-stop (Fly) must respect live publications: a published
workload with active traffic should keep the machine warm, or the public
gateway should wake and hold until healthy.

---

## Architecture (target)

```
Operator browser ──► Kosmos OS (auth session)
                         │
                         ├─ publicationsService
                         ├─ workloadSupervisor  (start/stop/health/logs)
                         └─ agent tools

Visitor browser ──► Public gateway /p/:slug|/p/:token
                         │
                         ├─ visibility gate (invite | link | password)
                         ├─ if stored_app → public AppHost (read-only bridge)
                         ├─ if static     → Drive/blob root
                         └─ if workload   → reverse proxy → 127.0.0.1:port
                                              (block admin paths unless operator)
```

Reuse:

- Drive share isolation pattern for the public surface
- Tenant VM isolation from SaaS
- Studio / ops recipes as workload installers
- Instance roles for operators only

---

## Phases

### Phase 0 — Spec + seams

- Define `Publication` + `Workload` types in `shared/`
- Capability stub `os.publications@1`, `os.workloads@1`
- Doc the auth matrix; no UI yet

**Exit:** Types + intent list agreed; security review of public gateway.

### Phase 1 — Publish MVP (declarative apps)

- `publicationsService` + `/api/publications/*` (auth)
- Public `GET /p/:token` renderer for `StoredApp` (no shell)
- Visibility: link + password (+ expiry)
- Publish button on generated-app chrome
- Agent tools: create / list / revoke

**Exit:** Operator publishes an OpenUI app; stranger opens link (or password)
and uses it; revoke works.

### Phase 2 — Invites + pretty slugs

- Invite emails / magic-link viewer cookies
- `/p/:slug` with uniqueness per tenant
- Suspend / draft status
- Viewer analytics (hit count only)

**Exit:** Private beta of a declarative app via invite list.

### Phase 3 — Static + Tier-3 publish

- Publish Drive folder or build output as static
- Publish installed Tier-3 app via sandboxed public AppHost
- Pin revision / rollback

**Exit:** Studio-built web app reachable at `/p/my-app`.

### Phase 4 — Workloads (WordPress-class)

- Workload supervisor (compose up/down, health, logs, env/secrets)
- Recipe: WordPress + MySQL (reference install)
- Publication target `workload` → authenticated reverse proxy
- Admin-path protection for operators
- Backup snapshot includes workload volumes
- Agent: install recipe → publish → iterate

**Exit:** “Install WordPress in Kosmos → Publish → visitors use WP; WP users
are not Kosmos users; operators manage via Kosmos + wp-admin.”

### Phase 5 — Addresses + always-on product mode

- `*.<tenant>.kosmos.app` routing (control plane / edge) — domain step **D1**
- Custom domains: CNAME + TXT verify, edge TLS, Host → publication — **D2**
- Keep-alive policy for live publications (no surprise cold starts)
- Optional: agent wake hooks from publication events / uptime checks
- Workload `PUBLIC_URL` / Host-header hooks when primary domain changes

**Exit:** Product URL feels primary (platform subdomain or custom); OS URL
is clearly the control plane.

### Phase 6 — Agentic backend posture

- Policies for what the agent may change on a live publication (confirm
  gates, staged deploys)
- Channel → “support for my published product” playbooks
- Graduating declarative apps → workloads when they outgrow OS SQLite

**Exit:** A team can run a real customer-facing product where Kosmos is both
factory and ops brain.

---

## Security invariants

1. Public gateway never exposes `exec`, bridge shell, raw Drive, or agent.
2. Publication ACL ≠ app user ACL; do not auto-create OS accounts for viewers.
3. Workload admin URLs require operator auth (and ideally the app’s own admin).
4. Secrets for workloads live in the OS secret store; not in publication
   records or client HTML.
5. One tenant VM remains the isolation boundary between customers.
6. Suspend / revoke must cut public access even if the workload still runs
   privately for operators.

## Open questions

1. **Nested Docker on Fly Machines** — do workloads run as sibling processes
   under the Node supervisor first, with containers only where the host
   allows? (Likely: process/supervisor MVP → containers when available.)
2. **Viewer accounts** — magic-link cookies only, or a lightweight Kosmos
   “viewer identity” shared across publications on one tenant?
3. **Billing** — does a live publication with a DB count as storage + always-on
   compute SKU, separate from idle OS auto-stop?
4. **SEO / unlisted** — do we need `unlisted` vs `public` beyond link vs invite?
5. **Multi-publication apps** — one workload, many slugs (staging vs prod)?
6. **Edge home** — dedicated Fly “domains” app vs Caddy beside control plane
   vs Fly’s native custom-domain APIs per tenant machine?
7. **Apex domains** — defer entirely until D3, or require www-only in v1?
8. **Coolify adapter lifespan** — keep `coolify_create_app` as a provider
   indefinitely, or sunset once embedded/Docker WorkloadProvider is default
   on self-host?

## Related docs

- `docs/saas-plan.md` — tenant isolation, control plane
- `deploy/fly/SAAS.md` — live hosting topology
- `docs/drive-sharing-plan.md` — public token surface pattern
- `docs/app-platform-plan.md` — tiers, manifests, distribution
- `docs/roadmap.md` — Phase 6 sharing / swappability notes
