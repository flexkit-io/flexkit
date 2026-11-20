# @flexkit/agent-protocol

## 0.3.16

### Patch Changes

- 6161931: The Flexkit Agent can create images. Ask for one in the chat, or choose **Create image** in the composer's **+** menu to make sure the next message produces one. The image chip in the composer picks the image model (GPT Image, Seedream or Nano Banana; GPT Image by default) and the aspect ratio. Each image shows in the chat with actions to download it, copy it, open it full size, edit it, try it again with another model, or save it to the project's assets.

  `@flexkit/agent-protocol` adds the `generated-image` data part, the `AGENT_IMAGE_MODELS` catalog and `agentImageRequestSchema` for the optional `imageGeneration` field of a chat message. Studios older than this release show a generated image as an unknown part.

  `flexkit chat` prints a link to each image the agent creates.

## 0.3.15

### Patch Changes

- 47b5c41: Editors and contributors can create their own personal automations, when the project allows it.

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

## 0.3.14

### Patch Changes

- bc13db5: Add the `run-search` and `read-run` data parts for agents that search and read past automation runs. Studio shows the runs found in a "Past runs" card linked to each run, with status lines while the agent searches or reads.

## 0.3.13

### Patch Changes

- e81a8fb: The Flexkit Agent can search and read your own past chats. Add the `chat-search` and `read-chat` data parts, and show the past chats the agent found as a card in the chat, each linking to its chat.

## 0.3.12

### Patch Changes

- 092471f: The chat agent can write skills: it proposes a new skill or a change to one, and the review card lets you edit the name, description and Markdown content, shows a line-by-line diff of what a change does, and saves the skill only when you approve.

## 0.3.11

### Patch Changes

- 8d99f93: Chat attachments and file parts can carry the file's SHA-256 (`sha256`) and, when a chat is read, the Knowledge document with the same content (`knowledgeSourceId`).

## 0.3.10

### Patch Changes

- e786744: Add the `knowledge-search` and `read-source` data parts, plus the `KnowledgeCitation` and `KnowledgeLocator` schemas, for the agent's new knowledge tools. The chat can list the sources an answer used and open each citation at its page, slide or heading.

## 0.3.9

### Patch Changes

- 8df13d7: Add the `plugin_connected` chat message kind and the `plugin-connected` data part for connecting plugins from the chat.

## 0.3.8

### Patch Changes

- 297e77f: Add the `export-records` data part and the `csv` and `json` artifact kinds for the agent's Export Records tool.

## 0.3.7

### Patch Changes

- acfe7ea: Add the `user-question` data part, the `AgentChatQuestion` types and the `question` Activity kind for the chat agent's Ask User Question tool.

## 0.3.6

### Patch Changes

- 1554896: Add the `job` and `poll` automation trigger types to `AutomationTriggerType`.

## 0.3.5

### Patch Changes

- 10afed4: Add `automationChange` (before/after settings) to automation approval previews, `replacesMonitor` to automation proposals, and `sourceType` to chat monitors.

## 0.3.4

### Patch Changes

- 42733f6: Add chat monitors: the `monitor-event` data part (also carried on `mid-turn-message` as `monitorEvent`), `AgentChatMessage.kind` with `AgentChatMessageKind`, `AgentChatMonitor` and `AgentMonitorStatus`, and the `monitor_event` Activity item kind.

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
