# Getting started

This guide covers how to work with Arco inside the Arco-Prototype-2 monorepo.

## Prerequisites

- Node.js 22+
- npm (workspaces enabled at repo root)

## Run Kosmos + docs locally

From the repo root:

```bash
npm install

# Kosmos shell (port 4610) + API server
npm run dev

# Marketing site (port 5174) + Arco docs (port 5175)
npm run dev:site
```

| Surface | URL | Package |
|---------|-----|---------|
| Kosmos prototype | http://localhost:4610 | root `vite` + server |
| Kosmos marketing | http://localhost:5174 | `apps/www` |
| Arco docs | http://localhost:5175 | `apps/arco-docs` |

## Where Arco lives in the codebase

```
src/styles/tokens.css     # --arco-* design tokens
src/styles/ui.css         # BEM classes for primitives
src/components/ui/        # React wrappers (Button, Input, …)
src/components/patterns/  # Layout patterns (MasterDetail, Section)
src/components/agent-blocks/  # Chat block renderers
src/apps/appview/         # Generated app surface (AppSurface)
```

## Using tokens in new UI

Always reference tokens — never hardcode colors or spacing:

```css
.my-panel {
  background: var(--arco-bg-surface);
  color: var(--arco-text-primary);
  border: 1px solid var(--arco-border);
  border-radius: var(--arco-radius-m);
  padding: var(--arco-space-l);
}
```

Theme switching uses `html[data-theme="dark"|"light"]`.

## Using UI primitives

```tsx
import { Button, Input, EmptyState } from "@/components/ui";

export function Example() {
  return (
    <EmptyState title="No items" action={<Button variant="primary">Create</Button>}>
      <Input placeholder="Search…" />
    </EmptyState>
  );
}
```

## Next steps

- [Design tokens](/guide/design-tokens) — full token categories
- [UI primitives](/guide/ui-primitives) — available components
- [Generative blocks](/guide/generative-blocks) — how AI output maps to UI
