# Design tokens

Arco tokens live in `src/styles/tokens.css`. Every shell and Arco-styled surface should reference `--arco-*` variables — never hardcoded hex values in new code.

## Theme switching

```html
<html data-theme="dark">
<!-- or -->
<html data-theme="light">
```

Installed apps receive forwarded aliases as `--os-*` (mapped from `--arco-*` in `AppHost.tsx`).

## Categories

### Typography

| Token | Default use |
|-------|-------------|
| `--arco-font-ui` | Body and UI text |
| `--arco-font-mono` | Code, IDs, technical labels |
| `--arco-text-xs` … `--arco-text-xl` | Size scale |

### Spacing

| Token | Value |
|-------|-------|
| `--arco-space-2xs` | 2px |
| `--arco-space-xs` | 4px |
| `--arco-space-s` | 8px |
| `--arco-space-m` | 12px |
| `--arco-space-l` | 16px |
| `--arco-space-xl` | 24px |
| `--arco-space-2xl` | 32px |

### Radii

| Token | Use |
|-------|-----|
| `--arco-radius-s` | Chips, small controls |
| `--arco-radius-m` | Cards, inputs |
| `--arco-radius-l` | Modals, large panels |
| `--arco-radius-window` | Window chrome |

### Semantic colors (dark theme example)

| Token | Role |
|-------|------|
| `--arco-bg-desktop` | Desktop wallpaper area |
| `--arco-bg-surface` | Panel backgrounds |
| `--arco-bg-elevated` | Raised cards |
| `--arco-text-primary` | Primary text |
| `--arco-text-secondary` | Secondary text |
| `--arco-accent` | Primary accent |
| `--arco-success` / `--arco-warning` / `--arco-danger` | Status colors |
| `--arco-border` | Default borders |

### Motion & layers

| Token | Role |
|-------|------|
| `--arco-ease` | Default easing curve |
| `--arco-dur-fast` / `--arco-dur-med` | Transition durations |
| `--arco-z-windows` / `--arco-z-chrome` / `--arco-z-overlay` | Stacking order |

## Rules

1. Add missing semantics as new `--arco-*` tokens before using one-off values.
2. Do not introduce parallel `--os-*` or `.lf-*` naming in new shell code.
3. Forward tokens to installed apps; don't duplicate palettes per app.

See the [token catalog](/reference/tokens) for the full list.
