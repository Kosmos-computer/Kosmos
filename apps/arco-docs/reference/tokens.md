# Token catalog

Canonical source: `src/styles/tokens.css` in the Arco-Prototype-2 repo.

## Naming convention

```
--arco-{category}-{name}
```

Examples: `--arco-bg-surface`, `--arco-text-primary`, `--arco-space-l`

## Structural tokens (theme-independent)

| Category | Tokens |
|----------|--------|
| Typography | `--arco-font-ui`, `--arco-font-mono`, `--arco-text-xs` … `--arco-text-xl` |
| Spacing | `--arco-space-2xs` … `--arco-space-2xl` |
| Radii | `--arco-radius-s`, `--arco-radius-m`, `--arco-radius-l`, `--arco-radius-window` |
| Motion | `--arco-ease`, `--arco-dur-fast`, `--arco-dur-med`, `--arco-dur-xfade` |
| Z-index | `--arco-z-windows`, `--arco-z-chrome`, `--arco-z-overlay` |

## Semantic tokens (theme-dependent)

Set in `html[data-theme="dark"]` and `html[data-theme="light"]` blocks.

| Category | Tokens |
|----------|--------|
| Backgrounds | `--arco-bg-desktop`, `--arco-bg-surface`, `--arco-bg-surface-solid`, `--arco-bg-sunk`, `--arco-bg-elevated`, `--arco-bg-hover`, `--arco-bg-active`, `--arco-bg-chrome` |
| Text | `--arco-text-primary`, `--arco-text-secondary`, `--arco-text-tertiary`, `--arco-text-dim`, `--arco-text-disabled`, `--arco-text-inverted` |
| Accent | `--arco-accent`, `--arco-accent-strong`, `--arco-accent-soft` |
| Status | `--arco-success`, `--arco-warning`, `--arco-danger`, `--arco-danger-soft` |
| Borders | `--arco-border`, `--arco-border-strong` |
| Shadows | `--arco-shadow-sm`, `--arco-shadow-md`, `--arco-shadow-lg` |

## App forwarding

Installed apps receive `--os-*` aliases mapped from `--arco-*` in `AppHost.tsx`. Apps should use `--os-*` inside their sandbox; shell code uses `--arco-*`.

## Future: DTCG export

The [standards map](/reference/standards-map) plans a Design Tokens Community Group (`$type`/`$value`) file as the canonical portable source, with CSS vars as a build output.
