# Longformer website — content brief

Derived from `Project-planning.md` and Matrix OS messaging patterns.

---

## Positioning

**One-liner:** Longformer is the presentation OS — a unified shell where AI agents, generated apps, and everyday workspaces share context.

**Elevator pitch:** Longformer is not a collection of random pages. It is a layered AI OS prototype: stable shell, ~34 workspaces, multi-form-factor surfaces, and agent UX that renders OpenUI blocks inline. OpenClaw, OpenHands, and OpenUI plug in as engines; Longformer owns navigation, focus, and the integrated experience.

---

## Audience

1. **Builders** evaluating the integrated Longformer + OpenClaw + OpenHands stack
2. **Design/engineering** exploring AI-native workspace UX
3. **Contributors** to UI Experiments repos

---

## Key messages

1. **Shell first** — `rail | sidebar | main | contextPanel` stays stable; only workspace content changes
2. **Engines, not monolith** — OpenClaw (agent), OpenHands (code sandbox), OpenUI (gen-UI), optional Odysseus (productivity)
3. **Generate in place** — agents emit OpenUI; apps run inside Desktop and Apps workspaces
4. **One focus context** — assistant knows what workspace and entity you are looking at
5. **Every form factor** — same workspaces as full-screen, desktop windows, phone stack, watch glances

---

## Homepage sections (draft copy)

### Hero

**H1:** A presentation OS for integrated AI work

**Sub:** One shell for chat, code, files, and generated apps. Plug in OpenClaw, OpenHands, and OpenUI — agents share focus context across every workspace.

**CTA:** Try the demo · Read the architecture

### Integrations

Works with the runtimes you already run: OpenClaw Gateway, OpenHands agent-canvas, OpenUI Lang, Odysseus services.

### Feature bento

| Title | Copy |
|-------|------|
| Stable shell | Nav rail, sidebar, main, and context panel — switch workspaces without reshuffling chrome. |
| Agent surface | Chat, Orchestrator, Psyche, and inline generated UI — the brain stays in the context panel. |
| Code workspace | OpenHands agent-canvas embedded for terminals, diffs, and repo work — not a separate product tab. |
| Generated apps | Describe an app in chat; OpenUI renders it inside Desktop windows and the Apps grid. |

### Not a dashboard

Longformer is not another chat sidebar bolted onto SaaS tools. It is the integrated presentation layer where agents, data, and UI blocks share one session model.

### Architecture teaser

```
Devices / browsers
       ↓
Longformer shell (React)
       ↓
Engines: OpenClaw · OpenHands · OpenUI · Odysseus (optional)
       ↓
Workspaces + entity store + focus context
```

### Principles (from planning doc)

1. **Shell stability** — chrome is invariant; workspaces plug into slots
2. **One agent envelope** — typed messages, shared focus, no magic strings
3. **Engine boundaries** — each backend owns its domain; Longformer composes
4. **Generated UI is first-class** — OpenUI streams into Chat and Desktop
5. **Surgical integration** — no forced monorepo merge

### FAQ (starter)

- **Is Longformer a product or a prototype?** UI Experiments is the design prototype; production path is OpenClaw plugin + embedded engines.
- **Do I need all backends?** MVP: OpenClaw + OpenUI. Code workspace adds OpenHands. Odysseus is optional for RAG/productivity.
- **How is this different from agent-canvas alone?** agent-canvas is the coding engine; Longformer is the full OS shell around it.
- **Can I self-host?** Yes — composed stack (gateway, agent-server, static UI) per repo docs.

---

## Pages to add (phase 2)

- `/architecture` — three-layer model, workspace taxonomy, integration phases
- `/workspaces` — grid of all ~34 workspaces by layer
- `/engines` — what to take from each repo
- `/demo` — link to longformer-demo dev server
