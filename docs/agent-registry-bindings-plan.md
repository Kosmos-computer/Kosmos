# Agent Registry & Channel Bindings — Completion Plan

> Written 2026-07-14. Companion to `model-agent-profiles-plan.md` (schema),
> `memory-plan.md` (principals), `channels-plan.md` (Telegram gateway),
> `openclaw-port-plan.md` Phase H, and the Agents UI stub (`src/apps/agents/`).
>
> **Status: LANDED (Phases 0–5 core).** Registry, composer chip, peer bindings,
> skills/policy, ACP/automation profile runtime, safety badges + `canUseProfile`
> stub. Full certification suites / parental allowlists remain deferred on
> `model-agent-profiles-plan.md`.
>
> **References:**
> - Hermes WebUI profiles — `UI Experiments/reference/hermes-webui/`
>   (`api/profiles.py`, composer profile chip, Profiles vs Workspaces copy)
> - Hermes Agent runtime — `UI Experiments/reference/hermes-agent/`
>   (LEARNINGS §19: learning loop, FTS5 session search, toolsets)
> - OpenClaw multi-agent — `UI Experiments/reference/openclaw/docs/concepts/multi-agent.md`,
>   `src/routing/resolve-route.ts`, `src/config/types.agents.ts`
> - LEARNINGS §1–3, §13, §17, §19

---

## 0. Goal

Ship a real **agent profile registry** and **channel peer → profile bindings**
so Kosmos can run multiple personas (different tool policy, memory principal,
model slot, skills) without becoming OpenClaw’s filesystem-per-agent sprawl
or Hermes’ process-global `HERMES_HOME` switcher.

**Done means:**

1. Agents app lists live profiles (not mocks).
2. A Telegram peer can be bound to a non-default profile.
3. That turn uses the bound profile’s `principalId`, tool/skill defaults, and
   session namespace.
4. Memory ACLs and headless channel policy actually see the right principal.

---

## 1. What the templates teach

### 1.1 Hermes — steal UX, not identity model

| Steal | Skip |
| --- | --- |
| **Profile ≠ workspace** framing (how vs what files) | Full `HERMES_HOME` clone per persona |
| Always-visible **active agent chip** in composer | Process-global env / module monkey-patch |
| Profiles rail + create flow (name, clone defaults, model) | Markdown `MEMORY.md` as kernel |
| Skill disable list + session toolset override UX | “Active profile = whatever gateway is running” as binding |
| Surface context (“this turn is Telegram”) | Personalities confused with registry agents |

Hermes “agents” are **named profile homes**. Kosmos already designed something
better: manifests + `principalId`. Keep Hermes as the **operator UX** template.

### 1.2 OpenClaw — steal routing, not the zoo

| Steal | Skip for v1 |
| --- | --- |
| **Peer-first bindings** → agentId | Discord guild/roles, Slack team, multi-account matrix |
| Deterministic resolver (first match in config order) | ACP binding type, broadcast groups |
| Session keys prefixed by agent | Full Control UI Agents console |
| Skill allowlist **replace** semantics per agent | Topic/runtime conversation override stack |
| Default agent fallback | Per-agent OAuth `agentDir` complexity |

OpenClaw resolver tiers (simplified for us):

```
peer exact → (later: wildcards) → channel default → agents.default → "builtin"
```

For one Telegram bot, MVP match is only:

```ts
{ profileId, match: { channel: "telegram", peer: { kind: "direct"|"group", id } } }
```

### 1.3 Kosmos — keep contracts

| Already designed / partial | Role |
| --- | --- |
| `model-agent-profiles-plan.md` | `AgentProfile` schema, safety, certification (later) |
| `memory-plan.md` §3 | Principals + grants (Phase 1 kernel landed; principal threading TODO) |
| `src/apps/agents/` | UI shell ready — wire to API |
| `server/channels/` | Pairing, mention gate, session map — add `profileId` |
| `policyStore` / `skillStore` | Per-tool policy + skills — attach defaults from profile |

---

## 2. Target architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Agents app / Settings / Composer agent chip                │
└────────────────────────────┬────────────────────────────────┘
                             │ REST /api/agents, /api/bindings
