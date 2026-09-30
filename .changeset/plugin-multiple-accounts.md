---
'@flexkit/ai': patch
---

Connect several accounts per plugin. The plugin page lists connected accounts, grouped into project and personal accounts, with one Primary account per group. Each account can be made primary, renamed, reconnected, or disconnected, and "Connect another account" adds more. Agents use the primary account unless the user asks for another. Reconnecting an account that is then signed into with a different provider account fails with a clear message instead of replacing it.

Automations can follow the primary account or pin a specific one, including the Slack or Microsoft Teams workspace used for delivery. Approval requests name the account and say whether it is the user's own or the project's. Requires the matching platform plugins API and database migration.
