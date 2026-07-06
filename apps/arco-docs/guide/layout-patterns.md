# Layout patterns

Patterns compose primitives into reusable layouts under `src/components/patterns/`.

## MasterDetail

List + detail split for notes, email, messages, and files:

```tsx
import { MasterDetail } from "@/components/patterns";

<MasterDetail
  list={<NoteList />}
  detail={<NoteEditor />}
/>
```

Styles use `.arco-master-detail__*` in `src/styles/ui.css`.

## Section

Settings rows and form groups:

```tsx
import { Section, FormRow, FormActions } from "@/components/patterns";

<Section title="Providers" description="Connect model backends.">
  <FormRow label="API key">
    <Input type="password" />
  </FormRow>
  <FormActions>
    <Button variant="primary">Save</Button>
  </FormActions>
</Section>
```

## When to create a new pattern

Add a pattern when:

1. The same layout appears on two or more workspaces.
2. The layout has distinct regions (toolbar, sidebar, main, context).
3. The structure is stable — workspaces plug content into slots.

Do **not** create a pattern for one-off screen layouts.

## Shell integration

Desktop layouts use `WindowFrame` and the OS chrome in `src/os/`. Mobile uses `MobileShell` at `max-width: 767px`. Patterns sit **inside** window content — they don't replace shell chrome.
