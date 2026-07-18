# Reference repos

Read-only clones for architecture evaluation, prior-art study, and selective porting.
Live under `reference/` (local clones; not shipped with Arco/Kosmos).

To refresh a clone:

```bash
git -C reference/<name> pull --ff-only
# or re-clone:
rm -rf reference/<name> && git clone --depth 1 <url> reference/<name>
```

---

## engram — evidence-based learning engine

| | |
| --- | --- |
| **Path** | `reference/engram/` |
| **Upstream** | https://github.com/nagisanzenin/engram |
| **License** | MIT |
| **Size** | ~2.2 MB (shallow) |
| **Added** | 2026-07-08 |

Claude Code / Codex plugin: first-principles curricula, Socratic tutoring, blind
free-recall grading with receipts, FSRS-4.5 scheduling, and generated HTML
explorables. Deterministic core is stdlib-only Python (`scripts/engram.py`).

**Primary docs in clone:** `docs/01-foundations.md` (learning science),
`docs/02-prior-art.md` (landscape vs Anki, ITS, LLM tutors),
`docs/03-architecture.md` (agent separation, state schemas, hooks).

### Relevance to Arco / Kosmos

| Engram | Arco / Kosmos today | Takeaway |
| --- | --- | --- |
| Skills (`/learn`, `/review`, `/coach`) | Skills shipped (`server/skills/skillStore.ts`, `skills/*`) | Same SKILL.md + frontmatter ecosystem; Engram shows **domain-specific skill suites** with a deterministic CLI backend |
| Subagents (curriculum-architect, assessor, artifact-smith) | ACP subprocess agents + built-in loop | **Separation of powers**: tutor never grades first exposure; assessor sees rubric + learner words only — mirrors production-grade-plugin → Engram lineage |
| SessionStart hook (due-review nudge) | No session hooks in Arco shell | Pattern for **ambient re-anchoring** from disk state; pairs with proposed memory recall prefill |
| `~/.claude/learning/` JSON state | `docs/memory-plan.md` (proposed, not shipped) | Engram is a **working reference implementation** for typed memory kinds: episodic receipts, semantic graphs, procedural learner model, reference artifacts |
| FSRS scheduling in code | No SRS in Arco | If Arco adds retention/review, **never let the LLM do calendar math** — port the oracle pattern |
| Explorable HTML artifacts | Generative UI (OpenUI Lang) + world-model explorer | Different medium (hand-authored HTML widgets vs reactive apps), but **prediction gates** and threshold-concept encoding translate to Arco app generation |
| Plugin marketplace (Claude + Codex) | MCP client/server, skills, desktop packaging | Distribution model for **installable agent capabilities** without forking the OS |

**Not a product overlap:** Engram is a personal learning tutor inside the coding
agent; Arco/Kosmos is an AI OS (shell, apps, agent tools, PIM, automations).
The overlap is **agent architecture** — skills, hooks, receipts, deterministic
oracles, and durable cross-session state — not end-user feature parity.

**Adopt (when memory ships):** receipt-gated state transitions, assessor isolation
for high-stakes writes, SessionStart re-anchor from persisted learner model,
stdlib/TS deterministic scheduler separate from the LLM loop.

**Skip for Arco v1:** FSRS curriculum graphs, explorable contract, `/learn` tutoring
flow — unless Arco explicitly productizes a Learning workspace.

---

## fathom-labs — transcription / podcast pipeline

| | |
| --- | --- |
| **Path** | `reference/fathom-labs/` |
| **Upstream** | https://github.com/fathom-labs (multi-repo org) |
| **Inventory** | `docs/transcription-plan.md` §16 |

Primary source for Longformer transcription migration: `fathom-core` domain
logic, `podium-web` transcript editor UX, `fathom-asr-core` GPU ASR package.

---

## UI Experiments / reference (external)

Architecture notes for Joplin, agent-canvas, OpenClaw, Hermes, Orca, etc. live
in `UI Experiments/reference/LEARNINGS.md` and `docs/agent-extensibility-plan.md`
§2. Those clones are maintained outside this repo under
`UI Experiments/reference/`.

### hermes-agent — self-improving agent runtime

| | |
| --- | --- |
| **Path** | `UI Experiments/reference/hermes-agent/` |
| **Upstream** | https://github.com/NousResearch/hermes-agent |
| **Added** | 2026-07-15 |
| **Learnings** | `UI Experiments/reference/LEARNINGS.md` §19 |

Distinct from `hermes-webui/` (UI shell). Steal: closed learning loop →
**proposal** pipeline, FTS5 session search, toolset scoping, skill self-improve.
Skip: `HERMES_HOME`, markdown memory as SoT, messenger zoo, autonomous skill
writes without Apply/Reject. See also `docs/memory-plan.md`,
`docs/agent-registry-bindings-plan.md` §1.1.
