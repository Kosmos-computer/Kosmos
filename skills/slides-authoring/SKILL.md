---
name: Slides authoring
description: How to create and design full presentations with slides_create / slides_open / slides_write. REQUIRED before building decks from chat.
gates: [slides_create, slides_write]
source: seed
---

Build complete, viewable decks — never empty shells. Slides is `control: open_only` (iframe); author via tools, not the mouse.

## Tools

- `slides_create` — pass **name** + full **content** DeckDoc; opens Slides with that file.
- `slides_open` — read `{ id, name, deck }` (and show in UI).
- `slides_write` — replace the full deck after edits.
- `slides_export` — html / odp / pptx / pdf / json.

## DeckDoc schema (canvas 960×540)

```json
{
  "version": 1,
  "title": "Q3 Review",
  "width": 960,
  "height": 540,
  "slides": [
    {
      "id": "slide-1",
      "boxes": [
        {
          "id": "t1",
          "kind": "text",
          "x": 60,
          "y": 180,
          "w": 840,
          "h": 100,
          "color": "#ececee",
          "textAlign": "center",
          "content": "Quarterly Review"
        },
        {
          "id": "s1",
          "kind": "shape",
          "shape": "rect",
          "x": 60,
          "y": 300,
          "w": 840,
          "h": 8,
          "fill": "#6ea8fe",
          "stroke": "#3b6fd4",
          "strokeWidth": 0
        }
      ]
    }
  ]
}
```

### Box rules

| kind | Required | Notes |
|------|----------|-------|
| `text` | `x,y,w,h` + `content` | `content` may be a **plain string** or TipTap `{type:"doc",...}`. Set `color` (e.g. `#ececee`). |
| `shape` | `x,y,w,h` | `shape`: `rect` \| `ellipse` \| `triangle` \| `diamond` \| `line`. Set `fill` / `stroke`. |
| `image` | `x,y,w,h` + `content` | `content` = data-URL or https URL. |

**Always** include geometry (`x,y,w,h`). Missing positions make boxes invisible.

### Layout recipes

- **Title slide:** title `y:180 w:840 h:100` centered; subtitle `y:300 h:60`.
- **Section / bullets:** heading `y:48 h:72`; body `y:140 w:840 h:340`.
- **Two-column:** left `x:60 w:400`, right `x:500 w:400`.
- **Accent bar:** thin shape under the title (`h:6–10`, accent fill).

Keep margins ≥ 40px. Prefer 4–8 slides for a typical talk; one idea per slide.

## Workflow

1. `read_skill("slides-authoring")` (required once per session).
2. Draft the full DeckDoc (all slides) in one `slides_create` call.
3. If the user asks for changes: `slides_open` → edit JSON → `slides_write`.
4. Do **not** mouse-drive the Slides iframe; keep using these tools.

## Anti-patterns

- Calling `slides_create` with only a `name` (empty deck).
- Using legacy fields `type` / `text` instead of `kind` / `content`.
- Omitting `width`/`height` or box positions.
- Trying to design the deck by clicking inside the Slides window.
