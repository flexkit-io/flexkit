---
'@flexkit/cli': patch
---

Add commands for project administration, each with help, examples and a docs page:

- `flexkit tokens`: create, list and revoke project API tokens.
- `flexkit members`: list members and invitations, invite, change roles, remove.
- `flexkit webhooks` and `flexkit cors`: manage webhooks and the browser origins allowed to call the API.
- `flexkit logs`: API, webhook and AI request logs, with `--since` and `--follow`.
- `flexkit memory`: read, replace or clear what the agent remembers about you.
- `flexkit project pause` and `flexkit project unpause`.

API tokens can now read and add knowledge, read approvals, and list plugins. Managing tokens and members, pausing, deciding approvals and personal data (chats, activity, agent memory) still need `flexkit login`.
