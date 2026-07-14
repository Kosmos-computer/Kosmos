# 02 · Prior Art: What Exists, What It Teaches, What It Misses

Reviewed July 2026. Five categories: spaced-repetition engines, mastery platforms, the explorable/mnemonic-medium tradition, tutoring systems (classic ITS → LLM tutors), and the Claude Code ecosystem itself. Each entry: what it nails → what it lacks → what Engram adopts.

---

## A. Spaced-repetition engines (the retention lineage)

**SuperMemo** (Woźniak, 1987–). Origin of algorithmic scheduling (SM-2 → SM-18) and of *incremental reading*. Nails: the insight that review timing is computable. Lacks: usability (legendarily hostile), understanding-building — it schedules items, it doesn't teach.

**Anki** (2006–). The open ecosystem standard; since ~2023 ships **FSRS** (Difficulty–Stability–Retrievability model, ~20 parameters fitted per user from review logs; benchmarked on hundreds of millions of reviews, substantially better recall prediction than SM-2). Nails: retention for atomic items, at scale, for free. Lacks: authoring is the tax (most people quit at card-writing); cards drift into disconnected trivia ("orphan cards"); no structure, no dialogue, no transfer. **RemNote / Mochi / Obsidian SR plugin**: notes+SRS fusions, same ceiling.

**Adopts:** FSRS as the scheduling engine, verbatim — it is open, per-user, and state-of-the-art. **Fixes:** the authoring tax (Engram writes and maintains the cards from the tutoring dialogue itself; every card links back to a DAG node and its artifact, so no orphans).

## B. Mastery & adaptive platforms

**ALEKS** (1990s–, from Doignon & Falmagne's knowledge-space theory). Nails: assessment as *frontier-finding* — determine what the student is ready to learn, teach only there. **Khan Academy**: mastery gating at consumer scale. **Math Academy** (2020s): the aggressive synthesis — mastery + spacing + interleaving + XP, with a public pedagogy manifesto; the strongest evidence-alignment in commercial ed-tech. **Duolingo**: habit engineering (streaks, tiny sessions) + industrial per-user forgetting models (half-life regression — Settles & Meeder 2016); criticized for shallow transfer. **Brilliant**: guided-discovery problem sequences; strong encoding, weak scheduling.

**Adopts:** frontier diagnosis (never quiz the whole graph), mastery gates on prerequisite edges, tiny-session habit design. **Rejects:** fixed content (Engram generates per learner), streak-anxiety mechanics (consistency nudges only), XP attached to knowledge claims.

## C. Explorables & the mnemonic medium (the encoding lineage)

**Bret Victor, "Explorable Explanations" (2011)** — the founding document: reactive documents where readers *interrogate* assumptions. **Nicky Case** (Parable of the Polygons, Evolution of Trust) — the craft at its peak. **distill.pub** (2016–2021) — interactive ML papers; died of authoring cost. **Seeing Theory** (Brown University) — interactive probability/statistics; the founder's phrase "seeing theory" is its name. **PhET simulations** — manipulables with measured learning gains.

**Quantum Country** (Matuschak & Nielsen 2019, and the essays "Why books don't work" / "How can we develop transformative tools for thought?"): the **mnemonic medium** — an essay with retrieval prompts *embedded in the reading flow*, scheduled thereafter. Their reported data: readers retain with dramatically less review effort than traditional study. The deepest single influence on Engram's artifact design.

**The tradition's fatal economics:** every one of these is handcrafted, at weeks-to-months per artifact, by rare talent. That is exactly what a code-generating agent dissolves. **Adopts:** the whole design language (reactive models, prediction gates, embedded retrieval), as a *generative* capability under the Explorable Contract — custom explorables per concept per learner in minutes, regenerated as the learner model updates. **Adds what even Quantum Country lacks:** dialogue, grading, adaptation, and integration with the learner's real work.

## D. Tutoring systems: classic ITS → LLM tutors

**Classic ITS.** Carnegie's Cognitive Tutor (Anderson's ACT-R model-tracing), AutoTutor (Graesser — dialogue tutoring), ASSISTments. Bayesian Knowledge Tracing (Corbett & Anderson 1995) for skill estimation. The sobering, encouraging summary: VanLehn (2011) — step-based ITS d≈0.76 vs. human tutors d≈0.79. Machine tutoring works when it adapts at the **step** level, not the answer level. Lacks: decades of hand-built domain models per subject — the content bottleneck LLMs dissolve.

**LLM tutors (2023–2026).** **Khanmigo** (Socratic guardrails, GPT-based); **Google LearnLM** (pedagogy-finetuned, folded into Gemini); **OpenAI ChatGPT Study Mode** (2025 — withholds answers, asks guiding questions); **Anthropic Claude Learning Mode** (Claude for Education, 2025) and Claude Code's own Explanatory/Learning output styles (the `TODO(human)` collaborative-completion pattern — a genuine invention: the tutor writes most, the learner completes the load-bearing part). Common shape and common ceiling: **session-Socratic, state-amnesiac.** They guide within a conversation, then forget you. No durable learner model, no scheduling, no artifacts, no telemetry. They are tutors without memory — which, per Tier 1 of the foundations, means they are tutors without the engine.

