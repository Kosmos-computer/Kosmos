# What is Arco?

**Arco** is the generative UI library for [Kosmos](http://localhost:5174). It provides the typed, themeable component vocabulary that AI agents assemble into chat blocks, workspace panels, and full installed apps.

Arco is **not** the operating system. Kosmos owns the shell, workspaces, agent UX, and focus model. Arco owns:

- Design tokens (`--arco-*`)
- UI primitives and layout patterns
- Generative blocks and their registry contract
- Runtime validation and render mapping for AI output

## Why a separate library?

Separating Arco from Kosmos lets you:

1. **Ship the UI contract as a standard** — other hosts (OpenClaw plugins, embedded React apps, MCP Apps) can render the same blocks without forking Kosmos.
2. **Keep generation bounded** — the AI assembles from schema-validated blocks, not arbitrary HTML or CSS.
3. **Theme once, render everywhere** — tokens flow from the OS shell into installed apps as `--os-*` aliases.

## Current status

Arco-Prototype-2 is an active prototype. The shell uses Arco tokens and a growing `ui/` + `patterns/` library. Generative rendering today flows through OpenUI Lang (`@openuidev/react-lang`) with a planned migration to a unified block registry.

See the [standards map](/reference/standards-map) for how Arco relates to AG-UI, MCP, and OpenUI.
