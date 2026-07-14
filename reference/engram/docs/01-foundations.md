# 01 · Foundations: The Science of Learning, Compiled for an Agent

This document is the theoretical constitution of Engram. Every design decision in the architecture must trace back to a principle here, and every principle here must survive its citations. Principles are grouped in three tiers: **the engine** (non-negotiable, strongest evidence), **encoding quality** (how ideas should first enter the mind), and **the learner as a system** (motivation, metacognition, biology). A final section handles what we deliberately reject.

A note on rigor: effect sizes below are from meta-analyses where available. Where a finding is robust but its magnitude is contested, that is said explicitly. This document prefers being usefully honest to being impressively certain.

---

## The unifying frame: learning is prediction error, structured and scheduled

One computational idea threads through nearly everything below: **brains update on prediction error**. Dopaminergic reward-prediction-error signaling (Schultz et al., 1997) is the textbook case, but the pattern generalizes: memory encoding is strongest when the mind has *committed to an expectation* and reality resolves it. Curiosity is the appetite for that resolution — Gruber, Gelman & Ranganath (2014, *Neuron*) showed that induced curiosity states (dopaminergic midbrain + hippocampal activation) enhance retention even of *incidental* material encountered while curious. Pretesting works this way (attempting an answer before learning improves later memory — Richland, Kornell & Kao 2009; Kornell, Hays & Bjork 2009, even when the attempt fails). The hypercorrection effect works this way (high-confidence errors, once corrected, are the *best*-remembered corrections — Butterfield & Metcalfe 2001; Metcalfe 2017, *Annual Review of Psychology*).

This frame matters for Engram because it converts a vague ideal ("active learning") into an operational rule:

> **Never resolve a question the learner hasn't first committed to.** Every explanation is preceded by a prediction, an attempt, or a stated expectation. The system's basic move is: elicit commitment → resolve → measure the surprise.

It also dignifies the founder's preferred style with a mechanism: a chain-of-necessity derivation is a *sequence of forced predictions* ("given this, what must follow?"), which is why derivation-first learning feels potent — each step is a micro prediction-error event, and the resulting structure is a coherent schema rather than a pile of facts.

---

## Tier 1 — The engine (non-negotiable)

### P1. Retrieval practice: testing is not measurement, it is the treatment

**Evidence.** Roediger & Karpicke (2006): after one week, repeated retrieval beat repeated studying decisively — while studiers *predicted* they'd do better (their judgments of learning were inverted). Karpicke & Blunt (2011, *Science*): retrieval practice outperformed elaborative concept mapping even on meaningful inference tests. Adesope, Trevisan & Sundararajan (2017, meta-analysis): g ≈ 0.61 versus restudy. Dunlosky et al. (2013, *Psychological Science in the Public Interest*) — the definitive utility review of ten techniques — rates **practice testing** one of only two "high utility" techniques. Format matters: free recall and short answer (production) generally beat recognition (MCQ); MCQ earns its keep only with competitive, plausible distractors.

**Mechanism.** Retrieval is a memory *modifier*, not a readout: successfully reconstructing a trace under effort strengthens and re-indexes it (retrieval as a fast route to consolidation — Antony, Ferreira, Norman & Wimber 2017, *TiCS*).

**Design consequence.** Retrieval is Engram's default interaction, not a quiz feature. Sessions open with recall, explanations end with production ("close the artifact; reconstruct the argument"), and the assessor grades *what the learner produced*, never what they recognized. The learner saying "makes sense" is treated as zero evidence.

### P2. Spacing: memory is a maintenance schedule

**Evidence.** The oldest effect in experimental psychology (Ebbinghaus 1885). Cepeda et al. (2006, meta-analysis of 254 studies): distributed practice reliably beats massed, with optimal gaps scaling with the retention interval. Dunlosky et al.'s second "high utility" technique. Rawson & Dunlosky (2011): **successive relearning** — retrieval to criterion, then re-retrieval across spaced sessions — produces retention that single-session mastery cannot approach. Bahrick (1984): well-spaced Spanish survived 50 years ("permastore"). At industrial scale, per-user forgetting models are standard: Duolingo's half-life regression (Settles & Meeder 2016, ACL), Mozer & Lindsey's DASH model deployed in classrooms (Lindsey, Shroyer, Pashler & Mozer 2014 — personalized review beat generic review on end-of-semester exams).

