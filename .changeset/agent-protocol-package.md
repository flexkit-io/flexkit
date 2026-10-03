---
'@flexkit/agent-protocol': minor
'@flexkit/ai': patch
---

New `@flexkit/agent-protocol` package: the zod schemas for the `data-*` parts streamed by the Flexkit agent platform plus the run, approval and chat DTO types, shared by the platform and `@flexkit/ai`. `@flexkit/ai` now derives its replay part types from it, and handles the new `exec` approval kind (sandbox commands sent to review), the "always allow this tool for this automation" option on plugin approvals, and the context-compaction note in chats.
