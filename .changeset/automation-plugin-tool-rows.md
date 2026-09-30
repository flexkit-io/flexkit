---
'@flexkit/ai': patch
'@flexkit/studio': patch
---

Add plugins to an automation from a searchable "+ Plugin tools" menu instead of listing every plugin. Each added plugin is one compact row with its account, tools, status, and a remove button. Plugins and Slack or Microsoft Teams delivery can be connected in place through the sign-in popup, so unsaved automation changes are kept. Delivery rows now sit under Memories, show "Not connected" inline, and report a loading failure instead of spinning indefinitely.

Export the `Popover` components from `@flexkit/studio/ui`.
