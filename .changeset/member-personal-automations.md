---
'@flexkit/studio': patch
'@flexkit/agent-protocol': patch
'@flexkit/cli': patch
---

Editors and contributors can create their own personal automations, when the project allows it.

**Studio**

- Editors and contributors get the New Automation button when the project allows it.
- Their automation form is personal-only: visibility is fixed to Personal, and webhook triggers, Slack and Teams delivery, custom tools, the project's shared plugin connections, "any automation" and schema deployment job triggers, and Auto-approve are not offered. A short line says why. A job trigger that follows an automation they can no longer see keeps it and says so. Plugin tools use their own connections, and only read-only tools run.
- When an owner or developer makes an existing project or space automation personal, Studio asks first: only they will see and manage it, its subscribers are removed, and it runs with their own role and spaces. Only the person who created an automation can make it personal; for anyone else the Personal option is disabled and says so.
- When the server refuses to save, run or delete an automation, Studio shows its explanation instead of "Request failed".
- An automation the platform switched off says why in the list and on its page: switched off by an owner, the creator's role no longer allows it, the credit limit was reached, or loop protection.
- Activity shows automation notices (for example, an owner switched off one of your automations) with a neutral "Notice" label and a link to the automation, and the notification settings can mute them.
- New `canCreatePersonalAutomations` field in the `Capabilities` returned by `useCapabilities` and `resolveCapabilities`.

With an older backend that does not report the new capability, the Automations screens and the form behave exactly as before.

**Agent protocol**

- `ActivityItemKind` gains `automation_notice`.

**CLI**

- `flexkit activity` labels automation notices as "automation notice" and suggests `automations inspect <id>` for them.
