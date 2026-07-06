# Block registry

> Status: **planned** — the highest-leverage Arco milestone.

The block registry replaces implicit type unions and giant render switches with one manifest per block.

## defineBlock() contract

Each block exports:

| Field | Purpose |
|-------|---------|
| `type` | Stable string identifier |
| `schema` | Zod schema → runtime validation + JSON Schema |
| `description` | Prompt text for the AI |
| `adaptivity` | Size classes, input profiles, reflow rules |
| `examples` | Golden samples for prompts, docs, and tests |
| `render` | `(props) => ReactNode` mapping |

## Contract outputs (from one definition)

1. **Runtime validation** — reject or repair malformed output before render
2. **JSON Schema / grammar** — constrained decoding and tool arguments
3. **System prompt** — generated vocabulary, never hand-maintained
4. **Design catalog** — Storybook-style docs from examples
5. **Render mapping** — `registry[type].render`

## Two renderers, one registry

| Path | Input | Use case |
|------|-------|----------|
| Streaming | OpenUI Lang / A2UI | Chat inline blocks |
| Static | Block JSON | Durable apps, dashboards |

Both resolve through `registry[type].render`.

## Adaptivity descriptor

Blocks declare how they reflow across window size classes:

```ts
adaptivity: {
  inputProfiles: ["pointer", "touch"],
  minWidth: 220,
  idealColumns: { compact: 1, medium: 2, expanded: 4 },
  onCompact: "stack",
}
```

Size classes use CSS container queries — **Compact / Medium / Expanded** — not device types.

## Roadmap phase

This is the **Now** phase in the Arco spec:

- Registry + Zod for existing blocks
- Generated system prompt from registry
- Runtime validation + repair
- OpenUI spike: two block types end-to-end
- Design System workspace as living catalog

See the [Arco spec overview](http://localhost:5174/spec.html) for the full roadmap.
