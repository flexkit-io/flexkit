# @flexkit/agent-protocol

## 0.3.3

### Patch Changes

- 6d17b6c: Add the `automation` approval kind for automations the chat agent proposes (`AutomationProposalPreview`, `CreatedAutomationResult`), the `AutomationNotifyRule` and `AutomationVisibility` types, and the `automation_result` and `automation_failure` Activity item kinds.

## 0.3.2

### Patch Changes

- 615fdac: Add the Activity inbox types (`ActivityItem`, `ActivityItemsPage`, `ActivitySummary` and their kind, state and resolution unions) shared by Studio and the platform.

## 0.3.1

### Patch Changes

- 75b52d9: Add the `queued` and `steering` message statuses and the `AgentChatFollowUp` types for messages sent while a chat turn is running.

## 0.3.0

### Minor Changes

- bcfdbad: Schema change approvals. The Flexkit Agent can now propose schema changes on app-managed projects; approvals of `kind: 'schema'` carry a `preview.schema` summary and render a dedicated card listing the entities and attributes added, changed or removed, with breaking changes called out. After an approved schema deployment completes, the Studio refetches the project schema so the new entities appear without a reload.

## 0.2.0

### Minor Changes

- 903b988: New `@flexkit/agent-protocol` package: the zod schemas for the `data-*` parts streamed by the Flexkit agent platform plus the run, approval and chat DTO types, shared by the platform and `@flexkit/ai`. `@flexkit/ai` now derives its replay part types from it, and handles the new `exec` approval kind (sandbox commands sent to review), the "always allow this tool for this automation" option on plugin approvals, and the context-compaction note in chats.

### Patch Changes

- a906a56: After an assistant reply in the agent chat, the platform may offer one follow-up instruction as a subtle chip under the latest message. Clicking it fills the composer without sending, so the user can edit or press Enter. The chip only appears when the platform is confident a specific next step exists, and it is carried by a new `suggested-prompt` data part in the agent protocol. Requires the matching platform API.
