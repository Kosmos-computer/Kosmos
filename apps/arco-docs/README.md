# Arco documentation

VitePress documentation site for the **Arco** generative UI library.

- **Arco** — tokens, components, blocks, registry (this site)
- **Kosmos** — the generative AI OS (marketing site at http://localhost:5174)

## Develop

From the repo root:

```bash
npm install
npm run dev:arco-docs
```

Opens at **http://localhost:5175**.

Run alongside the Kosmos marketing site:

```bash
npm run dev:site
```

## Build

```bash
npm run build:arco-docs
```

Output: `apps/arco-docs/.vitepress/dist`

## Why VitePress?

- Markdown-first authoring with excellent local search
- Fast Vite-based dev server — fits the monorepo toolchain
- Sidebar/navigation config without a React framework overhead
- Easy to extend with Vue components later for live token previews

## Adding pages

1. Add a `.md` file under `guide/` or `reference/`
2. Register it in `.vitepress/config.ts` sidebar
3. Cross-link from related pages

Source-of-truth planning docs remain in the repo root `docs/` folder; this site is the user-facing documentation surface.
