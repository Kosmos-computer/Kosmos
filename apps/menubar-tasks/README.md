# Arco Menu Bar Tasks

A lightweight macOS menu bar app for quick task capture. Tasks sync to the Arco OS server (`os.tasks@1`), so the Arco agent and Tasks app see the same list.

## Requirements

- macOS 13+
- Swift 5.9+
- Arco server running (default `http://127.0.0.1:4600`)

## Build & run

```bash
cd apps/menubar-tasks
bash scripts/build-app.sh
open ArcoMenubarTasks.app
```

Or from the repo root:

```bash
npm run menubar-tasks:auth   # once — mints a session token
npm run menubar-tasks        # build + open the .app bundle
```

## Usage

- Click the **checklist** icon in the menu bar
- Type a task and press **Return** or **Add**
- Check a task to mark it complete
- Trash icon deletes permanently
- **Server** field points at your Arco API base URL (saved in UserDefaults)
- **Open Arco** opens the server URL in your browser

Auth uses a bearer session token stored at `~/Library/Application Support/ArcoMenubarTasks/session-token` (minted by `npm run menubar-tasks:auth`).

## Agent access

Once the Arco server is running, the agent can use:

- `tasks_list` — list open tasks
- `tasks_create` — add a task
- `tasks_update` / `tasks_complete` / `tasks_archive` / `tasks_delete`

Tasks added from the menu bar appear immediately in the Arco Tasks app and vice versa.
