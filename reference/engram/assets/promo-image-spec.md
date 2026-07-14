# Engram — Promotional Banner Image Spec

Target use: GitHub social preview card + README header. One hero image, wide.

---

## 1 · Intent (one line)

A memory trace made visible: a stained neuron that *is* a knowledge graph, its axon a forgetting curve being re-lifted by spaced review sparks — scientific-editorial, calm, expensive-looking.

## 2 · Canvas

- **Aspect: 2:1.** Render at **2560×1280** (downscales cleanly to GitHub's 1280×640 social card).
- Keep all critical content inside the central 90% vertically — a 3:1 README crop of the middle band must still work.
- Left third = text-safe zone (calm, low detail). Right two-thirds = artwork.

## 3 · Palette (exact, no additions)

| Role | Hex |
|---|---|
| Background (deep violet-black, near-solid) | `#171420` |
| Faint graph-paper grid on background (≤6% opacity) | `#332E40` |
| Neuron / graph edges + node glow (cresyl violet) | `#B29BE8` |
| Deeper violet for secondary glow / depth | `#6D4AA8` |
| Review sparks (warm amber, used exactly 4 times) | `#E0B45C` |
| Wordmark + brightest node cores (paper cream) | `#FAF9F6` |

No rainbow, no teal-orange, no neon green. Two hues + cream, that's the brand.

## 4 · Composition (by zone)

**Right two-thirds — the artwork.** A single elegant neuron rendered like a Golgi-stain / scientific ink illustration, glowing softly bioluminescent, stretching horizontally. Its dendrite branches resolve into a clean **concept graph**: 10–14 small luminous violet nodes connected by hairline edges, arranged with the organic-but-ordered feel of a force-directed graph. Exactly **three nodes glow brighter** (cream cores — the "threshold concepts"). The neuron's main **axon runs left-to-right as a curve that decays downward and is re-lifted at four evenly spaced points**; at each re-lift, a small **amber spark** (#E0B45C) — the visual metaphor: forgetting, interrupted on schedule. Linework crisp and vector-like; glow soft and restrained, not vaporwave.

**Left third — the wordmark.** Vertically centered:

- `ENGRAM` — elegant classical serif (Palatino/book-face feel), paper cream `#FAF9F6`, wide letter-spacing, all caps.
- Below it, one line in small monospace type, muted lavender `#B29BE8` at ~70% opacity:
  `learn anything. keep it.`

Nothing else. No badges, no icons, no URL.

**Background everywhere:** near-solid `#171420` with the barely-there graph-paper grid — lab-notebook restraint. Optional: one very faint, large, out-of-focus violet glow behind the neuron for depth.

## 5 · Style keywords

Scientific-editorial illustration · distill.pub / high-end dev-tool branding restraint · Golgi stain meets knowledge graph · soft bioluminescence on near-black · crisp hairline linework · generous negative space · flat-with-glow (not 3D render, not photo).

## 6 · Paste-ready prompt (flat, for the image model)

> Wide 2:1 promotional banner for a developer tool named ENGRAM, scientific-editorial illustration style. Deep violet-black background (#171420) with an extremely faint graph-paper grid. Across the right two-thirds, a single elegant neuron drawn like a glowing Golgi-stain ink illustration stretches horizontally; its dendrite branches resolve into a clean knowledge graph of about twelve small luminous violet nodes (#B29BE8) joined by hairline edges, exactly three nodes glowing brighter with cream-white cores. The neuron's long axon traces a gently decaying curve that is re-lifted at four evenly spaced points, each re-lift marked by a small warm amber spark (#E0B45C). Left third is calm negative space holding the wordmark: "ENGRAM" in an elegant classical serif, paper-cream white (#FAF9F6), all caps, wide letter-spacing, with a single small monospace tagline beneath it reading "learn anything. keep it." in muted lavender. Soft bioluminescent glow, crisp vector-like linework, generous negative space, distill.pub restraint, premium dev-tool branding, flat illustration with subtle glow, high contrast, no clutter.

## 7 · Negative prompt

> photorealistic brain, anatomical photo, glossy 3D render, chrome, rainbow gradients, neon circuit board, robot, android, lightbulb cliché, hands, people, UI screenshots, code editor, extra words, gibberish text, additional lettering beyond ENGRAM and the tagline, watermark, signature, logo soup, clutter, vaporwave grid sun

## 8 · Fallback plan (recommended if the model fumbles type)

Image models reliably mangle typography. If `ENGRAM` renders imperfectly even once:

1. Re-run with the wordmark instruction replaced by: *"leave the left third as calm, empty negative space."*
2. Composite the type yourself (Figma, or a 10-line HTML file): `ENGRAM` in Palatino/Iowan Old Style small-caps tracking +8%, tagline in SF Mono/Menlo 13px, colors per §3. Crisp type over generated art always beats generated type.

## 9 · Acceptance checklist

- [ ] Reads at 640px wide (thumbnail test): wordmark legible, curve-with-sparks visible
- [ ] Only text present: `ENGRAM` + `learn anything. keep it.` — spelled exactly
- [ ] Exactly 4 amber sparks, exactly 3 bright nodes (counts are brand, not decoration)
- [ ] No hue outside §3 palette
- [ ] Center 3:1 horizontal crop still composes (for README banner reuse)
