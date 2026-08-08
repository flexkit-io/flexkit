---
'@flexkit/ai': patch
---

Rename `@flexkit/automations` to `@flexkit/ai` and add Skills.

- The plugin is now exported as `AI()` from `@flexkit/ai` and mounts at the `ai` app route (`/ai/automations`, `/ai/runs`, `/ai/approvals`).
- New Skills section (`/ai/skills`): create reusable Markdown skills with project, space, or personal visibility.
- Skills can be attached to an automation from the Tools section of the automation form; attached skills are always loaded into the agent context. All other visible skills stay discoverable by the agent at runtime, which loads them on demand when they match the task.