**Adopts:** Socratic step-level dialogue, `TODO(human)` completion pattern for code. **Fixes:** persistence (files), scheduling (FSRS), verification (independent assessor), adaptation (n-of-1).

## E. The Claude Code ecosystem (July 2026)

| Plugin / skill | What it does | Gap against the foundations |
|---|---|---|
| [claude-tutor](https://github.com/kirilxd/claude-tutor) | Learning plans, adaptive quizzes, SM-2 reviews, web dashboard, JSON state in `~/.claude/learning/` | SM-2 (not per-user), MCQ/recognition-heavy (weak retrieval format), no citations to learning science beyond the algorithm name, reported schema drift, no artifacts, no calibration/metacognition |
| [claude-teacher-plugin](https://github.com/yarikleto/claude-teacher-plugin) | Guides rather than answers, tracks knowledge across sessions, quizzes with spacing | Persists a "learning style" per user — builds on the flagship neuromyth; no verification separation (tutor grades itself) |
| [learning-opportunities](https://github.com/DrCatHicks/learning-opportunities) (Hicks — a real developer-psychology researcher) | Injects prediction/generation/retrieval/spacing exercises after meaningful *real work* moments; explicitly anti-passivity | Deliberately lightweight: session-only state, no learner model, no cross-session scheduling, no difficulty adaptation |
| [learn-faster-kit](https://github.com/hluaguo/learn-faster-kit) | Syllabi + spaced repetition + progress tracking | Same recognition-quiz and one-size-scheduling ceiling |
| [fluent](https://github.com/m98/fluent), [lang-tutor](https://github.com/hamsamilton/lang-tutor) | Language-specific practice/SRS | Single-domain |
| [claude-code-production-grade-plugin](https://github.com/nagisanzenin/claude-code-production-grade-plugin) (the architectural parent) | Not a learning tool — a 14-agent SaaS pipeline. Contributes the patterns: **oracle-driven loops** (executable checks, never claims), **receipt enforcement** (JSON proof of work gates progress), **re-anchoring** (re-read state from disk at phase boundaries), cross-session persistence, engagement modes | — (this is the chassis Engram inherits) |

**The ecosystem's four systematic gaps, which define Engram:**

1. **Recognition masquerading as retrieval.** Quizzes are MCQ/true-false because they're easy to grade programmatically. But recognition is the weakest retrieval format — and an LLM can grade *free recall* with a rubric, which is precisely the capability that made classic ITS expensive. Nobody is spending it.
2. **The tutor grades itself.** Same-context grading inherits the tutor's sycophancy and its investment in the lesson having worked. No plugin separates assessment from instruction the way the parent plugin separates `code-reviewer` from `software-engineer`.
3. **Scheduling without a memory model.** SM-2 fixed intervals vs. FSRS fitted to the individual — the difference between a thermostat and a schedule printed in 1987.
4. **No artifacts, no medium.** Text dialogue only. The entire explorable/mnemonic-medium tradition — the highest-craft encoding technology we have — is absent from the ecosystem, even though artifact generation is Claude Code's *distinctive* strength.

Plus the honest one: **claude-teacher-plugin persists "learning style"** — the ecosystem is not merely incomplete, it is partly built on the one idea the evidence base most firmly rejects. Engram's positioning is not "more features"; it is *the one whose theory would survive peer review*.

---

## Synthesis: the unclaimed combination

| Capability | Anki/FSRS | Math Academy | Quantum Country | Khanmigo/Study Mode | claude-tutor | learning-opps | **Engram** |
|---|---|---|---|---|---|---|---|
| Per-user memory model | ✅ | partial | ✅ | ❌ | ❌ (SM-2) | ❌ | ✅ FSRS |
| Free-recall assessment, graded | ❌ | partial | ❌ (self-graded) | partial, unlogged | ❌ (MCQ) | prompts, ungraded | ✅ independent assessor + receipts |
| First-principles knowledge graph | ❌ | ✅ (math only) | ❌ | ❌ | shallow plans | ❌ | ✅ any domain, typed edges |
| Interactive explorables | ❌ | ❌ | ✅ handcrafted | ❌ | ❌ | ❌ | ✅ generated, contract-bound |
| Socratic step-level dialogue | ❌ | ❌ | ❌ | ✅ | partial | ✅ | ✅ |
| Situated in real work | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Evidence-fitted adaptation (n-of-1) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Open learner model | ❌ | ❌ | ❌ | ❌ | dashboard | ❌ | ✅ readable files + taught science |

No system in any category holds more than three of these simultaneously. The combination is the thesis.
