# Kosmos website (`apps/www`)

Marketing website for **Kosmos** — the generative AI operating system.

This package lives inside the Arco-Prototype-2 monorepo as a **separate app** from the Kosmos shell prototype (port 4610).

**Arco** is the generative UI library; the spec overview lives at `/spec.html` and full documentation at `apps/arco-docs` (VitePress).

## Design reference

Visual and content patterns are documented from [matrix-os.com](https://matrix-os.com/):

- [`docs/DESIGN-INSPIRATION.md`](./docs/DESIGN-INSPIRATION.md) — palette, typography, layout, motion
- [`docs/CONTENT-BRIEF.md`](./docs/CONTENT-BRIEF.md) — Kosmos-specific messaging

## Develop

From the monorepo root:

```bash
npm install
npm run dev:www
```

Or from this package:

```bash
npm run dev
```

Runs on **http://localhost:5174** (Kosmos demo stays on 4610).

## Build

```bash
npm run build:www
```

## Structure

```
apps/www/
├── docs/           # Inspiration + content brief (not shipped)
├── src/
│   ├── content/    # Site copy constants
│   ├── components/ # Landing page sections
│   └── styles/     # Global tokens + shared utilities
├── index.html      # Kosmos landing
└── spec.html       # Arco design system spec overview
```

## Next steps

- Replace CSS mock preview with real AppShell screenshot
- Add `/architecture` and `/workspaces` routes (or migrate to Next.js for MDX blog)
- Wire “Try demo” to deployed preview URL
- Add OG image and favicon
