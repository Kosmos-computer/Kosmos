# Design inspiration — matrix-os.com

Scan date: July 2026. Reference site: [matrix-os.com](https://matrix-os.com/).

This document captures patterns from Matrix OS marketing pages to inform the Longformer website. It is **inspiration**, not a copy — Longformer is a presentation OS shell, not a hosted cloud computer.

---

## Visual language

| Token | Matrix OS | Notes for Longformer |
|-------|-----------|----------------------|
| Page background | `#EEEEE2` warm cream | Calm, editorial; contrasts with dark dev-tool sites |
| Surface / cards | `#FCFCF8`, `#F4F3EA` | Soft elevation via shadow, not heavy borders |
| Primary text | `#32352E` olive-charcoal | High contrast without pure black |
| Muted text | `#7A7768`, `#5C5A4F` | Body copy and captions |
| Accent / links | `#434E3F` forest green | CTAs and inline links |
| Accent highlight | `#D06F25` orange | Isometric illustration highlights |
| Border | `#DCD9CC` | Subtle dividers in feature grids |
| Button primary | `#32352E` bg, `#FAFAF5` text | Rounded `0.625rem` |
| Button secondary | Frosted `rgba(252,252,248,0.85)` + border | Copy-prompt style actions |

### Typography

- **Display / hero**: Instrument Serif (or similar editorial serif) — large, light weight, tight tracking
- **UI / body**: Instrument Sans — clean geometric sans
- **Brand wordmark**: Orbitron or monospace-adjacent display for product name
- **Code / meta**: JetBrains Mono for technical callouts

Longformer demo currently uses Space Grotesk + Share Tech Mono — the www site can diverge toward Matrix’s warmer editorial stack or keep Longformer’s tech-mono identity with Matrix layout patterns.

### Motion

- Header enter: `translateY(-8px)` + fade, `cubic-bezier(0.16, 1, 0.3, 1)`
- Mega-menu: scale + translate pop from top-left
- Section reveal on scroll (`data-revealed`)
- Agent logo **marquee** with edge fade mask
- `prefers-reduced-motion` disables animations

### Chrome

- **Sticky header** with frosted pill clusters (brand | nav | actions)
- Mega-menu dropdowns: two-column grid (links + featured card)
- Mobile: full-screen sheet nav with large type
- Max content width ~`1400px`, hero text ~`56rem`

---

## Page structure (homepage)

1. **Hero** — serif headline, subcopy, primary CTA + secondary action, product screenshot in rounded card with soft shadow
2. **Integrations strip** — “Works with…” marquee of agent/tool logos
3. **Feature bento** — large card with headline + 2×2 grid of sub-features (each with isometric SVG illustration)
4. **Positioning block** — “Not a dashboard” / paradigm shift copy
5. **Architecture / technical** — Gateway → Kernel → Files style diagram (adapt to Shell → Engines → Workspaces)
6. **Design principles** — numbered constitution-style list
7. **Vision narrative** — “Web 4” style era comparison (adapt to unified AI workspace story)
8. **FAQ** — JSON-LD friendly Q&A
9. **Footer** — docs, GitHub, social, legal

### Secondary pages (Matrix has these — consider for Longformer)

| Path | Purpose |
|------|---------|
| `/technical` | Architecture deep-dive, stack table, heritage |
| `/whitepaper` | Long-form vision doc |
| `/docs` | Product documentation |
| `/blog` | Release notes, essays |
| `/team` | About |

---

## Content patterns worth borrowing

### Headline formula

> **[Category metaphor]** + **[audience]**  
> e.g. “A computer in the cloud for your AI agents”

Longformer adaptation:

> **A presentation OS for integrated AI work**  
> One shell. Many workspaces. Agents that render UI, code, and memory in place.

### “Not X, it’s Y”

Matrix repeatedly contrasts with dashboards and editors:

- “Matrix is not a dashboard. It is a private hosted computer…”
- “No. Matrix is the always-on cloud computer where coding agents…”

Longformer angle:

- “Longformer is not another chat wrapper. It is the shell where Chat, Code, Apps, and Memory share one focus context.”

### Agent ecosystem strip

Matrix lists Claude Code, Codex, Pi, OpenCode, Cursor, Gemini CLI.

Longformer lists **engines**: OpenClaw Gateway, OpenHands agent-canvas, OpenUI, Odysseus (optional productivity plane).

### Feature grid themes (mapped)

| Matrix | Longformer equivalent |
|--------|----------------------|
| Background agents | Persistent agent sessions + context panel |
| Every coding agent, one computer | OpenHands embed in Code workspace |
| Hermes (resident agent) | OpenClaw gateway + assistant bubble |
| Private by design | Self-hosted / owner-controlled runtimes |
| Symphony orchestration | Orchestrator workspace |
| Generative apps | OpenUI apps in Desktop + Apps workspace |

### CTA hierarchy

1. Primary: “Get started” → app signup
2. Secondary: “Copy agent prompt” → viral setup loop
3. Tertiary: deep links (“Explore Symphony”, “Read whitepaper”)

Longformer: “Try the demo” (longformer-demo), “Read the architecture”, “View on GitHub”.

---

## Technical stack (reference site)

Matrix `www/` package: Next.js 16, React 19, Vercel, Clerk auth, PostHog analytics.

**Longformer www (this package):** Vite + React SPA for fast iteration inside UI Experiments monorepo. Can migrate to Next.js later for SEO/MDX blog if needed.

---

## Assets to create later

- [ ] Product screenshot (AppShell with Chat + context panel)
- [ ] Isometric workspace illustrations (or reuse Matrix-style SVG primitives)
- [ ] OpenClaw / OpenHands / OpenUI logos for marquee
- [ ] OG image (`1200×630`)
- [ ] Favicon + wordmark
