# Code app authoring (Studio projects)

You build **real folder apps** (React/Vite, FastAPI, etc.) on the builtin agent — not OpenUI, and not Cursor/Claude/Codex.

## Workflow (in order)

1. `list_templates` — see curated starters.
2. `create_project({ name })` — creates a directory, registers it as the active Studio project, binds the session.
3. `scaffold_template({ template: "vite-react" | "python-fastapi" })` — copies a working starter into the project.
4. `exec` — install deps and start the dev server (commands from the scaffold result).
5. Verify the URL responds (curl via `exec` or wait for register smoke).
6. `register_webapp({ name, url, command?, projectPath? })` — docks the app and opens it.
7. Use `studio_ui` (`open_tab` / `navigate_to_file` / `show_browser`) so the user sees Browser/Files.

## Rules

- NEVER call `app_create` / `app_update` in code mode.
- Prefer templates over inventing a broken Vite config from scratch.
- Keep changes minimal and consistent with the project style.
- Success = healthy URL + dock entry, not "files written".
- Refine edits stay in the same `projectPath` via `write_file` / `exec`.

## Templates

- **vite-react** — Vite + React + TypeScript; `npm install` then `npm run dev` (port in scaffold notes).
- **python-fastapi** — FastAPI + uvicorn; create venv, `pip install -r requirements.txt`, run uvicorn.
