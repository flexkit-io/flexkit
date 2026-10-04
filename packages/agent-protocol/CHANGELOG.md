# @flexkit/agent-protocol

## 0.2.0

### Minor Changes

- 903b988: New `@flexkit/agent-protocol` package: the zod schemas for the `data-*` parts streamed by the Flexkit agent platform plus the run, approval and chat DTO types, shared by the platform and `@flexkit/ai`. `@flexkit/ai` now derives its replay part types from it, and handles the new `exec` approval kind (sandbox commands sent to review), the "always allow this tool for this automation" option on plugin approvals, and the context-compaction note in chats.

### Patch Changes

- a906a56: After an assistant reply in the agent chat, the platform may offer one follow-up instruction as a subtle chip under the latest message. Clicking it fills the composer without sending, so the user can edit or press Enter. The chip only appears when the platform is confident a specific next step exists, and it is carried by a new `suggested-prompt` data part in the agent protocol. Requires the matching platform API.
