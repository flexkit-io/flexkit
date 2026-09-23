---
'@flexkit/ai': patch
'@flexkit/studio': patch
---

Add the Plugins Marketplace with catalog and detail pages, OAuth connection management, automatic access to all connected, permitted plugin tools in chat, and explicit tool selection for automations. Trusted chat read tools run without confirmation; other plugin calls follow the approval policy. Support plugin tool approvals and read-only plugin skills that can be copied into editable Studio skills. Requires the matching platform plugins API and database migrations.

Export the shared Alert components from `@flexkit/studio/ui` for marketplace status and permission messages.
