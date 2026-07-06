# Component tiers

Arco organizes UI into four tiers. Each tier has a distinct role in both human-authored and AI-generated interfaces.

## Tier 0 — Tokens

CSS custom properties (`--arco-*`). The foundation for all theming.

**Location:** `src/styles/tokens.css`

## Tier 1 — Primitives

Themeable atoms: Button, Input, Switch, Badge, Chip, EmptyState.

**Location:** `src/components/ui/`, styles in `src/styles/ui.css`

**Rule:** Primitives take React props and render BEM classes. They are never generated directly by AI — blocks compose them.

## Tier 2 — Blocks

Data-driven composites the AI assembles: StatCards, CalendarSchedule, MediaCards, tool result panels.

**Location:** `src/components/agent-blocks/` (chat), generated app components (via OpenUI), future registry

**Rule:** Blocks take **pure-data props** with Zod schema, prompt description, and adaptivity metadata.

## Tier 3 — Containers

Frames generated content lives in:

| Container | Role |
|-----------|------|
| AppShell slots | Sidebar, main, context panel |
| WindowFrame | Desktop window chrome |
| MobileShell | Phone stack navigation |
| AppSurface | Generated reactive app host |
| GeneratedSurface | Inline chat block host |

**Rule:** Containers handle layout and chrome; blocks fill content regions.

## CSS naming

```css
.arco-{block}__{element}--{modifier}
```

Examples: `.arco-btn--primary`, `.arco-master-detail__list`, `.arco-empty__title`

## Anti-patterns

- Hardcoded colors outside tokens
- Inline `style={{}}` for layout in new code
- Screen-specific one-off components that should be shared
- Parallel naming (`.lf-*`, `.docs-*`, `--os-*` in shell code)
