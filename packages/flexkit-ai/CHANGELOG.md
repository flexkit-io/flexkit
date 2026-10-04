# @flexkit/ai

## 0.0.8

### Patch Changes

- 903b988: New `@flexkit/agent-protocol` package: the zod schemas for the `data-*` parts streamed by the Flexkit agent platform plus the run, approval and chat DTO types, shared by the platform and `@flexkit/ai`. `@flexkit/ai` now derives its replay part types from it, and handles the new `exec` approval kind (sandbox commands sent to review), the "always allow this tool for this automation" option on plugin approvals, and the context-compaction note in chats.
- a906a56: The pending-approvals badge in the sidebar now updates as soon as a run pauses for approval, a run ends, an approval is decided, or the inbox loads, instead of waiting for its 30-second poll or a page change.
- c01435a: Add plugins to an automation from a searchable "+ Plugin tools" menu instead of listing every plugin. Each added plugin is one compact row with its account, tools, status, and a remove button. Plugins and Slack or Microsoft Teams delivery can be connected in place through the sign-in popup, so unsaved automation changes are kept. Delivery rows now sit under Memories, show "Not connected" inline, and report a loading failure instead of spinning indefinitely.

  Export the `Popover` components from `@flexkit/studio/ui`.

- 903b988: Chat and automation runs now show one calm status line while the agent works instead of stacked cards. The line reflects the model's own reasoning as it streams, names in-flight tool and plugin calls ("Searching schema", "Calling gmail: search threads", "Awaiting approval"), keeps a fixed slot for the whole turn so the conversation never jumps, fades while the response streams, and disappears once the turn completes. Reasoning cards, "Plugin call · Auto-approved by Jev" cards, and generic tool cards are no longer rendered; failed calls still show a compact error line, and pending or human-decided approvals keep their cards. Requires the matching platform API for live plugin-call labels.
- a906a56: The chat composer no longer reserves an empty strip above the text field when nothing is attached; the attachments header is mounted only while files are attached.
- a906a56: The chat composer and the automation form now offer a reasoning-effort selector next to the model selector, showing exactly the efforts the chosen model supports, and a new "Auto" model that lets the platform pick the model and effort per message or run. New chats and automations default to Auto; existing ones keep their stored model. Model ids are stored as `<gatewayModelId>:<effort>` or `auto`; the last chosen model and effort are remembered separately in local storage. Requires the matching platform API; against an older API the model list still renders and sends.
- c01435a: Connect several accounts per plugin. The plugin page lists connected accounts, grouped into project and personal accounts, with one Primary account per group. Each account can be made primary, renamed, reconnected, or disconnected, and "Connect another account" adds more. Agents use the primary account unless the user asks for another. Reconnecting an account that is then signed into with a different provider account fails with a clear message instead of replacing it.

  Automations can follow the primary account or pin a specific one, including the Slack or Microsoft Teams workspace used for delivery. Approval requests name the account and say whether it is the user's own or the project's. Requires the matching platform plugins API and database migration.

- c01435a: Plugins added to an automation offer all of their tools by default, including tools the provider adds later. Specific tools can still be chosen by unchecking "All tools". With "Require approval", plugin calls are screened by Jev against the automation instructions: clear, low-risk calls run immediately and appear in the run history as auto-approved, while other calls pause the run for review. A warning is shown when "Auto-approve" is used with plugin tools. Requires the matching platform API and database migration.
- c01435a: Make the automation Skills and Custom tools "Attach" menus searchable. The list filters by name as you type and stays open while you attach or detach several items. Code skills keep their badge, and skills from spaces you cannot use remain listed as locked.
- a906a56: After an assistant reply in the agent chat, the platform may offer one follow-up instruction as a subtle chip under the latest message. Clicking it fills the composer without sending, so the user can edit or press Enter. The chip only appears when the platform is confident a specific next step exists, and it is carried by a new `suggested-prompt` data part in the agent protocol. Requires the matching platform API.
- Updated dependencies [903b988]
- Updated dependencies [c01435a]
- Updated dependencies [a906a56]
  - @flexkit/agent-protocol@0.2.0
  - @flexkit/studio@0.0.36

## 0.0.7

### Patch Changes

- d0be938: Use Jev to assess Chat GraphQL mutations and plugin actions, automatically approving clear, low-risk requests and asking the user only when review is needed. Charge Jev evaluations to the team and show them in project Usage. Keep Chat responses aligned with the actual approval decision.

  Make approval requests easier to understand: show the action and connected account in plain language, keep technical details collapsed, and let users reject without entering a reason. Automation approval flows retain their existing behavior. Left-align shared dialog titles and descriptions.

- 602aa27: Add the Plugins Marketplace with catalog and detail pages, OAuth connection management, automatic access to all connected, permitted plugin tools in chat, and explicit tool selection for automations. Trusted chat read tools run without confirmation; other plugin calls follow the approval policy. Support plugin tool approvals and read-only plugin skills that can be copied into editable Studio skills. Requires the matching platform plugins API and database migrations.

  Export the shared Alert components from `@flexkit/studio/ui` for marketplace status and permission messages.

- Updated dependencies [a24e18f]
- Updated dependencies [d0be938]
- Updated dependencies [05bec33]
- Updated dependencies [602aa27]
- Updated dependencies [2581ddd]
  - @flexkit/studio@0.0.35

## 0.0.6

### Patch Changes

