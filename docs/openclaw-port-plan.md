# OpenClaw → Kosmos Port Plan

> Written 2026-07-14. Companion to `channels-plan.md`, `memory-plan.md`,
> `agent-extensibility-plan.md`, `model-agent-profiles-plan.md`, and
> `roadmap.md`.
>
> **Reference clone:** `UI Experiments/reference/openclaw/`
> ([openclaw/openclaw](https://github.com/openclaw/openclaw) @ `b93f4bb3`,
> npm `2026.7.2`). Related cousins already studied: `openclaw-os/`,
> `nanoclaw/`, `nemoclaw/`. Synthesis: `UI Experiments/reference/LEARNINGS.md` §17.
>
> **Status: ACTIVE PLAN — Phases A–F, H1–H2 (+ agent-registry 0–5 core), and I
> landed on `feat/openclaw-port-plan` (2026-07-14).** Phase D memory Phase 1
> kernel landed (not full vector/RAG). Phase G (agent browser) remains deferred.

---

## 0. Principles

1. **Finish Arco features; don’t replace them.** Where Kosmos already has a
   design (`os.memory@1`, automations, skill gating, desktop cursor), OpenClaw
   is a **reference for gaps and polish**, not a system to lift wholesale.
2. **Steal patterns, not product identity.** OpenClaw’s home is messaging apps.
   Kosmos’s home is a generative OS. Channels stay an edge.
3. **Prefer incomplete → complete over new surface area.** Highest ROI is
   closing holes already called out in our own plans (mention gating, memory
   Phase 1, install probe, session queues).
4. **Keep Arco contracts.** Typed capabilities, ACLs, grant stores, and
   Settings patterns win over OpenClaw’s workspace-markdown-as-system.
5. **Cite the source.** Every work package below lists OpenClaw paths to
   study and the Kosmos owner files to change.

---

## 1. Inventory — what is already done

Do **not** re-port these. They already follow OpenClaw (or better).

| Area | Kosmos status | Evidence |
| --- | --- | --- |
| DM pairing + peer allowlist | Shipped | `server/channels/{gateway,channelStore}.ts`, Settings `ChannelsSection.tsx` |
| Deterministic reply routing | Shipped | Gateway always `adapter.send(chatId, reply)` to origin |
| Per-chat turn serialization (channels) | Shipped | `chatQueues` in `gateway.ts` |
| Headless channel turns (`confirm` → deny) | Shipped | `interactive: false` on channel/automation turns |
| Skill gating (`read_skill` before gated tools) | Shipped | `toolRegistry.ts` — openclaw-os pattern |
| Human gate on `save_skill` | Shipped | Confirm card before durable write (`tools.ts`) |
| AgentSkills `SKILL.md` format | Shipped | `skillStore.ts` — ClawHub-compatible layout |
| Automations (cron / events / delivery) | Shipped | `server/automations/` — stronger than heartbeat for job work |
| Desktop UI drive | Shipped | `ui_snapshot` / cursor — prefer over OpenClaw companion-node bus |
| Extensibility stack (MCP, ACP, policy, audit) | Shipped | `agent-extensibility-plan.md` marked SHIPPED |

---

## 2. Explicit non-ports

| OpenClaw pattern | Why not |
| --- | --- |
| Chat apps as primary UX / 20+ channel zoo | Product identity; Telegram (+1 later) until adapter contract is ironed |
| `MEMORY.md` + daily notes as the memory *system* | Conflicts with `docs/memory-plan.md` typed store + ACLs |
| Heartbeat daemon as core proactive loop | Automations already own cadence; silence tokens only if we add chatty check-ins |
| BOOTSTRAP / Molty identity ritual as product | Keep Arco identity; collect USER prefs into memory when memory ships |
| ClawHub marketplace (near-term) | Toxic-skill risk called out in extensibility plan; local seeds + confirm are safer |
| Container-per-group isolation | Memory plan chose ACLs; NanoClaw containers are out of scope |
| Companion node protocol (camera/screen bus) | Don’t replace in-OS cursor; add camera/screen later as `os.*` intents if needed |
| Parallel Canvas / A2UI HTML host | Map to OpenUI generative apps |
| Their SQLite schema / doctor CLI wholesale | Adopt “canonical store + migrate” principle only |
| Agent hierarchy frameworks | OpenClaw rejects them (`VISION.md`); so should we |

---

## 3. Incomplete Kosmos → OpenClaw completion map

This is the heart of the plan: **our half-built surfaces**, and what to
study in OpenClaw to finish them well.

### 3.1 Channels (v1 almost done — finish the gaps)

| Kosmos gap | Our doc | OpenClaw reference | Completion approach |
| --- | --- | --- | --- |
| Group mention gating | `channels-plan.md` “Not doing (v1)” | `docs/channels/groups.md`, Telegram plugin mention config | Add `requireMention` (default true for groups); strip @bot / reply-to-bot detection in `telegram.ts`; only then enqueue |
| Chat-based `/approve` for confirmations | channels-plan future | Pairing + command patterns in channel docs | Phase B: map `confirm_required` → channel reply with code; expire like pairing |
| Media / voice memos | channels-plan not doing | Channel media adapters | Defer until transcription plan needs inbound audio |
| Discord / WhatsApp | interface ready | `extensions/<channel>/` as adapter examples | After Telegram is solid (mention gate + optional approve) |
| Owner bootstrap on first approve | partial | `docs/channels/pairing.md` (first approve → ownerAllowFrom) | Ensure first approved peer can be tagged owner; document in Settings |

**Owner files:** `server/channels/telegram.ts`, `gateway.ts`, `channelStore.ts`,
`ChannelsSection.tsx`, `shared/types.ts`, `docs/channels-plan.md`.

### 3.2 Memory (proposed — largest incomplete system)

| Kosmos gap | Our plan | OpenClaw reference | What to borrow / what not |
| --- | --- | --- | --- |
| Kernel + tools missing | `memory-plan.md` Phase 1 | `docs/concepts/memory.md`, `memory_search` / `memory_get` tool UX | Borrow **tool shapes** (search vs get), **budgeted recall**, **never inject personal memory into group channels**. Implement with `memoryStore` + ACLs, not files |
| Session-end extract | Phase 3 | Dreaming / commitments / heartbeat distill | Borrow **async extract → pending review** idea; skip “dreaming” branding and deep/REM phases for v1 |
| Identity docs | world-model + memory Phase 3 | Templates `SOUL.md` / `USER.md` / `IDENTITY.md` | Borrow **section content ideas** as seeds for typed identity entries; do not make markdown files the runtime source of truth |
| Import foreign agent memory | memory-plan NanoClaw note | Workspace file layout | Optional importer: read OpenClaw workspace → `memory_write` proposals |

**Owner files:** `docs/memory-plan.md`, `shared/capabilities/memory.ts`,
`server/memory/*` (to create), `src/apps/memory/`, agent tools registration.

### 3.3 Install / first-run (partial)

| Kosmos gap | Today | OpenClaw reference | Completion approach |
| --- | --- | --- | --- |
| No live inference proof | `InstallFlow.tsx` + dep checks; mock path allowed | `docs/start/wizard.md` — prove completion before chat | After non-mock provider config: run one short completion; block Continue on failure; skip for mock |
| Persona onboarding stub | `src/apps/onboarding/` demo | `docs/start/bootstrapping.md` | Don’t copy ritual. After memory Phase 1: optional “About you” step that writes a USER memory entry |

**Owner files:** `src/os/auth/InstallFlow.tsx`, `scripts/lib/installChecks.ts`,
`server/system/installStatus.ts`.

### 3.4 Skills (shipped core — polish incomplete UX)

| Kosmos gap | Today | OpenClaw reference | Completion approach |
| --- | --- | --- | --- |
| No draft / proposal state | Confirm → write live skill | `docs/tools/skill-workshop.md`, `ui/src/pages/skill-workshop` | Add `proposed` skills: agent writes proposal; Skills app Apply / Reject / Quarantine; hash-bound update. Confirm-on-save remains the minimum bar |
| No remote verify / Skill Card | Local cards only | ClawHub verify + Skill Card | Defer marketplace; when needed, require verify envelope before enable |
| Lifecycle (stale / unused) | None | Workshop curator | After proposal flow: mark unused proposed skills stale |

**Owner files:** `server/skills/skillStore.ts`, `src/apps/skills/`,
`save_skill` in `tools.ts`.

### 3.5 Agent harness / sessions (partial)

| Kosmos gap | Today | OpenClaw reference | Completion approach |
| --- | --- | --- | --- |
| Interactive chat not queued | Channels have `chatQueues`; `/api/chat` does not | Session lanes / queue modes (`docs/concepts/queue.md`) | Shared `sessionQueue.enqueue(sessionId, task)` used by chat, channels, voice, automations |
| Compaction / pruning | Limited | `docs/concepts/compaction.md`, session pruning | When context meter moves off client estimate — study OpenClaw prune rules |
| Multi-agent bindings | Profiles plan proposed | `docs/concepts/multi-agent.md` | Implement via **agent profiles** (`model-agent-profiles-plan.md`), not OpenClaw workspace-per-binding files; bindings = channel peer → profile id |

**Owner files:** `server/index.ts` chat route, `server/agent/loop.ts`,
`server/channels/gateway.ts`, future `server/agent/sessionQueue.ts`.

### 3.6 Automations / proactive (shipped — optional polish)

| Kosmos gap | Today | OpenClaw reference | Completion approach |
| --- | --- | --- | --- |
| Soft “check in” without spam | Cron jobs always produce runs | Heartbeat + `HEARTBEAT_OK` | Optional automation kind `checkin`: if agent returns silence token / empty meaningful reply, skip channel delivery and mark run quiet |
| Standing orders | System prompt / skills | Injected standing orders in `AGENTS.md` | Prefer a skill or identity memory entry over a parallel heartbeat file |

**Owner files:** `server/automations/runAutomation.ts`, Automations app UI.

### 3.7 Browser / system access (incomplete for real browse)

| Kosmos gap | Today | OpenClaw reference | Completion approach |
| --- | --- | --- | --- |
| No agent-owned browser | `http_fetch` + Studio iframe | `docs/tools/browser.md`, `extensions/browser/` | Product decision: if we need login/JS sites, add isolated Chromium profile + snapshot/click tools; keep separate from user’s daily browser |
| Group/untrusted tool policy | Headless deny-confirm | Sandbox `non-main` | Prefer tighter channel tool policy + memory ACL defaults over Docker-per-chat |

**Owner files:** Studio `BrowserTab`, future `server/browser/` or tool module;
channel policy defaults.

### 3.8 Ops / config resilience (partial)

| Kosmos gap | Today | OpenClaw reference | Completion approach |
| --- | --- | --- | --- |
| Scattered migrations | `env.ts`, workspace/automation stores | `openclaw doctor --fix`, config schema | Single `arco doctor` (or Settings → Repair) that lists migrations + runs them; don’t clone OpenClaw’s CLI surface |

---

## 4. Phased roadmap

### Phase A — Close channel holes (1 week)

**Goal:** Telegram groups are safe by default; pairing polish matches OpenClaw.

| # | Work | Acceptance |
| --- | --- | --- |
| A1 | Group mention gating (default on) | Group messages without mention/reply-to-bot are ignored; Settings toggle per channel |
| A2 | First-approver owner tagging | Documented + visible in Channels UI |
| A3 | Update `channels-plan.md` | Move mention gating out of “Not doing” |

**OpenClaw study:** `docs/channels/groups.md`, `docs/channels/pairing.md`.

### Phase B — Install inference gate (3–5 days)

**Goal:** Non-mock installs cannot finish without a working model call.

| # | Work | Acceptance |
| --- | --- | --- |
| B1 | Live completion probe in InstallFlow | After cloud/local/Ollama/Kosmos path: one short completion; failure shows error + retry |
| B2 | Mock path unchanged | Mock still skips probe |

**OpenClaw study:** `docs/start/wizard.md`.

### Phase C — Session queue generalization (3–5 days)

**Goal:** One serialization primitive for all turn sources.

| # | Work | Acceptance |
| --- | --- | --- |
| C1 | Extract `sessionQueue` | Channels use shared helper |
| C2 | Wire `/api/chat` (+ voice if applicable) | Concurrent sends on same session serialize; no overlapping tool lanes |

**OpenClaw study:** `docs/concepts/queue.md`, `docs/concepts/session.md`.

### Phase D — Memory kernel (follow memory-plan Phases 1–3)

**Goal:** Ship Arco memory; use OpenClaw only for UX/safety lessons.

| # | Work | OpenClaw lesson | Acceptance |
| --- | --- | --- | --- |
| D1 | Phase 1 kernel + tools | `memory_search` / `memory_read` split | **Landed** on this branch — agent CRUD/search + ACLs |
| D2 | Channel memory defaults | No personal MEMORY in groups | Seed grants: channel/automation read-only working+episodic; tool principal threading TODO |
| D3 | Phase 3 extract → pending | Soft distill, not dreaming | Session-end proposals in Memory UI |
| D4 | Optional OpenClaw importer | File scaffold as import only | Settings action: import workspace folder → pending entries |

**Do not** implement `MEMORY.md` as runtime storage.

### Phase E — Skill proposals (1–2 weeks, after D or parallel)

**Goal:** Complete the skill authoring loop beyond confirm-on-save.

| # | Work | Acceptance |
| --- | --- | --- |
| E1 | `proposed` skill records + Skills UI review | Agent can draft without enabling; Apply writes live `SKILL.md` |
| E2 | Quarantine / reject | Rejected proposals do not gate tools |
| E3 | Optional scanner hook | Stub interface; real scanner later |

**OpenClaw study:** `docs/tools/skill-workshop.md`.

### Phase F — Proactive silence (optional, 2–3 days)

**Goal:** Channel check-ins don’t spam.

| # | Work | Acceptance |
| --- | --- | --- |
| F1 | Check-in automation kind or flag | Empty / `CHECKIN_OK` / configured silence → no `channel_send` |

**OpenClaw study:** `docs/gateway/heartbeat.md` (`HEARTBEAT_OK`).

### Phase G — Agent browser (product-gated)

**Goal:** Only if product needs real browse/login/automation beyond fetch.

| # | Work | Acceptance |
| --- | --- | --- |
| G1 | Isolated Chromium profile + tools | Agent browser ≠ user browser; snapshots + click/type |
| G2 | Policy | Disabled for channel principals by default |

**OpenClaw study:** `docs/tools/browser.md`, `extensions/browser/`.

### Phase H — Profiles + bindings (after model-agent-profiles)

**Goal:** Multi-persona without OpenClaw file sprawl.

| # | Work | Acceptance | Status |
| --- | --- | --- | --- |
| H1 | Agent profile registry | Profiles listable with tool/memory grants | **Done** (registry + Agents UI + composer chip + principal in loop) |
| H2 | Channel peer → profile binding | Telegram chat can target a profile | **Done** (peer.profileId + resolveChannelProfile + Settings picker) |

**Execution plan:** [`docs/agent-registry-bindings-plan.md`](./agent-registry-bindings-plan.md)
(Hermes UX + OpenClaw peer routing + Kosmos principals).

**OpenClaw study:** `docs/concepts/multi-agent.md` (bindings idea only).
**Hermes study:** profile chip, Profiles ≠ Workspaces, create-profile flow.

### Phase I — Doctor / repair (ongoing, low priority)

| # | Work | Acceptance |
| --- | --- | --- |
| I1 | Unified migration runner | One command or Settings panel; logs what changed |

---

## 5. Priority order (forced stack)

If only some work happens, do it in this order:

1. **A1** Mention gating — unfinished safety in a shipped feature  
2. **B1** Install inference probe — unfinished first-run quality  
3. **C1–C2** Session queues — unfinished harness correctness  
4. **D1–D3** Memory kernel (Arco plan) — largest incomplete subsystem; OpenClaw informs tools/safety only  
5. **E1–E2** Skill proposals — completes skills UX  
6. **F1** Check-in silence — polish for channel delivery  
7. **H1–H2** Profiles/bindings — after profiles plan  
8. **G1** Agent browser — only with clear product need  
9. **I1** Doctor — ops convenience  

---

## 6. How this updates existing docs

| Doc | Change when this plan is accepted |
| --- | --- |
| `channels-plan.md` | Promote mention gating to Phase A; link here |
| `memory-plan.md` | Add “OpenClaw lessons” subsection: tool UX, group ACL default, importer; reaffirm no file-as-system |
| `roadmap.md` | Add OpenClaw-port Phase A–E bullets under near-term |
| `agent-extensibility-plan.md` | Note Skill Workshop as Phase E polish (core already shipped) |
| `LEARNINGS.md` §17 | Point at this plan as the execution doc |

---

## 7. Success criteria

This plan is successful when:

- [x] Telegram groups default to mention-gated  
- [x] Non-mock install proves inference before first chat  
- [x] Chat + channels share session serialization  
- [x] Memory Phase 1 tools work with channel-safe ACL defaults inspired by OpenClaw  
- [x] Skills can be proposed without immediately going live  
- [x] Quiet check-in automations suppress channel delivery  
- [x] Doctor/repair surface exists  
- [x] We have **not** added a heartbeat daemon, ClawHub marketplace, or `MEMORY.md` runtime  

---

## 8. Immediate next step

**Landed on `feat/openclaw-port-plan`:** Phases A–F, H1–H2, I, and
agent-registry Phases 0–5 core (ACP runtime, automation profileId, running
status, safety badges + `canUseProfile` stub).

**Still deferred:** memory Phase 2+ (vector/RAG), D3 extract, D4 importer,
G agent browser, E3 skill scanner, full certification suites / parental UI.

Next product decision: open a PR for this branch or schedule memory Phase 2.
