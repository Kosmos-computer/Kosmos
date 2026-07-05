# Agent Cursor — the AI's virtual mouse

The agent can see the desktop and drive it with a visible, smoothly animated
cursor: it snapshots the interactive elements on screen, moves a Figma-style
labeled pointer to a target, and clicks or types with real DOM events. The
user's own mouse is untouched — the agent cursor is a second, clearly-marked
presence on the desktop.

Try it: *"Build me a todo app, then show me how to use it."* The agent creates
the app, snapshots the screen, moves its cursor to the input, types a todo
character-by-character, and clicks Add.

## How it works

```
LLM calls mouse_click ──▶ tool emits cursor_request over SSE, parks a promise
                              │  (server/agent/clientRequests.ts, 20s timeout)
                              ▼
        shell receives event (src/os/osActions.ts)
                              │
                              ▼
        uiDriver resolves the element id → live rect,
        cursorStore animates the overlay cursor there,
        dispatches pointerdown/mousedown/…/click
                              │
                              ▼
        POST /api/client-requests/:id with the outcome + fresh snapshot
                              │
                              ▼
        promise resolves ──▶ tool returns to the LLM, loop continues
```

This is the exec-confirmation pattern (`confirmations.ts`) generalized: any
tool that needs the browser to do work emits an event and parks on
`requestClientAction()`. The mouse is the first consumer; future client-side
tools (screenshots, drag, scroll) reuse the same round trip.

### Seeing: `ui_snapshot`

`src/os/cursor/uiSnapshot.ts` walks the DOM for interactive elements
(buttons, links, inputs, ARIA roles), grouped by window (`.arco-window`
sections) plus shell chrome (dock, menu bar). Each element is stamped with a
stable `data-arco-cid` id and reported with role, accessible label, center
coordinates, disabled state, and current value. No vision model needed —
any configured LLM can target elements from the text listing.

Element ids are the addressing scheme: the driver re-resolves the id to a
live rect at click time, so a click still lands if the window moved between
snapshot and action.

### Moving: `cursorStore` + `AgentCursor`

`src/os/cursor/cursorStore.ts` owns position and the movement animator:
duration proportional to distance (~220–850ms), ease-in-out sampling along a
quadratic bezier that bows slightly off the straight line, then a few px of
overshoot and a 90ms settle — reads as hand-driven, not tweened.
`AgentCursor.tsx` is the pure-presentation overlay (labeled pointer, press
scale, click ripple) mounted in `Desktop.tsx`; `pointer-events: none`
throughout. The cursor fades out 4s after the last command. Styling lives in
`src/styles/cursor.css` on design tokens.

`moveTo` resolves only when the animation lands, so the agent's pacing is
naturally human-speed — it cannot click faster than the cursor travels.

### Acting: `uiDriver`

`src/os/cursor/uiDriver.ts` executes commands. Clicks dispatch a full
bubbling `pointerdown → mousedown → pointerup → mouseup → click` sequence;
React ≥17 listens at the root, so all app handlers fire, including
`WindowFrame`'s focus-on-pointerdown (clicking a background window raises
it). Before clicking it checks `elementFromPoint` — if another window covers
the target, the agent is told what's on top instead of silently mis-clicking.
Typing uses the native value setter (to defeat React's controlled-input
cache) and fires `input` per character; `submit: true` presses Enter and
requests form submission.

Successful click/type results include a fresh snapshot, so the agent sees
the consequence of its action without a second round trip.

### Tool surface (`server/agent/tools.ts`)

| Tool | Purpose |
| --- | --- |
| `ui_snapshot` | List windows + interactive elements with ids |
| `mouse_click` | Animate to an element (by id, or x/y escape hatch) and click |
| `type_text` | Click into an input and type, optionally submit |

Snapshots are compacted server-side to terse lines
(`e12 button "Save" @420,310`) to respect the 6k-char tool-result budget.
Headless automation runs get an immediate "no user attached" error, same as
risky exec commands.

## Dev console handle

In dev builds the driver is exposed for manual testing without an agent turn:

```js
await window.__arcoCursor.execute({ kind: "snapshot" })
await window.__arcoCursor.execute({ kind: "click", targetId: "e3" })
await window.__arcoCursor.execute({ kind: "type", targetId: "e7", text: "hello", submit: true })
```

## Known limitations / left to do

- **Iframes are opaque.** `WebAppSurface` embeds are cross-origin; the DOM
  walk can't see inside and synthetic events can't reach them. Snapshots
  report these as `notReachable`. Reaching in would need a postMessage
  bridge injected into same-origin embeds.
- **Monaco / xterm.** Clickable but not typeable via DOM events — typing
  there needs their component APIs. Reported as opaque regions for now.
- **No drag, hover, right-click, double-click, or scroll commands.** The
  command union (`CursorCommand`) and driver switch are built to extend;
  drag would reuse the same move animation between pointerdown and pointerup.
- **Select elements.** Native `<select>` dropdowns can't be opened
  synthetically; a `select_option` command setting the value directly (same
  native-setter trick) is the pragmatic fix.
- **Occlusion is checked only at the click point.** A partially covered
  target whose center is visible still clicks fine; one whose center is
  covered errors even if an edge is visible.
- **One attached client assumed.** If several tabs watch the same stream,
  the first to POST the result wins. Fine for a prototype.
- **Mobile shell.** The cursor is desktop-only (`Desktop.tsx`); `MobileShell`
  has no overlay and cursor tools will time out there.
- **No permission gate.** The agent can click anything a user can, including
  destructive in-app buttons. If that becomes a concern, reuse the
  confirmation gate for clicks on flagged targets.
- **Snapshot cost.** Occlusion/visibility checks run `getComputedStyle` per
  candidate; busy desktops with hundreds of targets may want memoization or
  an element cap.
