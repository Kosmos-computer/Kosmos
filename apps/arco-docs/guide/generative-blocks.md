# Generative blocks

Generative blocks are Arco's **Tier 2** components — data-driven composites the AI assembles (stat cards, calendars, media grids, forms, etc.).

## Today: OpenUI Lang

Chat and generated apps currently render through:

- `@openuidev/lang-core` — grammar and patch semantics
- `@openuidev/react-lang` — React renderer
- `@openuidev/react-ui` — component vocabulary

The agent emits Lang statements; `AppSurface` and `AssistantBlock` resolve them to React components with live tool binding.

## Target: block registry

The planned `defineBlock()` contract replaces implicit type unions with one manifest per block:

```ts
defineBlock({
  type: "statCards",
  schema: z.object({ /* … */ }),
  description: "Grid of KPI stat cards…",
  adaptivity: {
    inputProfiles: ["pointer", "touch"],
    minWidth: 220,
    idealColumns: { compact: 1, medium: 2, expanded: 4 },
    onCompact: "stack",
  },
  examples: [ /* golden samples */ ],
  render: (props) => <StatCards {...props} />,
});
```

One definition drives:

| Output | Purpose |
|--------|---------|
| Runtime validation | Reject or repair malformed AI output |
| JSON Schema | Constrained decoding |
| System prompt | Generated vocabulary — never hand-maintained |
| Docs / catalog | Examples from the same source |
| Render mapping | `registry[type].render` |

## Generation flow

1. **Prompt** — registry generates allowed vocabulary for the target surface.
2. **Emit** — agent streams Lang or returns block JSON.
3. **Validate** — Zod schemas check and repair output.
4. **Render** — each node resolves through the registry.
5. **Persist** — ephemeral blocks stay in chat; durable ones become apps via `app_create`.

## Agent blocks in chat

Chat-specific blocks live in `src/components/agent-blocks/`. These are Tier 2 renderers optimized for the conversation thread — tool results, diffs, code previews, etc.

See [block registry](/reference/block-registry) for the full contract spec.