┌────────────────────────────▼────────────────────────────────┐
│  agentStore (registry)          bindingStore (or channel)   │
│  AgentProfile[]                 peer → profileId            │
└──────────────┬─────────────────────────────┬────────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────┐   ┌─────────────────────────────┐
│  resolveProfile(ctx)     │   │  channel gateway inbound    │
│  → AgentProfile          │◄──│  resolveBinding(peer)       │
└──────────────┬───────────┘   └──────────────┬──────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐   ┌─────────────────────────────┐
│  runAgentTurn({          │   │  session key:               │
│    profileId,            │   │  agent:<profileId>:…        │
│    principalId,          │   │  (per-peer isolation)       │
│    …                     │   └─────────────────────────────┘
│  })                      │
│  memory + tools + skills │
└──────────────────────────┘
```

**One process, many profiles** — like OpenClaw’s one Gateway.  
**No HERMES_HOME switch** — profile id rides on the turn context.

---

## 3. Data model (v1)

### 3.1 `AgentProfile` (runtime subset)

Ship the **routing-critical** fields first; defer full certification/safety
enforcement to profiles-plan Phases 3–5.

```ts
// shared/agents.ts (new) — align with model-agent-profiles-plan §2.6
interface AgentProfile {
  id: string;                    // "agent:builtin", "agent:user:alice"
  name: string;
  description?: string;
  enabled: boolean;
  principalId: MemoryPrincipalId; // usually equals id
  runtime: {
    kind: "builtin" | "acp" | "cursor" | "openhands" | "kosmos";
    acpPresetId?: string;
  };
  modelSlot?: UseCaseSlotId;     // default "agent.chat"
  /** Tool policy seed applied when profile is selected (user overrides stay in policyStore). */
  policyLevel?: "conservative" | "balanced" | "permissive";
  /** Skill ids this profile may use; omit = all enabled skills; [] = none. Replace semantics (OpenClaw). */
  skills?: string[];
  /** Optional denylist on top of global skills (Hermes). */
  skillsDisabled?: string[];
  avatar?: { kind: "emoji" | "initials"; value: string; color?: string };
  source: "seed" | "user";
  createdAt: string;
  updatedAt: string;
}
```

**Seeds at boot:**

| Id | Notes |
| --- | --- |
| `agent:builtin` | Default for Chat, Studio, unbound channels |
| `agent:acp:*` | Optional rows from `ACP_PRESETS` (enabled if user uses ACP) |

Automations stay `agent:automation:<id>` principals without requiring a full
persona row in v1 (can list as derived later).

### 3.2 Bindings

```ts
interface AgentBinding {
  id: string;
  profileId: string;             // must exist in agentStore
  match: {
    channel: "telegram";         // only kind for v1
    peer: {
      kind: "direct" | "group";
      id: string;                // Telegram chatId / user id string
    };
  };
  /** Prefer per-peer sessions so two people on one profile don't share transcript. */
  dmScope?: "main" | "per-peer"; // default "per-peer"
  createdAt: string;
}
```

**Also on `ChannelPeer`:** optional denormalized `profileId` for Settings UX
(source of truth can be bindingStore keyed by `channelId:chatId`).

### 3.3 Session keys

| Surface | Key |
| --- | --- |
| Interactive chat | `agent:<profileId>:chat:<sessionId>` (or keep session row + `profileId` column) |
| Channel DM (per-peer) | `agent:<profileId>:telegram:direct:<chatId>` |
| Channel group | `agent:<profileId>:telegram:group:<chatId>` |

Store `profileId` on `Session` records so the UI and loop don't re-parse keys.

### 3.4 Persistence

| Store | Path |
| --- | --- |
| Profiles | `data/agents.json` via `server/agents/agentStore.ts` |
| Bindings | `data/agent-bindings.json` **or** field on `channels.json` peers |
| Prefer | Keep bindings next to channels (`channelStore`) for v1 — fewer files |

---

## 4. Resolution algorithm (Kosmos)

```ts
function resolveChannelProfile(channelId: string, chatId: string, isGroup: boolean): AgentProfile {
  const peerKind = isGroup ? "group" : "direct";
  const binding = bindings.find(
    (b) =>
      b.match.channel === "telegram" &&
      b.match.peer.kind === peerKind &&
      b.match.peer.id === chatId &&
      agentStore.get(b.profileId)?.enabled,
  );
  if (binding) return agentStore.get(binding.profileId)!;

  // Channel-wide default (optional future): binding without peer
  // Fallback:
  return agentStore.getDefault(); // agent:builtin
}
```

**Rules (from OpenClaw, trimmed):**

1. Peer exact match wins.
2. First binding in list order wins if duplicates.
3. Disabled profiles are skipped (fall through to default).
4. Missing profile id → log + default (fail closed to builtin, not error loop).

Interactive Chat/Studio: use **composer-selected** profile (Hermes chip),
default `agent:builtin`. Settings `agent` kind (ACP/Cursor) becomes the
**runtime of the selected profile**, not a separate global.

---

## 5. Turn context (critical)

Today tools hardcode `agent:builtin` for memory. Fix by threading:

```ts
interface AgentTurnContext {
  sessionId: string;
  profileId: string;
  principalId: MemoryPrincipalId;
  runtime: AgentProfile["runtime"];
  // existing: interactive, approvalMode, slot, …
}
```

`runAgentTurn` / ACP / Cursor dispatch:

1. Resolve profile (from session or binding).
2. Set memory principal for all `memory_*` tools.
3. Filter skills by profile allow/deny lists.
4. Apply `policyLevel` defaults if no user override.
5. Choose model via `modelSlot`.

**Never** set `process.env` to switch persona (Hermes anti-pattern).

---

## 6. UI (Hermes-shaped)

### 6.1 Agents app — unstub

Replace `useAgentsStub` with `useAgents` → `/api/agents`.

| Tab (keep from stub) | Live data |
| --- | --- |
| Profile | name, avatar, description, enable |
| Models | modelSlot + approved models (light) |
| Memory | grants for `principalId` (link to Memory settings) |
| Access | skill allow/deny, policy level |
| Bindings (new) | list channel peers bound to this profile |

**Create agent** (Hermes create-profile flow, registry-backed):

1. Name → slug id `agent:user:<slug>`
2. Optional clone from `agent:builtin` (policy level, skills list)
3. Avatar
4. Seed memory grants: read working/episodic; no identity/semantic write

### 6.2 Composer agent chip (Hermes)

Always show active profile name/avatar on Chat + Studio composer.
Dropdown: enabled profiles + “Manage agents…”.
Persist last choice per user in settings or local store.

### 6.3 Channels Settings

On each approved peer row:

- Profile picker (default Builtin)
- Owner badge (already shipped)
- Hint: “Groups stay mention-gated; profile only changes which agent answers”

---

## 7. Phased roadmap

### Phase 0 — Types & contract (1–2 days) — **DONE**

| # | Work | Acceptance |
| --- | --- | --- |
| 0.1 | Add `shared/agents.ts` + Zod/JSON schema | Compiles; exported from shared |
| 0.2 | Extend `Session` with optional `profileId` | Types + sessionStore migrate |
| 0.3 | Document principal id convention | Matches memory-plan §3 |
| 0.4 | Cross-link from `model-agent-profiles-plan.md` | Status: Phase 2 in progress |

### Phase 1 — Agent registry (3–5 days) — **H1 DONE**

| # | Work | Acceptance |
| --- | --- | --- |
| 1.1 | `server/agents/agentStore.ts` | CRUD + seed builtin |
| 1.2 | REST `/api/agents` | list/get/create/patch/delete |
| 1.3 | Wire Agents app | No mocks; create/enable works |
| 1.4 | Composer profile chip | Selects profile for next chat session |
| 1.5 | Thread `principalId` into builtin loop memory tools | Channel still TODO until Phase 2 |

**Exit:** Operators can create “Alice” and chat as Alice in the shell.

### Phase 2 — Bindings + channel routing (3–5 days) — **H2 DONE**

| # | Work | Acceptance |
| --- | --- | --- |
| 2.1 | `profileId` on peers / binding records | Persisted in channels.json |
| 2.2 | `resolveChannelProfile` in gateway | Peer binding → profile |
| 2.3 | Per-peer session keys include profileId | No transcript bleed across peers on shared profile (dmScope per-peer) |
| 2.4 | Settings peer → profile picker | Visible + saved |
| 2.5 | Channel turns pass principal `agent:<profileId>` or `agent:channel:<id>` mapped to profile grants | Memory ACL hits right principal |
| 2.6 | Tests | Resolver unit tests (OpenClaw-style cases) |

**Exit:** Telegram user A → Builtin, user B → Alice; different memory/tools.

### Phase 3 — Policy & skills per profile (2–4 days) — **DONE**

| # | Work | Acceptance |
| --- | --- | --- |
| 3.1 | Apply `skills` / `skillsDisabled` at prompt build | Replace semantics |
| 3.2 | `policyLevel` → default tool policy when profile activates | User overrides still win |
| 3.3 | Restrict channel-bound profiles | Default `restricted`/`conservative` for new channel-oriented profiles |
| 3.4 | Surface context line in system prompt | “Inbound via Telegram group; mention-gated” (Hermes surface context) |

### Phase 4 — Runtime variety (optional, 1 week) — **DONE**

| # | Work | Notes |
| --- | --- | --- |
| 4.1 | Profile `runtime.kind: acp` | Bound Telegram peer can spawn ACP |
| 4.2 | Automations pick `profileId` | Instead of implicit builtin |
| 4.3 | Derived list rows for automations/channels | Agents app “running” status |

### Phase 5 — Profiles plan leftovers — **PARTIAL (types + badges + gate stub)**

| Shipped | Deferred |
| --- | --- |
| `shared/profiles.ts` + `canUseProfile` | Full certification runner / TestBench |
| Safety badges on Models + Agents | Parental allowlists enforcement UI |
| Model slot resolve calls `canUseProfile` | Suite result store (`profile-certifications.json`) |
| Seeded ACP presets + safety on builtin | Age-gated install flows |

---

## 8. File map

| Concern | Path |
| --- | --- |
| Types | `shared/agents.ts`, extend `shared/types.ts` Session/ChannelPeer |
| Store | `server/agents/agentStore.ts` |
| Resolve | `server/agents/resolveProfile.ts` |
| API | `server/routes/agents.ts` |
| Gateway | `server/channels/gateway.ts`, `channelStore.ts` |
| Loop | `server/agent/loop.ts`, `tools.ts` (principal), `systemPrompt.ts` (skills filter) |
| UI Agents | `src/apps/agents/*` — replace stub |
| UI Composer | `src/components/composer/` — profile chip |
| UI Channels | `ChannelsSection.tsx` — peer profile picker |
| Client | `src/lib/api.ts` |
| Tests | `server/agents/resolveProfile.test.ts`, binding fixtures |

---

## 9. Migration & defaults

1. Boot: if no `agents.json`, seed `agent:builtin` from current behavior.
2. Existing channel sessions: set `profileId = agent:builtin`.
3. Existing peers: unbound → builtin (no behavior change).
4. Global `settings.agent` (ACP/Cursor): migrate to **builtin profile’s runtime**
   or keep as “shell default runtime” until Phase 4 — document choice in PR.
   **Recommendation:** Phase 1 keeps `settings.agent` for interactive runtime;
   Phase 4 moves it onto the selected profile.

---

## 10. Explicit non-goals (v1)

| Non-goal | Why |
| --- | --- |
| OpenClaw workspace-per-agent files | Use memory + skills + prompt identity |
| Hermes HERMES_HOME switching | Racey; pass profile on turn |
| Multi-bot Telegram accounts | One bot + peer bindings |
| Guild/role/team binding tiers | No Discord/Slack yet |
| ClawHub / remote agent marketplace | Local registry only |
| Full certification enforcement | Separate profiles-plan track |
| Agent-to-agent messaging | Out of scope |

---

## 11. Acceptance criteria (complete)

- [x] `GET /api/agents` returns seeded builtin + user-created profiles
- [x] Agents app creates/edits/disables without mocks
- [x] Composer shows and switches active profile for new chat sessions
- [x] Channel peer can be bound to a non-default profile in Settings
- [x] Bound peer’s turns use that profile’s principal for `memory_*`
- [x] Two peers on different profiles do not share a session transcript
- [x] Unbound peers behave exactly as today (builtin)
- [x] Unit tests cover peer hit, miss → default, disabled profile fallback
- [x] Docs: this plan marked landed; `openclaw-port-plan` Phase H checked;
      `model-agent-profiles-plan` Phase 2 noted in progress/done

---

## 12. Suggested implementation order

```
Week 1:  Phase 0 + Phase 1 (registry + Agents UI + composer chip + principal in loop)
Week 2:  Phase 2 (bindings + gateway + Settings picker + tests)
Week 2–3: Phase 3 (skills/policy per profile + surface context)
Later:   Phase 4–5 as product needs
```

**Phases 0–3 landed** on `feat/openclaw-port-plan`. Phase 4 (ACP runtime /
automation profileId) and Phase 5 (safety badges) remain optional.

---

## 13. Immediate next step

**Phases 0–5 core are done** on `feat/openclaw-port-plan`. Remaining product
work: certification suites, parental allowlists UI, and optional ACP polish
for headless confirms — see `model-agent-profiles-plan.md`.
