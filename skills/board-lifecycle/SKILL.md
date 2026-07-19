---
name: Board lifecycle
description: How to advance SDLC work items on the Board (os.board@1) as agent work progresses. Read when managing board columns, work items, or board_move.
gates: [board_move, board_create, board_update]
source: seed
---

The Board tracks **jobs** (work items). Studio conversations are **runs** linked to a job. You move the **card**, not the chat id.

## Columns

| Column | Meaning |
|---|---|
| `backlog` | Captured, not ready to start |
| `ready` | Groomed; can be started |
| `in_progress` | Active human or agent work |
| `review` | Needs human check / PR open |
| `done` | Accepted or merged |

## Tools

- `board_list` / `board_get` — inspect cards
- `board_move(id, columnId)` — advance lifecycle (no confirm pause)
- `board_create` / `board_update` / `board_delete` — structural edits (confirm)

When this session is bound to a work item, the system prompt includes its id. Prefer that id over guessing.

## When to move

- **→ in_progress** — you start substantive work (edits, investigation that will change the repo, implementing the brief)
- **→ review** — you opened a PR, finished the requested change and need human review, or explicitly hand off for check
- **→ done** — only when the user confirms acceptance, or merge/acceptance is verified
- **Do not** move to `done` just because a turn completed, tests passed locally, or you said “done” in chat
- **Do not** thrash columns every tool call — one move per real lifecycle change

## Run state vs column

Waiting on approval or a tool confirm keeps the card in `in_progress` (the UI shows a blocked badge). Column stays put until the job’s meaning changes.