**Scheduling algorithm.** Leitner boxes → SM-2 (Wozniak, 1987; what most tutor plugins use) → **FSRS** (open-source; models memory as Difficulty–Stability–Retrievability and fits ~20 parameters to the individual's review history; in large-scale benchmarks on hundreds of millions of Anki reviews it predicts recall substantially better than SM-2; shipped as Anki's modern default). Engram uses FSRS. This is also the honest core of "the system learns the learner": it literally fits *your* forgetting curves.

**Design consequence.** Every concept node carries FSRS state from birth. The review queue is surfaced ambiently (session-start hook), sized in minutes, and never optional-by-default — skipping is a logged decision, not silence. "Learned but unscheduled" is a contradiction in Engram's data model.

### P3. Desirable difficulties: effort is the signal, fluency is the trap

**Evidence.** Bjork (1994): conditions that *slow* acquisition — spacing, interleaving, variation, generation, reduced cues — reliably *improve* retention and transfer. Interleaving: Rohrer & Taylor (2007) and Rohrer, Dedrick & Stershic (2015) showed large delayed-test advantages for mixed over blocked practice in math (learners, again, judged blocked practice as better). The inverse trap is the **fluency illusion**: ease of processing is misread as knowledge (Koriat & Bjork 2005). Rereading and highlighting — the world's favorite techniques — are rated *low utility* (Dunlosky et al. 2013) largely because they manufacture fluency without structure or retrieval. On difficulty targeting: Wilson, Shenhav, Straccia & Cohen (2019) derive an optimal training accuracy of ~85% for error-driven learners — suggestive rather than law, but it converges with ZPD intuition (Vygotsky) and flow theory: too easy teaches nothing, too hard teaches quitting.

**Design consequence.** Engram maintains a **difficulty setpoint** (~80–90% success on first-attempt retrievals; harder for transfer probes), interleaves once two or more topics reach practice stage, varies surface features of problems deliberately, and — because a beautiful HTML artifact is a fluency machine — enforces the Explorable Contract (§P6, and 03-architecture): no artifact may present a resolution the learner hasn't attempted. When the learner cruises, difficulty rises; when they thrash, scaffolding returns. Both boredom and frustration are treated as bugs with telemetry.

### P4. Feedback, mastery, and the tutoring ceiling

