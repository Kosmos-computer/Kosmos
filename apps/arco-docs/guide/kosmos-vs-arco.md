# Kosmos vs Arco

| | **Kosmos** | **Arco** |
|---|------------|----------|
| **What it is** | Generative AI operating system | Generative UI library |
| **Owns** | Shell, workspaces, agent UX, focus model, app platform | Tokens, components, blocks, registry contract |
| **User-facing name** | "Kosmos" on the marketing site and in product copy | "Arco" in docs, spec, and library APIs |
| **Package / app** | Root prototype (`arco-os`), `apps/www` marketing | `apps/arco-docs`, `src/components/ui/` |
| **Demo** | http://localhost:4610 | Documented at http://localhost:5175 |

## How they connect

```
┌─────────────────────────────────────────┐
│  Kosmos shell (NavRail, windows, apps)  │
├─────────────────────────────────────────┤
│  Workspaces: Chat, Studio, Settings…    │
├─────────────────────────────────────────┤
│  Arco: tokens → ui/ → patterns/ → blocks│
├─────────────────────────────────────────┤
│  Engines: OpenClaw, OpenHands, Odysseus │
└─────────────────────────────────────────┘
```

When an agent generates UI:

1. Kosmos provides **context** — which workspace, window, and entity is in focus.
2. Arco provides **vocabulary** — which blocks and props are valid.
3. The **registry** (planned) validates output and maps it to React renderers.

## Naming in docs and code

- Use **Kosmos** when describing the OS, shell, workspaces, or end-user product.
- Use **Arco** when describing tokens, components, blocks, schemas, or the generative library.
- The repo name `Arco-Prototype-2` reflects the prototype monorepo; product branding on the website is Kosmos.

See the [Arco spec overview](http://localhost:5174/spec.html) on the marketing site for architecture decisions.
