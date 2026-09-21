---
'@flexkit/ai': patch
'@flexkit/studio': patch
---

Add file attachments to the agent chat prompt.

- `@flexkit/ai`: the chat composer gets a "+" menu with "Add photos or files". Images (PNG, JPEG, GIF, WebP), PDFs and text-like files (TXT, MD, CSV, TSV, JSON, NDJSON, XML, YAML, HTML, CSS, JS/TS, Python, SQL, GraphQL, logs) up to 20 MB are uploaded straight to the platform file store and sent to the agent with the message. Images render as thumbnails with a fullscreen preview, other files as chips showing name and type. New `uploadAgentChatAttachment` API method, `attachments` on `sendAgentChatMessage`, and `AgentChatAttachment` type.
- `@flexkit/studio`: `PromptInput` `accept` now honours `.ext` patterns like the native attribute; `PromptInputActionAddAttachments` closes the menu on select; `PromptInputActionMenuContent` no longer refocuses the trigger on close, so its tooltip does not pop up after picking an action.