**Evidence.** Bloom (1984): one-on-one tutoring with mastery learning put average students ~2σ above conventional classrooms — famously optimistic, but the direction is secure; mastery learning alone shows ~0.5σ (Kulik et al.). VanLehn (2011): human tutors d ≈ 0.79; step-based intelligent tutoring systems d ≈ 0.76 — machine tutoring that adapts at the *step* level already matches humans. Feedback should be immediate, specific, and about the work; confidence should be collected *before* feedback so high-confidence errors can be exploited (hypercorrection, P-frame above) and calibration tracked. Advancement gates on demonstrated mastery of prerequisites, because knowledge is cumulative (knowledge-space theory: what you're "ready to learn" is determined by what you currently know — Doignon & Falmagne 1985, the theory under ALEKS).

**Design consequence.** Engram is a *step-level* tutor: it reacts to the learner's specific move, not just their final answer. Every assessment records (question, learner production, confidence-before-feedback, grade, misconception tags) as a **receipt**. Mastery gates are real: a node with shaky prerequisites can't be marked mastered, and repeated lapses trigger a prerequisite audit rather than repetition of the same card.

---

## Tier 2 — Encoding quality

### P5. Generative learning: the mind keeps what it makes

**Evidence.** Generation effect (Slamecka & Graf 1978). Self-explanation: Chi et al. (1989, 1994) — learners who explain *to themselves* why each step works learn dramatically more from the same materials; prompted self-explanation is a moderate-utility technique with broad support (Dunlosky et al. 2013; Fiorella & Mayer 2015, *Learning as a Generative Activity*, catalog eight generative strategies). Elaborative interrogation — answering "why would this be true?" — same family. The **ICAP framework** (Chi & Wylie 2014) orders engagement modes by learning yield: **Interactive > Constructive > Active > Passive**, with good empirical support. Teaching is the strongest generative act: the protégé effect (Chase et al. 2009 — students learn more preparing to teach an agent than preparing for a test); learning-by-teaching has meta-analytic support. Productive failure (Kapur 2008; Sinha & Kapur 2021 meta-analysis): letting learners *attempt* problems before instruction outperforms instruction-first, when followed by consolidation.

**Design consequence.** The tutor's dialogue grammar is generation-first: attempt → hint ladder → resolution → self-explanation prompt. A **struggle budget** (calibrated per learner) protects productive failure from the agent's instinct to help. Teach-back mode ("explain it to the student persona, who asks naive questions") is a scheduled activity, not a gimmick — it is the highest-yield retrieval format for conceptual material. The founder's chain-of-necessity preference lives here: "why must this follow?" is elaborative interrogation performed on a DAG.

### P6. Dual coding and multimedia: two channels, one architecture — for everyone

**Evidence.** Dual coding theory (Paivio 1971, 1986): verbal and visual channels are separate, limited, and additive — words + matched visuals beat either alone. Mayer's Cognitive Theory of Multimedia Learning (2001–2020) turns this into ~12 tested principles; the ones that matter most here: **multimedia** (words+pictures > words), **coherence** (decorative material *hurts* — seductive details effect), **signaling** (cue the structure), **segmenting** (learner-paced chunks), **pre-training** (names/components before mechanism), **spatial/temporal contiguity** (put labels on the thing), **personalization** (conversational style). Crucially, these are universals of cognitive architecture, *not* accommodations for "visual learners" — the benefit shows regardless of self-reported style (see §Rejections).

**Design consequence.** This is the scientific license for interactive HTML as a first-class medium — and the leash on it. The **Explorable Contract** every generated artifact must satisfy: (1) opens with a committed prediction or question, not exposition; (2) contains at least one manipulable model whose behavior the learner predicts before touching; (3) embeds retrieval prompts inline (the mnemonic medium — see 02-prior-art on Quantum Country); (4) zero decoration: every pixel either carries meaning or is deleted (coherence principle); (5) segmented and learner-paced; (6) self-contained offline HTML; (7) linked to its concept node so it regenerates as understanding deepens. "Seeing theory" is the floor; *touching theory under prediction* is the standard.

### P7. Cognitive load: respect the bottleneck, then remove the respect

**Evidence.** Working memory holds ~4 chunks; schemas in long-term memory are how experts bypass the limit (Sweller 1988; Sweller, van Merriënboer & Paas 2019 review). Consequences with strong support: the **worked-example effect** (novices learn more from studying worked solutions than solving cold); **split-attention** and **redundancy** effects (integrate, don't duplicate); and — pivotal for adaptation — the **expertise reversal effect** (Kalyuga et al. 2003): the scaffolds that help novices *actively harm* intermediates and experts, for whom problem-solving beats worked examples. Concreteness fading (Fyfe, McNeil, Son & Goldstone 2014): concrete → iconic → abstract is the reliable sequence for new formalisms.

**Design consequence.** Scaffolding is a *dial tied to the learner model*, not a style: novice at a node → worked example + completion problems; intermediate → faded steps; practiced → cold problems + variation. This single principle explains why the founder's derivation-first preference works *for the founder* (rarely a true novice in adjacent domains) and when the system must override it (genuinely new territory → concrete-first, derive second). Element-interactivity estimates also size the segments: high-interactivity topics get smaller DAG nodes.

### P8. Structure: knowledge is a graph with load-bearing edges

**Evidence.** "The most important single factor influencing learning is what the learner already knows. Ascertain this and teach him accordingly" (Ausubel 1968) — still the most confirmed sentence in educational psychology; prior knowledge dominates individual differences. Meaningful learning = anchoring new material to existing schema; advance organizers help. Knowledge-space theory (Doignon & Falmagne) makes prerequisite structure formal and adaptive assessment tractable. Threshold concepts (Meyer & Land 2003): some nodes are portals that reorganize everything after them (limits in calculus, pointers in C, recursion) — they deserve disproportionate investment. Analogical encoding (Gentner, Loewenstein & Thompson 2003): comparing *two* structured cases extracts the schema neither case shows alone. Variation theory (Marton): vary one dimension at a time to make structure visible.

**Design consequence.** The curriculum agent's output is not a syllabus but a **DAG of claims** with typed edges: `requires` (prerequisite), `derives-from` (chain of necessity), `contrasts-with` (variation pairs), `analogous-to` (for analogical encoding), plus an `arbitrary: true` flag for non-derivable facts (routed to mnemonic + SRS treatment instead of derivation). Diagnosis walks the graph frontier (knowledge-space style) instead of quizzing everything. Threshold nodes are flagged and get explorables + extra relearning cycles by default.

---

## Tier 3 — The learner as a system

### P9. Metacognition: learners are poor self-assessors, and that is fixable

**Evidence.** Judgments of learning are systematically miscalibrated toward fluency (Koriat & Bjork 2005); learners preferentially mass, reread, and stop too early (Zimmerman 2002 on self-regulated learning; Dunning-Kruger effects at the low end). But calibration improves with practice + feedback on the *calibration itself*, and **open learner models** — showing learners the system's model of them — improve metacognition and outcomes (Bull & Kay 2010+).

**Design consequence.** Confidence (0–100 or 4-level) is collected before every reveal; the coach maintains a calibration curve (confidence vs. accuracy) and *shows it to the learner*. Engram teaches its own science on day one — the onboarding is literally a lesson on testing, spacing, and fluency illusions, so the learner consents to the discomfort instead of churning on it. The learner model is an open file the learner can read; the system explains every adaptation ("I'm interleaving these two topics because...").

### P10. Motivation: the engine only runs if the driver shows up

**Evidence.** Self-Determination Theory (Ryan & Deci 2000): intrinsic motivation runs on **autonomy, competence, relatedness**; extrinsic rewards can undermine intrinsic interest (overjustification — Deci 1971; Lepper, Greene & Nisbett 1973) — a warning label on gamification: streaks build habits but risk goal displacement (Duolingo optimizes streak retention, not transfer). Interest develops in phases (Hidi & Renninger 2006): triggered situational → maintained → emerging individual → well-developed individual; early phases need situational hooks (curiosity gaps, relevance), later phases need depth and ownership. Flow (Csikszentmihalyi) converges with the difficulty setpoint. Self-efficacy (Bandura 1977) grows from *mastery experiences* — visible, attributable progress. Mindset interventions (Dweck): honest reading is small average effects (Sisk et al. 2018) that are real but modest for at-risk learners (Yeager et al. 2019, *Nature*) — seasoning, not a pillar.

**Design consequence.** Autonomy: the learner picks topics, goals, and pace; the system constrains *method*, never destination ("menus for navigation, never for knowledge"). Competence: the mastery map makes growth visible and attributable; weekly reports show retention curves bending upward. Relatedness: the tutor is a consistent, personable presence across sessions (memory makes this real). Curiosity: every session opens a loop before closing any (pretest as trigger). Gamification is limited to *consistency* mechanics (gentle streaks, tiny sessions to protect the habit) and never attached to knowledge claims. Examples are drawn from the learner's own projects and interests (self-reference effect; situated relevance) — Claude Code's unique privilege.

### P11. Biology: consolidation happens between sessions

**Evidence.** Systems consolidation runs on hippocampal–neocortical dialogue during sleep, especially slow-wave sleep for declarative material (McClelland, McNaughton & O'Reilly 1995 — complementary learning systems; Rasch & Born 2013 review); sleep deprivation measurably impairs both encoding and consolidation (Walker). Spacing has synaptic-level rationale: repeated stimulation with rest intervals outperforms massed at the level of LTP itself (Smolen, Zhang & Byrne 2016, *Nat Rev Neurosci*). Aerobic exercise raises BDNF and is associated with hippocampal benefits (Erickson et al. 2011). Acute stress impairs retrieval; moderate arousal aids encoding (McGaugh). None of this licenses neuro-decorated marketing; all of it licenses **scheduling across nights**.

**Design consequence.** New→review gaps are ≥1 sleep by design (FSRS naturally does this); the coach flags cram patterns ("three sessions today, none for six days — spacing beats bingeing, here's your own retention data"), prefers many short sessions to marathons, and treats late-night new-material sessions as lower-expected-yield (advisory, never nagging).

### P12. Transfer: the point of all of it

**Evidence.** Transfer is hard and mostly *near* (Barnett & Ceci 2002 taxonomy); it improves with: varied practice and interleaving (P3), analogical comparison across surface-different cases (P8), self-explanation of principles (P5), and deliberate bridging to application contexts. Constructionism (Papert 1980): building a personally meaningful artifact forces integration no quiz reaches. Situated learning (Lave & Wenger 1991): knowledge binds to contexts of use. Deliberate practice (Ericsson, Krampe & Tesch-Römer 1993): expert skill grows from effortful practice on *targeted weaknesses* with immediate feedback — not from accumulated exposure.

**Design consequence.** Every topic ends in a **build**: a real artifact in the learner's real environment (code in their repo, a memo, a taught lesson, an explorable *they* author). Transfer probes intentionally cross surface contexts ("you learned this on databases; here it is wearing a distributed-systems costume"). The system mines the learner's actual work for application moments (the `learning-opportunities` pattern, see 02-prior-art) — the rarest and most valuable feature Claude Code can offer, because it is present when knowledge is *used*.

---

## Rejections: what Engram deliberately does not build on

**Learning styles / VARK meshing.** The claim that matching instruction modality to a diagnosed style improves learning has been tested and has failed: Pashler, McDaniel, Rohrer & Bjork (2008, *PSPI*) found virtually no methodologically sound support; Coffield et al. (2004) reviewed 71 style instruments and found a psychometric wasteland; direct tests (e.g., Rogowsky, Calhoun & Tallal 2015) find no style×modality interaction. Yet ~90%+ of educators believe it (Dekker et al. 2012; Newton 2015) — it is the flagship neuromyth, and it persists in the 2026 plugin ecosystem (see 02-prior-art). Willingham's rule replaces it: *the best modality is the one that matches the content, not the learner.* Also rejected: left/right-brained learners, "we use 10% of our brains," Mozart effect, unadapted "brain training" transfer claims.

**What replaces "learner type detection" — the honest learner model.** The founder's instinct (the system should learn the learner and adapt) is correct; only the axis was wrong. Dimensions that measurably matter, all fittable from Engram's own telemetry:

| Dimension | Evidence base | How Engram measures it |
|---|---|---|
| Prior knowledge (per domain) | Ausubel; expertise reversal | Diagnostic frontier walks; ongoing performance |
| Personal forgetting parameters | FSRS; Settles & Meeder 2016; Lindsey et al. 2014 | Fitted from the learner's own review history |
| Calibration (confidence vs. accuracy) | Koriat; Metcalfe | Confidence-before-feedback on every item |
| Challenge band (frustration/boredom edges) | Wilson et al. 2019; flow | Success rates, latency, hint usage, session abandonment |
| Interests & goals (for examples and relevance) | Hidi & Renninger; SDT | Stated + observed (what they build, what they ask) |
| Engagement rhythms (session length, cadence, time-of-day yield) | pragmatic, weak-to-moderate evidence | Session telemetry vs. next-day retention |
| Strategy response (does derivation-first beat example-first *for this learner, in this domain*?) | n-of-1 experimentation | Alternate strategies across comparable nodes; compare 7-day retention |
| Accessibility needs (dyslexia, ADHD, color vision, etc.) | real and documented | Declared, always honored — needs, not "styles" |

Note the last row of contrast: honoring *preferences* (the learner enjoys visual explorables) is legitimate — preference drives engagement, and consistency dominates all other variables — but Engram treats preference as a motivation lever, and lets retention data arbitrate any conflict with content-appropriate modality.

**Sycophancy as pedagogy.** An LLM's default is to be maximally helpful *now* — give the answer, agree with the self-assessment, praise the summary. Every principle above says this steals the learning. The tutor's discipline (struggle budgets, withheld resolutions, independent grading) is Engram's hardest engineering problem and its deepest differentiator. See 03-architecture §Assessor for the separation-of-powers design.

---

## The founding question, answered fully

**Q: Can first-principles/chain-of-necessity + interactive HTML be the central theory?**

**A: It is the rightful *encoding* core (Pillars 1–2), it is evidence-backed for all learners rather than a personal taste, and it becomes the central theory only when welded to the retention engine (Pillar 3) and the honest learner model (Pillar 4).**

The precise mapping of your instincts to the literature:

- *Chain of necessity* = elaborative interrogation (moderate utility, Dunlosky) + self-explanation (Chi) + generation effect + schema coherence (Ausubel) + a sequence of prediction-error events (the unifying frame). For derivational domains — math, physics, CS, economics, engineering — this is close to optimal encoding.
- *Interactive, well-designed HTML* = dual coding + Mayer's principles + ICAP's top tiers + the explorable-explanations tradition (Victor 2011; Case; distill.pub; Brown's *Seeing Theory* — the phrase you used is its name). Universal cognitive architecture, not a style.

The two corrections the evidence forces:

1. **Add the engine.** Derived understanding decays on the same forgetting curve as memorized facts; only scheduled retrieval bends it (P1–P2). Worse, well-designed artifacts *maximize fluency*, the very signal learners misread as durable knowledge (P3). Hence the Explorable Contract: artifacts must demand prediction and embed retrieval, or they become beautiful forgetting.
2. **Bound the domain.** Necessity chains need derivable structure and spare working-memory capacity. Arbitrary content (vocabulary, anatomy, conventions, history particulars) routes to mnemonic + spacing treatment; genuinely novice territory routes through concrete examples first (P7). The DAG's `arbitrary` flag and the scaffolding dial are those boundaries, and your own n-of-1 data (Pillar 4) arbitrates where they sit for you.

So the system's slogan version: **derive what can be derived, memorize only what cannot, test everything, schedule everything, and let the learner's own data tune the machine.**