- bb111a6: Add file attachments to the agent chat prompt.
  - `@flexkit/ai`: the chat composer gets a "+" menu with "Add photos or files". Images (PNG, JPEG, GIF, WebP), PDFs and text-like files (TXT, MD, CSV, TSV, JSON, NDJSON, XML, YAML, HTML, CSS, JS/TS, Python, SQL, GraphQL, logs) up to 20 MB are uploaded straight to the platform file store and sent to the agent with the message. Images render as thumbnails with a fullscreen preview, other files as chips showing name and type. New `uploadAgentChatAttachment` API method, `attachments` on `sendAgentChatMessage`, and `AgentChatAttachment` type.
  - `@flexkit/studio`: `PromptInput` `accept` now honours `.ext` patterns like the native attribute; `PromptInputActionAddAttachments` closes the menu on select; `PromptInputActionMenuContent` no longer refocuses the trigger on close, so its tooltip does not pop up after picking an action.

- 5774b96: Rename the Studio composition API to extensions and update all official extension factories, examples, and package documentation.

  This is a breaking API change: use `extensions` for project and nested configuration, replace the former composition type with `StudioExtension`, and supply a machine-readable `id` and required `contributes` object. The optional `name` is a display label. Export `StudioContributions` and the new `defineExtension` helper without compatibility aliases.

  Add the `@flexkit/ai` README with installation, configuration, and an overview of AI workflows, custom tools, and skills.

- Updated dependencies [bb111a6]
- Updated dependencies [5774b96]
  - @flexkit/studio@0.0.34

## 0.0.5

### Patch Changes

- c270a6d: Show submitted chat messages immediately with a sending indicator and restore the prompt if sending fails. Unify live reasoning under the Thinking indicator and hide reasoning cards from chat history while preserving stored reasoning for debugging.
- b6d930b: Patch security dependencies across the workspace.
  - Pin `svgo` to 4.1.0 (GHSA-2p49-hgcm-8545, GHSA-w27v-7q3p-w38r)
  - Pin `brace-expansion` to 1.1.18 and 5.0.9 (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895)
  - Pin `seroval` to >=1.5.6 (GHSA-mv8w-475r-vwqw)
  - Upgrade Next.js to 16.3.5 (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4)
  - Upgrade Astro to 7.3.2
  - Upgrade Vitest to 3.2.6 (GHSA-5xrq-8626-4rwp)

- Updated dependencies [9bbe14b]
- Updated dependencies [9bbe14b]
- Updated dependencies [9bbe14b]
- Updated dependencies [118ce38]
- Updated dependencies [b6d930b]
  - @flexkit/studio@0.0.33

## 0.0.4

### Patch Changes

- e598bc6: Move isPrimary from attributes to an optional entity-level display field that names the attribute shown in relationship previews.
- 59ccc03: Let automations attach specific custom tools from the project catalog, instead of exposing every registered tool on every run.
- 59ccc03: Add `@flexkit/studio/tools` so customer apps can register HMAC-signed custom tools. Production invoke uses the shared signing secret. After a rotate, Flexkit sends `Flexkit-Signature` (current) and `Flexkit-Signature-Previous` (previous) so either `FLEXKIT_TOOLS_SECRET` or optional `FLEXKIT_TOOLS_SECRET_PREVIOUS` still verifies. Localhost Studio (owner/developer) can run custom tools from Agent Chat and Run now; production Studio, schedules, webhooks, and entity triggers always call the production URL.
- 0b115f8: Chat dictation, rolling thinking states"
- fc6ebb0: Add badge notification for skipped automation runs due to loop protection
- 5659fa3: Version-controlled skills. Skills can now be added via code
- 5659fa3: Replace the skills content textarea with a CodeMirror 6 Markdown source editor that fills the viewport.
- Updated dependencies [e598bc6]
- Updated dependencies [d1ebaf9]
- Updated dependencies [36bf20f]
- Updated dependencies [59ccc03]
- Updated dependencies [53b79be]
- Updated dependencies [8223254]
- Updated dependencies [8976298]
- Updated dependencies [53b79be]
- Updated dependencies [0b115f8]
- Updated dependencies [5659fa3]
- Updated dependencies [1877cec]
- Updated dependencies [261f06a]
  - @flexkit/studio@0.0.32

## 0.0.3

### Patch Changes

- 85ef07c: Minor style adjustments and fixes
- Updated dependencies [85ef07c]
  - @flexkit/studio@0.0.31

## 0.0.2

### Patch Changes

- 306e794: Agent chat
- Updated dependencies [306e794]
  - @flexkit/studio@0.0.30

## 0.0.1

### Patch Changes

- 7377201: Rename `@flexkit/automations` to `@flexkit/ai` and add Skills.
  - The extension is now exported as `AI()` from `@flexkit/ai` and mounts at the `ai` app route (`/ai/automations`, `/ai/runs`, `/ai/approvals`).
  - New Skills section (`/ai/skills`): create reusable Markdown skills with project, space, or personal visibility.
  - Skills can be attached to an automation from the Tools section of the automation form; attached skills are always loaded into the agent context. All other visible skills stay discoverable by the agent at runtime, which loads them on demand when they match the task.

- 68e0fec: Spaces authorization layer: declare spaces in flexkit.config.tsx and bind them to entities and attributes to scope visibility and editability. The CLI includes space definitions in the deploy payload, the Studio exposes the user's space memberships and filters space-bound entities/attributes from the Desk sidebar, grids and forms, and Automations gain a visibility picker (Project / Space / Personal) with space badges in the list.
- ca6fb4b: New approvals section for approving mutations (HITL)
- Updated dependencies [1c89ae9]
- Updated dependencies [68e0fec]
- Updated dependencies [ca6fb4b]
  - @flexkit/studio@0.0.29
