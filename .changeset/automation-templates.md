---
'@flexkit/studio': patch
'@flexkit/agent-protocol': patch
---

Add templates: ready-made automations and skills to start from. A new Templates tab next to Plugins and Skills lists them, showing first the ones whose plugins are already connected. Each template's page explains what it does and what it needs, and shows an example of its output. Use template opens a chat in which the Flexkit Agent sets it up for your project: it finds the matching fields in your schema, connects any missing plugins, asks for a few settings, and creates the automation paused so you can try it first. Automations and skills made from a template show which one they came from. When a project has no automations yet, the Automations page suggests templates. The tab only appears on platforms that support templates.

`AutomationProposalPreview` has a new optional `enabled` field. When it is `false`, the review card says the automation starts paused.
