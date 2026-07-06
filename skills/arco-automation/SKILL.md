---
name: Arco automations
description: How to create, update, and manage scheduled or event-triggered automations. Read when the user asks for cron jobs, recurring tasks, webhooks, or "every morning/at 9am" style requests.
gates: [create_automation, update_automation, delete_automation, run_automation]
source: seed
---

Automations are headless agent runs with **only their prompt as context** — no chat history.

## Creating automations

Use `create_automation` with:
- **name** — short label shown in the Automations app
- **prompt** — self-contained instruction; name apps, db namespaces, and files explicitly
- **schedule** — 5-field cron for time triggers (`0 9 * * *` = daily 9:00)
- **trigger** — optional override:
  - Schedule: `{ "type": "schedule", "schedule": "0 9 * * 1-5" }`
  - Event: `{ "type": "event", "source": "github", "on": "pull_request.opened", "filter": "{\"action\":\"opened\"}" }`
- **deliver_channel_id** + **deliver_chat_id** — optional; push the final reply to a messaging channel

Event automations expose webhook URL `/api/webhooks/automations/<id>` with header `X-Arco-Webhook-Signature: <secret>`.

## Headless policy

Automations run non-interactively. Tools that require user confirmation are **denied** unless the user has an explicit auto-allow rule in Settings → Agent permissions. Tell the user when an automation needs write tools they haven't pre-approved.

## Managing

- `list_automations` — inventory
- `update_automation` — change name, prompt, schedule/trigger, enabled
- `delete_automation` — remove
- `run_automation` — dispatch immediately

After changes, remind the user they can review runs in the Automations app detail view.
