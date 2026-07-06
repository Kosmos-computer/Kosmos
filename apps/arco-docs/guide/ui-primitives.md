# UI primitives

Arco primitives are small, reusable controls under `src/components/ui/`. Each wraps existing BEM classes from `src/styles/ui.css`.

## Available components

| Component | CSS base | Use for |
|-----------|----------|---------|
| `Button` | `.arco-btn` | Actions, toolbar buttons |
| `Input` | `.arco-input` | Text fields, search |
| `Switch` | `.arco-switch` | Boolean toggles |
| `Badge` | `.arco-chip` variant | Status labels |
| `Chip` | `.arco-chip` | Tags, filters |
| `EmptyState` | `.arco-empty` | Loading, empty, error states |

## Button variants

```tsx
import { Button } from "@/components/ui";

<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Dismiss</Button>
<Button size="sm">Compact</Button>
```

## Empty states

Use `EmptyState` for every list, panel, or workspace that can be empty, loading, or disabled:

```tsx
<EmptyState
  title="No messages"
  description="Start a conversation with the agent."
  action={<Button variant="primary">New chat</Button>}
/>
```

## Conventions

- If a control appears on **two or more screens**, it belongs in `ui/` — not inline in an app.
- Use Lucide icons (`lucide-react`) for iconography; match manifest kebab names.
- Prefer BEM classes + tokens over inline `style={{}}`.

## CSS-only usage

You can use primitives without React where needed:

```html
<button class="arco-btn arco-btn--primary">Save</button>
<input class="arco-input" type="text" />
```

See [component tiers](/reference/component-tiers) for how primitives fit into the four-tier model.
