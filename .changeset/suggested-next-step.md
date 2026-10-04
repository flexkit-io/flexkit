---
'@flexkit/ai': patch
'@flexkit/agent-protocol': patch
---

After an assistant reply in the agent chat, the platform may offer one follow-up instruction as a subtle chip under the latest message. Clicking it fills the composer without sending, so the user can edit or press Enter. The chip only appears when the platform is confident a specific next step exists, and it is carried by a new `suggested-prompt` data part in the agent protocol. Requires the matching platform API.
